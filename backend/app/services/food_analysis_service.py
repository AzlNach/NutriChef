# Food Analysis Service - Main orchestrator
import os
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional
from PIL import Image
import json

from .gemini_service import GeminiService
from .usda_service import USDAService
# from .fatsecret_service import FatSecretService  # Optional alternative

class FoodAnalysisService:
    def __init__(self):
        """Initialize the food analysis service with all required APIs"""
        self.gemini_service = GeminiService()
        self.usda_service = USDAService()
        # self.fatsecret_service = FatSecretService()  # Optional
        
        # Analysis configuration
        self.confidence_threshold = 0.7
        self.max_retry_attempts = 2
        
    async def analyze_food_image(self, image_path: str, user_id: int, meal_type: str = 'lunch', notes: str = '') -> Dict:
        """
        Main method to analyze food image and return complete nutrition data
        
        Args:
            image_path: Path to uploaded image
            user_id: ID of the user requesting analysis
            meal_type: Type of meal (breakfast, lunch, dinner, snack)
            notes: Optional user notes
            
        Returns:
            Complete analysis result with nutrition data
        """
        try:
            # Generate session ID
            session_id = str(uuid.uuid4())
            
            # Step 1: Analyze image with Gemini
            logging.info(f"Starting Gemini analysis for session {session_id}")
            gemini_result = await self.gemini_service.analyze_food_image(image_path)
            
            # Step 2: Validate confidence and retry if needed
            if gemini_result['confidence_overall'] < self.confidence_threshold:
                logging.info(f"Low confidence ({gemini_result['confidence_overall']:.2f}), retrying analysis")
                gemini_result = await self.gemini_service.reanalyze_with_context(image_path, gemini_result)
            
            # Step 3: Enrich with nutrition data dan save to database
            main_food_data = gemini_result.get('main_food', {})
            ingredients_data = gemini_result.get('ingredients', [])
            
            enriched_result = await self._process_food_and_ingredients(
                main_food_data, ingredients_data, session_id, user_id
            )
            
            # Step 4: Calculate total nutrition
            total_nutrition = self._calculate_total_nutrition(enriched_result['ingredients'])
            
            # Step 5: Prepare final result
            analysis_result = {
                'session_id': session_id,
                'user_id': user_id,
                'status': 'completed',
                'meal_type': meal_type,
                'notes': notes,
                'analysis_time': datetime.utcnow().isoformat(),
                'image_info': {
                    'path': image_path,
                    'filename': os.path.basename(image_path)
                },
                'gemini_analysis': {
                    'confidence_overall': gemini_result['confidence_overall'],
                    'image_quality': gemini_result.get('image_quality', 'unknown'),
                    'additional_notes': gemini_result.get('additional_notes', '')
                },
                'main_food': enriched_result['main_food'],
                'ingredients': enriched_result['ingredients'],
                'total_nutrition': total_nutrition,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Step 6: Save to database (implement this in the route handler)
            logging.info(f"Analysis completed successfully for session {session_id}")
            return analysis_result
            
        except Exception as e:
            logging.error(f"Food analysis failed: {str(e)}")
            return {
                'session_id': session_id if 'session_id' in locals() else str(uuid.uuid4()),
                'status': 'failed',
                'error': str(e),
                'created_at': datetime.utcnow().isoformat()
            }
    
    async def _process_food_and_ingredients(self, main_food_data: Dict, ingredients_data: List[Dict], session_id: str, user_id: int) -> Dict:
        """
        Process main food and ingredients with nutrition enrichment and database saving
        
        Args:
            main_food_data: Main food information from Gemini
            ingredients_data: List of ingredients from Gemini
            session_id: Analysis session ID
            user_id: User ID
            
        Returns:
            Dict containing processed main food, enriched ingredients, and database IDs
        """
        from app.models import db, Food, DetectedIngredient, FoodAnalysisSession
        
        try:
            # 1. Create or get main food entry
            main_food_name = main_food_data.get('name', 'Unknown Dish')
            main_food_description = main_food_data.get('description', '')
            
            # Look for existing main food entry
            existing_food = Food.query.filter_by(name=main_food_name).first()
            
            if not existing_food:
                # Create new main food entry
                new_food = Food(
                    name=main_food_name,
                    description=main_food_description,
                    gemini_source=True
                )
                db.session.add(new_food)
                db.session.flush()  # Get ID without committing
                main_food_id = new_food.id
                logging.info(f"Created new main food: {main_food_name} with ID {main_food_id}")
            else:
                main_food_id = existing_food.id
                logging.info(f"Using existing main food: {main_food_name} with ID {main_food_id}")
            
            # 2. Process and enrich each ingredient
            enriched_ingredients = []
            total_nutrition = {
                'calories': 0, 'protein': 0, 'carbohydrates': 0, 'fat': 0,
                'fiber': 0, 'sugar': 0, 'sodium': 0, 'calcium': 0, 'iron': 0
            }
            
            for ingredient in ingredients_data:
                try:
                    # Enrich with USDA nutrition data
                    nutrition_data = self.usda_service.search_food(ingredient['name'])
                    
                    # Convert portion to grams
                    portion_grams = self._convert_to_grams(
                        ingredient['estimated_portion'], 
                        ingredient['portion_unit']
                    )
                    
                    if nutrition_data and nutrition_data.get('nutrition'):
                        data_source = 'usda' if nutrition_data.get('usda_id') else 'estimate'
                        calculated_nutrition = self.usda_service.calculate_nutrition_for_portion(
                            nutrition_data['nutrition'], portion_grams
                        )
                    else:
                        data_source = 'fallback'
                        fallback_data = self.usda_service.get_fallback_nutrition_estimate(
                            ingredient['name'], ingredient.get('category', 'General')
                        )
                        calculated_nutrition = self.usda_service.calculate_nutrition_for_portion(
                            fallback_data['nutrition'], portion_grams
                        )
                    
                    # Accumulate total nutrition
                    for key in total_nutrition:
                        total_nutrition[key] += calculated_nutrition.get(key, 0)
                    
                    # Save ingredient to database
                    detected_ingredient = DetectedIngredient(
                        ingredient_name=ingredient['name'],
                        ingredient_category=ingredient.get('category', 'General'),
                        estimated_portion=ingredient['estimated_portion'],
                        portion_unit=ingredient['portion_unit'],
                        confidence_score=ingredient.get('confidence', 0.0),
                        portion_grams=portion_grams,
                        calories=calculated_nutrition.get('calories', 0),
                        protein=calculated_nutrition.get('protein', 0),
                        carbohydrates=calculated_nutrition.get('carbohydrates', 0),
                        fat=calculated_nutrition.get('fat', 0),
                        fiber=calculated_nutrition.get('fiber', 0),
                        sugar=calculated_nutrition.get('sugar', 0),
                        sodium=calculated_nutrition.get('sodium', 0),
                        calcium=calculated_nutrition.get('calcium', 0),
                        iron=calculated_nutrition.get('iron', 0),
                        data_source=data_source,
                        food_id=main_food_id
                    )
                    
                    db.session.add(detected_ingredient)
                    db.session.flush()
                    
                    enriched_ingredient = {
                        **ingredient,
                        'id': detected_ingredient.id,
                        'portion_grams': portion_grams,
                        'nutrition': calculated_nutrition,
                        'data_source': data_source
                    }
                    enriched_ingredients.append(enriched_ingredient)
                    
                    logging.info(f"Processed ingredient: {ingredient['name']} ({portion_grams}g)")
                    
                except Exception as e:
                    logging.error(f"Error processing ingredient {ingredient.get('name', 'unknown')}: {str(e)}")
                    continue
            
            # Update main food with accumulated nutrition
            main_food_entry = Food.query.get(main_food_id)
            if main_food_entry:
                main_food_entry.calories = total_nutrition['calories']
                main_food_entry.protein = total_nutrition['protein']
                main_food_entry.carbohydrates = total_nutrition['carbohydrates']
                main_food_entry.fat = total_nutrition['fat']
                main_food_entry.fiber = total_nutrition['fiber']
                main_food_entry.sugar = total_nutrition['sugar']
                main_food_entry.sodium = total_nutrition['sodium']
                main_food_entry.calcium = total_nutrition['calcium']
                main_food_entry.iron = total_nutrition['iron']
            
            # Commit all changes
            db.session.commit()
            
            return {
                'main_food': {
                    'id': main_food_id,
                    'name': main_food_name,
                    'description': main_food_description,
                    'nutrition': total_nutrition
                },
                'main_food_id': main_food_id,
                'main_food_name': main_food_name,
                'ingredients': enriched_ingredients
            }
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error in _process_food_and_ingredients: {str(e)}")
            raise

    async def _enrich_with_nutrition_data(self, detected_foods: List[Dict]) -> List[Dict]:
        """
        Enrich detected foods with nutrition data from USDA API
        
        Args:
            detected_foods: List of foods detected by Gemini
            
        Returns:
            List of foods enriched with nutrition data
        """
        enriched_foods = []
        
        for food in detected_foods:
            try:
                logging.info(f"Searching USDA data for: {food['name']}")
                # Search for nutrition data
                nutrition_data = self.usda_service.search_food(food['name'])
                
                # Convert portion to grams
                portion_grams = self._convert_to_grams(
                    food['estimated_portion'], 
                    food['portion_unit']
                )
                
                if nutrition_data and nutrition_data.get('nutrition'):
                    if nutrition_data.get('usda_id'):
                        logging.info(f"Found USDA data for {food['name']}: ID={nutrition_data['usda_id']}")
                        data_source = 'usda'
                    else:
                        logging.info(f"Using fallback data for {food['name']}")
                        data_source = 'estimate'
                    
                    # Calculate nutrition for the detected portion
                    calculated_nutrition = self.usda_service.calculate_nutrition_for_portion(
                        nutrition_data['nutrition'],
                        portion_grams
                    )
                    
                    enriched_food = {
                        **food,
                        'usda_data': nutrition_data,
                        'portion_grams': portion_grams,
                        'nutrition': calculated_nutrition,
                        'data_source': data_source,
                        'fallback_data': nutrition_data if data_source == 'estimate' else None
                    }
                else:
                    logging.warning(f"No nutrition data found for {food['name']}, using default fallback")
                    # Create emergency fallback
                    fallback_data = self.usda_service.get_fallback_nutrition_estimate(
                        food['name'], 
                        food.get('category', 'General')
                    )
                    
                    calculated_nutrition = self.usda_service.calculate_nutrition_for_portion(
                        fallback_data['nutrition'],
                        portion_grams
                    )
                    
                    enriched_food = {
                        **food,
                        'fallback_data': fallback_data,
                        'portion_grams': portion_grams,
                        'nutrition': calculated_nutrition,
                        'data_source': 'estimate',
                        'confidence': food.get('confidence', 0.8) * 0.7  # Reduce confidence for estimates
                    }
                
                enriched_foods.append(enriched_food)
                logging.info(f"Enriched food: {enriched_food['name']} - {enriched_food['data_source']} - Calories: {enriched_food['nutrition'].get('calories', 0):.1f}")
                
            except Exception as e:
                logging.error(f"Failed to enrich food '{food['name']}': {str(e)}")
                # Create minimal food entry with basic nutrition
                portion_grams = self._convert_to_grams(
                    food.get('estimated_portion', 100), 
                    food.get('portion_unit', 'grams')
                )
                
                # Use very basic nutrition estimates
                basic_nutrition = {
                    'calories': portion_grams * 1.5,  # 150 cal per 100g estimate
                    'protein': portion_grams * 0.08,   # 8g per 100g estimate
                    'fat': portion_grams * 0.05,      # 5g per 100g estimate
                    'carbs': portion_grams * 0.20,    # 20g per 100g estimate
                    'fiber': portion_grams * 0.03,    # 3g per 100g estimate
                    'sugar': portion_grams * 0.08,    # 8g per 100g estimate
                    'sodium': portion_grams * 1.0     # 100mg per 100g estimate
                }
                
                enriched_foods.append({
                    **food,
                    'portion_grams': portion_grams,
                    'nutrition': basic_nutrition,
                    'data_source': 'basic_estimate',
                    'confidence': 0.4,
                    'error': str(e)
                })
                
                logging.info(f"Added basic estimate for: {food['name']} - Calories: {basic_nutrition['calories']:.1f}")
        
        return enriched_foods
    
    def _convert_to_grams(self, portion: float, unit: str) -> float:
        """
        Convert portion to grams for nutrition calculations
        
        Args:
            portion: Portion amount
            unit: Unit of measurement
            
        Returns:
            Weight in grams
        """
        conversion_factors = {
            'grams': 1.0,
            'cups': 240.0,  # Rough average
            'tablespoons': 15.0,
            'teaspoons': 5.0,
            'pieces': 100.0,  # Average estimate
            'slices': 25.0,   # Average bread slice
            'ounces': 28.35,
            'pounds': 453.59,
            'kilograms': 1000.0,
            'liters': 1000.0,  # For liquids, assume density ~1
            'milliliters': 1.0
        }
        
        factor = conversion_factors.get(unit.lower(), 100.0)  # Default to 100g
        return portion * factor
    
    def _calculate_total_nutrition(self, enriched_items: List[Dict]) -> Dict:
        """
        Calculate total nutrition from all detected ingredients
        
        Args:
            enriched_items: List of ingredients with nutrition data
            
        Returns:
            Dictionary with total nutrition values
        """
        totals = {
            'calories': 0,
            'protein': 0,
            'fat': 0,
            'carbohydrates': 0,  # Changed from 'carbs' to match database
            'fiber': 0,
            'sugar': 0,
            'sodium': 0,
            'calcium': 0,
            'iron': 0
        }
        
        for item in enriched_items:
            nutrition = item.get('nutrition', {})
            for nutrient in totals.keys():
                # Handle both 'carbs' and 'carbohydrates'
                if nutrient == 'carbohydrates':
                    totals[nutrient] += nutrition.get('carbohydrates', nutrition.get('carbs', 0))
                else:
                    totals[nutrient] += nutrition.get(nutrient, 0)
        
        return totals
    
    def validate_analysis_result(self, analysis_result: Dict) -> Dict:
        """
        Validate analysis result for reasonableness
        
        Args:
            analysis_result: Complete analysis result
            
        Returns:
            Validated and potentially corrected result
        """
        warnings = []
        
        # Check total calories
        total_calories = analysis_result['total_nutrition'].get('calories', 0)
        if total_calories > 2000:
            warnings.append("Very high calorie count detected. Please verify portion sizes.")
        elif total_calories < 10:
            warnings.append("Very low calorie count detected. May indicate detection issues.")
        
        # Check macro ratios
        protein = analysis_result['total_nutrition'].get('protein', 0)
        carbs = analysis_result['total_nutrition'].get('carbs', 0)
        fat = analysis_result['total_nutrition'].get('fat', 0)
        
        # Calculate calories from macros (rough check)
        macro_calories = (protein * 4) + (carbs * 4) + (fat * 9)
        if abs(macro_calories - total_calories) > (total_calories * 0.3):
            warnings.append("Macro nutrients don't align with total calories. Data may be inconsistent.")
        
        # Add validation warnings
        if warnings:
            analysis_result['validation_warnings'] = warnings
        
        return analysis_result
    
    def get_nutrition_goals(self, user_profile: Dict) -> Dict:
        """
        Calculate nutrition goals based on user profile
        
        Args:
            user_profile: User's profile data
            
        Returns:
            Dictionary with daily nutrition goals
        """
        # Basic calculation (can be made more sophisticated)
        daily_calories = user_profile.get('daily_calorie_goal', 2000)
        
        return {
            'calories': daily_calories,
            'protein': daily_calories * 0.15 / 4,  # 15% of calories from protein
            'carbs': daily_calories * 0.50 / 4,    # 50% of calories from carbs
            'fat': daily_calories * 0.35 / 9,      # 35% of calories from fat
            'fiber': 25,  # Standard recommendation
            'sodium': 2300  # Standard recommendation in mg
        }

# Example usage
if __name__ == "__main__":
    # This would be used for testing
    pass
