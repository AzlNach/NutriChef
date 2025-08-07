# Gemini API Service for Food Analysis
import google.generativeai as genai
import os
import json
import logging
from PIL import Image
import base64
from typing import Dict, List, Optional
import time

class GeminiService:
    def __init__(self):
        """Initialize Gemini API client"""
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            logging.warning("GEMINI_API_KEY not found, using demo mode")
            self.api_key = "demo"  # For testing purposes
        
        if self.api_key != "demo":
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
        
        # Primary food analysis prompt untuk sistem baru
        self.analysis_prompt = """
        Analyze this food image and provide detailed information in JSON format. 

        Instructions:
        - Identify the main food dish (e.g., "Nasi Goreng", "Pizza Margherita", "Chicken Curry")
        - Provide a description of the dish for category matching
        - List all ingredient components (e.g., for nasi goreng: rice, egg, vegetables, soy sauce)
        - Estimate portion sizes in common units (grams, cups, pieces, etc.)
        - Provide confidence scores (0-1) for each identification

        Required JSON format:
        {
          "analysis_status": "success|partial|failed",
          "confidence_overall": 0.85,
          "main_food": {
            "name": "main dish name (e.g., Nasi Goreng)",
            "description": "detailed description for category matching",
            "estimated_portion": 250,
            "portion_unit": "grams",
            "confidence": 0.9
          },
          "ingredients": [
            {
              "name": "ingredient name (e.g., nasi putih, telur ayam)",
              "category": "ingredient category (protein, carbs, vegetables, etc)",
              "estimated_portion": 150,
              "portion_unit": "grams",
              "confidence": 0.8
            }
          ],
          "image_quality": "good|fair|poor",
          "additional_notes": "any relevant observations"
        }

        Image context: User uploaded this food image for diet tracking purposes.
        """
    
    async def analyze_food_image(self, image_path: str) -> Dict:
        """
        Analyze food image using Gemini Vision API
        
        Args:
            image_path: Path to the uploaded image
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Check if we're in demo mode
            if self.model is None:
                logging.info("Running in demo mode - returning sample data")
                return self._get_demo_response()
            
            # Load and prepare image
            image = Image.open(image_path)
            
            # Optimize image if too large
            if image.size[0] > 2048 or image.size[1] > 2048:
                image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            
            logging.info(f"Sending image to Gemini API: {image_path}")
            
            # Generate analysis
            response = self.model.generate_content([
                self.analysis_prompt,
                image
            ])
            
            logging.info(f"Gemini response received: {response.text[:200]}...")
            
            # Parse JSON response
            result = self._parse_gemini_response(response.text)
            
            # Validate and enhance result
            result = self._validate_analysis_result(result)
            
            logging.info(f"Analysis completed with confidence: {result.get('confidence_overall', 0)}")
            return result
            
        except Exception as e:
            logging.error(f"Gemini analysis failed: {str(e)}")
            # Return fallback response instead of failing completely
            return self._get_fallback_response(str(e))
    
    def _get_demo_response(self) -> Dict:
        """Return demo response when API key is not available"""
        return {
            "analysis_status": "success",
            "confidence_overall": 0.85,
            "main_food": {
                "name": "Nasi Goreng",
                "description": "Indonesian fried rice dish with vegetables, egg, and sweet soy sauce. Traditional Indonesian food with mixed ingredients.",
                "estimated_portion": 250,
                "portion_unit": "grams",
                "confidence": 0.9
            },
            "ingredients": [
                {
                    "name": "nasi putih",
                    "category": "carbs",
                    "estimated_portion": 150,
                    "portion_unit": "grams",
                    "confidence": 0.9
                },
                {
                    "name": "telur ayam",
                    "category": "protein",
                    "estimated_portion": 50,
                    "portion_unit": "grams",
                    "confidence": 0.8
                },
                {
                    "name": "kecap manis",
                    "category": "condiment",
                    "estimated_portion": 15,
                    "portion_unit": "ml",
                    "confidence": 0.7
                },
                {
                    "name": "sayuran campur",
                    "category": "vegetables",
                    "estimated_portion": 35,
                    "portion_unit": "grams",
                    "confidence": 0.8
                }
            ],
            "image_quality": "good",
            "additional_notes": "Demo response - showing typical nasi goreng ingredients"
        }
    
    def _get_fallback_response(self, error_message: str) -> Dict:
        """Return fallback response when analysis fails"""
        return {
            "analysis_status": "partial",
            "confidence_overall": 0.6,
            "detected_foods": [
                {
                    "name": "Mixed Food Item",
                    "category": "Unknown",
                    "estimated_portion": 200,
                    "portion_unit": "grams", 
                    "confidence": 0.6,
                    "notes": f"Fallback analysis due to error: {error_message[:100]}"
                }
            ],
            "image_quality": "unknown",
            "additional_notes": f"Analysis failed, using fallback: {error_message}"
        }
    
    async def reanalyze_with_context(self, image_path: str, previous_result: Dict) -> Dict:
        """
        Re-analyze image with context from previous analysis
        
        Args:
            image_path: Path to the image
            previous_result: Previous analysis result for context
            
        Returns:
            Refined analysis result
        """
        try:
            image = Image.open(image_path)
            
            refined_prompt = f"""
            Re-analyze this food image with focus on uncertain items. 
            Previous analysis detected: {json.dumps(previous_result.get('detected_foods', []))}

            Please:
            1. Verify or correct previous identifications
            2. Look for missed food items
            3. Refine portion estimates
            4. Provide alternative identifications if uncertain

            Use the same JSON format as before.
            """
            
            response = self.model.generate_content([
                refined_prompt,
                image
            ])
            
            result = self._parse_gemini_response(response.text)
            result = self._validate_analysis_result(result)
            
            return result
            
        except Exception as e:
            logging.error(f"Gemini re-analysis failed: {str(e)}")
            return previous_result
    
    def _parse_gemini_response(self, response_text: str) -> Dict:
        """Parse Gemini API response and extract JSON"""
        try:
            # Try to find JSON in the response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # Fallback: create structured response from text
                return self._create_fallback_response(response_text)
                
        except json.JSONDecodeError:
            return self._create_fallback_response(response_text)
    
    def _create_fallback_response(self, text: str) -> Dict:
        """Create fallback response when JSON parsing fails"""
        return {
            "analysis_status": "partial",
            "confidence_overall": 0.5,
            "detected_foods": [
                {
                    "name": "Unknown food item",
                    "category": "unknown",
                    "estimated_portion": 100,
                    "portion_unit": "grams",
                    "confidence": 0.5,
                    "notes": f"Analysis text: {text[:200]}..."
                }
            ],
            "image_quality": "unknown",
            "additional_notes": "Failed to parse structured response"
        }
    
    def _validate_analysis_result(self, result: Dict) -> Dict:
        """Validate and enhance analysis result"""
        # Ensure required fields exist
        if 'detected_foods' not in result:
            result['detected_foods'] = []
        
        if 'confidence_overall' not in result:
            result['confidence_overall'] = 0.5
        
        if 'analysis_status' not in result:
            result['analysis_status'] = 'partial'
        
        # If no foods detected or empty list, create fallback food
        if not result.get('detected_foods') or len(result['detected_foods']) == 0:
            logging.warning("No foods detected, creating fallback food item")
            result['detected_foods'] = [
                {
                    "name": "Mixed Food",
                    "category": "General",
                    "estimated_portion": 200,
                    "portion_unit": "grams",
                    "confidence": 0.6,
                    "notes": "Fallback food item - manual identification recommended"
                }
            ]
            result['confidence_overall'] = 0.6
            result['analysis_status'] = 'partial'
        
        # Validate each detected food
        validated_foods = []
        for food in result.get('detected_foods', []):
            validated_food = self._validate_food_item(food)
            if validated_food:
                validated_foods.append(validated_food)
        
        result['detected_foods'] = validated_foods
        
        # Update overall confidence based on individual foods
        if validated_foods:
            avg_confidence = sum(f.get('confidence', 0.5) for f in validated_foods) / len(validated_foods)
            result['confidence_overall'] = min(result['confidence_overall'], avg_confidence)
        
        return result
    
    def _validate_food_item(self, food_item: Dict) -> Optional[Dict]:
        """Validate individual food item"""
        if not isinstance(food_item, dict):
            return None
        
        # Required fields with defaults
        validated = {
            'name': food_item.get('name', 'Unknown food'),
            'category': food_item.get('category', 'unknown'),
            'estimated_portion': max(float(food_item.get('estimated_portion', 100)), 1),
            'portion_unit': food_item.get('portion_unit', 'grams'),
            'confidence': min(max(float(food_item.get('confidence', 0.5)), 0.0), 1.0),
            'notes': food_item.get('notes', '')
        }
        
        # Validate portion size reasonableness
        if validated['estimated_portion'] > 2000:  # 2kg seems unreasonable for single item
            validated['estimated_portion'] = 200
            validated['confidence'] *= 0.8
            validated['notes'] += " (Portion size adjusted)"
        
        return validated

# Example usage and testing
if __name__ == "__main__":
    # This would be used for testing the service
    pass
