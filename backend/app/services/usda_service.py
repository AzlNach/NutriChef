# USDA FoodData Central API Service
import requests
import os
import logging
from typing import Dict, List, Optional
import time

class USDAService:
    def __init__(self):
        """Initialize USDA FoodData Central API client"""
        self.api_key = os.getenv('USDA_API_KEY')
        if not self.api_key:
            print("Warning: USDA_API_KEY not found in environment variables. Using DEMO_KEY")
            self.api_key = 'DEMO_KEY'  # Use demo key as fallback
        
        self.base_url = os.getenv('USDA_BASE_URL', 'https://api.nal.usda.gov/fdc/v1')
        self.session = requests.Session()
        
        # Nutrient IDs we're interested in
        self.nutrient_ids = {
            208: "Energy",              # Calories
            203: "Protein",             # Protein
            204: "Total lipid (fat)",   # Fat
            205: "Carbohydrate, by difference",  # Carbs
            269: "Sugars, total including NLEA", # Sugar
            291: "Fiber, total dietary", # Fiber
            307: "Sodium, Na",          # Sodium
            301: "Calcium, Ca",         # Calcium
            303: "Iron, Fe"             # Iron
        }
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 0.1  # 100ms between requests
        
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        self.last_request_time = time.time()
    
    def search_food(self, query: str, page_size: int = 25) -> Optional[Dict]:
        """
        Search for food items in USDA database
        
        Args:
            query: Food name to search for
            page_size: Number of results to return
            
        Returns:
            Dictionary containing search results
        """
        try:
            self._rate_limit()
            
            # Clean query string for better matching
            cleaned_query = query.strip().lower()
            
            # Try multiple search variations
            search_queries = [
                cleaned_query,
                cleaned_query.replace(' ', '+'),
                cleaned_query.split()[0] if ' ' in cleaned_query else cleaned_query  # First word only
            ]
            
            for search_query in search_queries:
                logging.info(f"Trying USDA search with query: '{search_query}'")
                
                # Improved parameters for better USDA API results
                params = {
                    'api_key': self.api_key,
                    'query': search_query,
                    'dataType': ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],  # Include more data types
                    'pageSize': min(page_size, 50),  # USDA limits to 200
                    'pageNumber': 1,
                    'sortBy': 'relevance',
                    'brandOwner': ''  # Empty for generic foods
                }
                
                url = f"{self.base_url}/foods/search"
                logging.info(f"USDA search URL: {url}")
                logging.info(f"USDA search params: {params}")
                
                response = self.session.get(url, params=params, timeout=10)
                
                logging.info(f"USDA API response status: {response.status_code}")
                
                if response.status_code == 403:
                    logging.error("USDA API returned 403 - Check API key")
                    break  # Don't retry on auth error
                elif response.status_code == 400:
                    logging.error(f"USDA API returned 400 - Bad request: {response.text}")
                    continue  # Try next query
                    
                response.raise_for_status()
                
                data = response.json()
                
                logging.info(f"USDA search for '{search_query}': Found {data.get('totalHits', 0)} results")
                
                if data.get('foods') and len(data['foods']) > 0:
                    # Return the best match (first result)
                    result = self._process_search_result(data['foods'][0])
                    logging.info(f"USDA result for '{search_query}': {result.get('name')} (ID: {result.get('usda_id')})")
                    return result
            
            # If all queries failed, return fallback
            logging.warning(f"No USDA foods found for any variation of query: {query}")
            return self.get_fallback_nutrition_estimate(query, "General")
            
        except requests.exceptions.Timeout:
            logging.error(f"USDA search timeout for query: {query}")
            return self.get_fallback_nutrition_estimate(query, "General")
        except requests.exceptions.RequestException as e:
            logging.error(f"USDA search request failed: {str(e)}")
            return self.get_fallback_nutrition_estimate(query, "General")
        except Exception as e:
            logging.error(f"USDA search failed: {str(e)}")
            return self.get_fallback_nutrition_estimate(query, "General")
    
    def get_food_details(self, fdc_id: int) -> Optional[Dict]:
        """
        Get detailed nutrition information for a specific food
        
        Args:
            fdc_id: USDA Food Data Central ID
            
        Returns:
            Dictionary containing detailed nutrition data
        """
        try:
            self._rate_limit()
            
            params = {
                'api_key': self.api_key,
                'format': 'abridged',
                'nutrients': list(self.nutrient_ids.keys())
            }
            
            response = self.session.get(f"{self.base_url}/food/{fdc_id}", params=params)
            response.raise_for_status()
            
            data = response.json()
            return self._process_food_details(data)
            
        except requests.exceptions.RequestException as e:
            logging.error(f"USDA details request failed: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"USDA get details failed: {str(e)}")
            return None
    
    def _process_search_result(self, food_data: Dict) -> Dict:
        """Process search result and extract relevant information"""
        processed = {
            'usda_id': food_data.get('fdcId'),
            'name': food_data.get('description', ''),
            'brand': food_data.get('brandOwner', ''),
            'category': food_data.get('foodCategory', ''),
            'data_type': food_data.get('dataType', ''),
            'nutrition': {}
        }
        
        # Extract nutrition data if available
        nutrients = food_data.get('foodNutrients', [])
        processed['nutrition'] = self._extract_nutrients(nutrients)
        
        return processed
    
    def _process_food_details(self, food_data: Dict) -> Dict:
        """Process detailed food data"""
        processed = {
            'usda_id': food_data.get('fdcId'),
            'name': food_data.get('description', ''),
            'brand': food_data.get('brandOwner', ''),
            'category': food_data.get('foodCategory', ''),
            'data_type': food_data.get('dataType', ''),
            'serving_size': 100,  # USDA data is per 100g
            'serving_unit': 'grams',
            'nutrition': {}
        }
        
        # Extract nutrition data
        nutrients = food_data.get('foodNutrients', [])
        processed['nutrition'] = self._extract_nutrients(nutrients)
        
        return processed
    
    def _extract_nutrients(self, nutrients: List[Dict]) -> Dict:
        """Extract nutrition values from USDA nutrient data"""
        nutrition = {
            'calories': 0,
            'protein': 0,
            'fat': 0,
            'carbs': 0,
            'fiber': 0,
            'sugar': 0,
            'sodium': 0,
            'calcium': 0,
            'iron': 0
        }
        
        for nutrient in nutrients:
            nutrient_id = nutrient.get('nutrientId')
            value = nutrient.get('value', 0)
            
            if nutrient_id == 208:  # Energy (calories)
                nutrition['calories'] = value
            elif nutrient_id == 203:  # Protein
                nutrition['protein'] = value
            elif nutrient_id == 204:  # Fat
                nutrition['fat'] = value
            elif nutrient_id == 205:  # Carbs
                nutrition['carbs'] = value
            elif nutrient_id == 291:  # Fiber
                nutrition['fiber'] = value
            elif nutrient_id == 269:  # Sugar
                nutrition['sugar'] = value
            elif nutrient_id == 307:  # Sodium (convert mg to mg)
                nutrition['sodium'] = value
            elif nutrient_id == 301:  # Calcium
                nutrition['calcium'] = value
            elif nutrient_id == 303:  # Iron
                nutrition['iron'] = value
        
        return nutrition
    
    def search_multiple_foods(self, food_names: List[str]) -> Dict[str, Dict]:
        """
        Search for multiple foods at once
        
        Args:
            food_names: List of food names to search for
            
        Returns:
            Dictionary mapping food names to their nutrition data
        """
        results = {}
        
        for food_name in food_names:
            result = self.search_food(food_name)
            if result:
                results[food_name] = result
            else:
                # Log failed search
                logging.warning(f"No USDA data found for: {food_name}")
                results[food_name] = None
        
        return results
    
    def calculate_nutrition_for_portion(self, nutrition_per_100g: Dict, portion_grams: float) -> Dict:
        """
        Calculate nutrition values for a specific portion size
        
        Args:
            nutrition_per_100g: Nutrition data per 100g
            portion_grams: Actual portion size in grams
            
        Returns:
            Calculated nutrition for the portion
        """
        multiplier = portion_grams / 100.0
        
        calculated = {}
        for nutrient, value_per_100g in nutrition_per_100g.items():
            calculated[nutrient] = value_per_100g * multiplier
        
        return calculated
    
    def get_fallback_nutrition_estimate(self, food_name: str, category: str = None) -> Dict:
        """
        Provide fallback nutrition estimates when USDA search fails
        
        Args:
            food_name: Name of the food item
            category: Food category if known
            
        Returns:
            Dictionary with estimated nutrition values per 100g
        """
        # Enhanced fallback estimates based on food categories and common foods
        fallback_data = {
            'Protein': {'calories': 200, 'protein': 25, 'fat': 8, 'carbs': 0, 'fiber': 0, 'sugar': 0, 'sodium': 70},
            'Meat': {'calories': 200, 'protein': 25, 'fat': 8, 'carbs': 0, 'fiber': 0, 'sugar': 0, 'sodium': 70},
            'Chicken': {'calories': 165, 'protein': 31, 'fat': 3.6, 'carbs': 0, 'fiber': 0, 'sugar': 0, 'sodium': 74},
            'Fish': {'calories': 150, 'protein': 28, 'fat': 4, 'carbs': 0, 'fiber': 0, 'sugar': 0, 'sodium': 50},
            'Vegetables': {'calories': 25, 'protein': 2, 'fat': 0.3, 'carbs': 5, 'fiber': 2.5, 'sugar': 2.5, 'sodium': 10},
            'Fruits': {'calories': 60, 'protein': 1, 'fat': 0.2, 'carbs': 15, 'fiber': 3, 'sugar': 12, 'sodium': 2},
            'Grains': {'calories': 350, 'protein': 10, 'fat': 2, 'carbs': 70, 'fiber': 8, 'sugar': 2, 'sodium': 5},
            'Rice': {'calories': 130, 'protein': 2.7, 'fat': 0.3, 'carbs': 28, 'fiber': 1.8, 'sugar': 0.1, 'sodium': 5},
            'Bread': {'calories': 265, 'protein': 9, 'fat': 3.2, 'carbs': 49, 'fiber': 2.7, 'sugar': 5, 'sodium': 477},
            'Dairy': {'calories': 100, 'protein': 8, 'fat': 3, 'carbs': 5, 'fiber': 0, 'sugar': 5, 'sodium': 40},
            'Cheese': {'calories': 350, 'protein': 25, 'fat': 25, 'carbs': 3, 'fiber': 0, 'sugar': 3, 'sodium': 650},
            'Egg': {'calories': 155, 'protein': 13, 'fat': 11, 'carbs': 1.1, 'fiber': 0, 'sugar': 1.1, 'sodium': 124},
            'General': {'calories': 150, 'protein': 8, 'fat': 5, 'carbs': 20, 'fiber': 3, 'sugar': 8, 'sodium': 100},
            'default': {'calories': 150, 'protein': 8, 'fat': 5, 'carbs': 20, 'fiber': 3, 'sugar': 8, 'sodium': 100}
        }
        
        # Try to match specific food names first
        food_lower = food_name.lower()
        matched_category = None
        
        for key in fallback_data.keys():
            if key.lower() in food_lower or food_lower in key.lower():
                matched_category = key
                break
        
        # Fall back to provided category
        if not matched_category and category:
            for key in fallback_data.keys():
                if category.lower() in key.lower() or key.lower() in category.lower():
                    matched_category = key
                    break
        
        # Use matched category or default
        estimates = fallback_data.get(matched_category, fallback_data['default'])
        
        logging.info(f"Using fallback nutrition for '{food_name}' with category '{matched_category or category}': {estimates}")
        
        return {
            'usda_id': None,
            'name': food_name,
            'category': category or 'General',
            'brand': '',
            'data_type': 'estimate',
            'serving_size': 100,
            'serving_unit': 'grams',
            'nutrition': {
                'calories': estimates['calories'],
                'protein': estimates['protein'],
                'fat': estimates['fat'],
                'carbs': estimates['carbs'],
                'fiber': estimates['fiber'],
                'sugar': estimates['sugar'],
                'sodium': estimates['sodium'],
                'calcium': 50,  # Default estimates
                'iron': 2
            },
            'is_estimate': True
        }

# Example usage and testing
if __name__ == "__main__":
    # This would be used for testing the service
    service = USDAService()
    
    # Test search
    result = service.search_food("chicken breast")
    print("Search result:", result)
    
    # Test multiple search
    foods = ["apple", "banana", "brown rice"]
    results = service.search_multiple_foods(foods)
    print("Multiple search results:", results)
