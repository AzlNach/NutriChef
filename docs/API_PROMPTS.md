# NutriChef API Prompts & Integration Guide

## 1. Gemini API Prompts

### Primary Food Analysis Prompt
```
Analyze this food image and provide detailed information in JSON format. 

Instructions:
- Identify all visible food items in the image
- Estimate portion sizes in common units (grams, cups, pieces, etc.)
- Provide confidence scores (0-1) for each identification
- If multiple items, list them separately
- Consider typical serving sizes for accuracy

Required JSON format:
{
  "analysis_status": "success|partial|failed",
  "confidence_overall": 0.85,
  "detected_foods": [
    {
      "name": "food item name",
      "category": "food category",
      "estimated_portion": 150,
      "portion_unit": "grams",
      "confidence": 0.9,
      "notes": "additional observations"
    }
  ],
  "image_quality": "good|fair|poor",
  "additional_notes": "any relevant observations"
}

Image context: User uploaded this food image for diet tracking purposes.
```

### Secondary Verification Prompt (if first analysis has low confidence)
```
Re-analyze this food image with focus on uncertain items. Previous analysis detected: [PREVIOUS_RESULTS]

Please:
1. Verify or correct previous identifications
2. Look for missed food items
3. Refine portion estimates
4. Provide alternative identifications if uncertain

Use the same JSON format as before.
```

### Portion Size Refinement Prompt
```
Given the identified food item "[FOOD_NAME]", estimate the portion size more accurately based on:
- Visual cues in the image (plate size, utensils, etc.)
- Typical serving sizes for this food
- Apparent density and volume

Provide estimate in:
- Grams (weight)
- Common household measures (cups, pieces, slices, etc.)
- Volume if applicable (ml, liters)

Format: {"portion_grams": X, "household_measure": "Y cups", "confidence": 0.8}
```

## 2. USDA FoodData Central API Integration

### Food Search Endpoint
```
GET https://api.nal.usda.gov/fdc/v1/foods/search

Parameters:
- api_key: YOUR_API_KEY
- query: "food name from Gemini analysis"
- dataType: ["Foundation", "SR Legacy"] // Prioritize these for nutrition data
- pageSize: 25
- pageNumber: 1
- sortBy: "relevance"
- brandOwner: "" // Leave empty for generic foods
```

### Food Details Endpoint
```
GET https://api.nal.usda.gov/fdc/v1/food/{fdcId}

Parameters:
- api_key: YOUR_API_KEY
- format: "abridged" // For essential nutrition data
- nutrients: [203, 204, 205, 208, 269, 291] // Protein, Fat, Carbs, Energy, Sugar, Fiber
```

### USDA Nutrient IDs Reference
```python
USDA_NUTRIENTS = {
    208: "Energy (calories)",
    203: "Protein", 
    204: "Total lipid (fat)",
    205: "Carbohydrate, by difference",
    269: "Sugars, total including NLEA",
    291: "Fiber, total dietary",
    307: "Sodium, Na",
    301: "Calcium, Ca",
    303: "Iron, Fe"
}
```

## 3. FatSecret API Integration (Alternative)

### Food Search
```
GET https://platform.fatsecret.com/rest/server.api

Parameters:
- method: foods.search
- search_expression: "food name"
- format: json
- oauth_* parameters for authentication
```

### Food Details
```
GET https://platform.fatsecret.com/rest/server.api

Parameters:
- method: food.get
- food_id: ID_from_search
- format: json
```

## 4. Backend API Endpoints Structure

### Food Analysis Endpoint
```python
POST /api/food/analyze
Content-Type: multipart/form-data

Body:
- image: file
- meal_type: "breakfast|lunch|dinner|snack"
- notes: optional string

Response:
{
  "session_id": "uuid",
  "status": "completed",
  "detected_foods": [
    {
      "id": 1,
      "name": "Grilled Chicken Breast",
      "estimated_portion": 150,
      "portion_unit": "grams",
      "nutrition": {
        "calories": 231,
        "protein": 43.5,
        "carbs": 0,
        "fat": 5.0,
        "fiber": 0,
        "sugar": 0,
        "sodium": 74
      },
      "confidence": 0.92
    }
  ],
  "total_nutrition": {
    "calories": 231,
    "protein": 43.5,
    "carbs": 0,
    "fat": 5.0
  }
}
```

### User Nutrition History
```python
GET /api/nutrition/history?date=2024-01-15&period=day

Response:
{
  "date": "2024-01-15",
  "meals": [
    {
      "meal_type": "breakfast",
      "time": "08:30",
      "foods": [...],
      "total_calories": 350
    }
  ],
  "daily_totals": {
    "calories": 1850,
    "protein": 95,
    "carbs": 180,
    "fat": 65
  },
  "goals": {
    "calories": 2000,
    "protein": 100,
    "carbs": 200,
    "fat": 70
  }
}
```

## 5. Error Handling Prompts

### Gemini API Error Recovery
```
The previous food analysis failed or returned unclear results. Please:

1. Examine the image more carefully
2. Focus on identifying the most prominent food items
3. If the image is unclear, indicate specific issues (lighting, angle, etc.)
4. Provide best estimates even with uncertainty

If no food is clearly visible, respond with:
{
  "analysis_status": "no_food_detected",
  "reason": "specific reason",
  "suggestions": ["better lighting", "closer view", "different angle"]
}
```

### USDA API Fallback Strategy
```python
# Search strategy priority:
1. Exact name match from Gemini
2. Simplified name (remove adjectives)
3. Generic category search
4. Manual food database lookup
5. Default nutrition estimates
```

## 6. Data Validation Prompts

### Nutrition Data Validation
```
Validate this nutrition analysis for reasonableness:

Food: {food_name}
Portion: {portion} {unit}
Calories: {calories}
Protein: {protein}g
Carbs: {carbs}g
Fat: {fat}g

Check for:
- Unrealistic calorie counts
- Impossible macro ratios
- Portion size accuracy
- Common food knowledge

Provide corrected values if needed with explanation.
```

## 7. Sample Integration Code Structure

```python
class FoodAnalysisService:
    def __init__(self):
        self.gemini_client = GeminiClient()
        self.usda_client = USDAClient()
        
    async def analyze_food_image(self, image_path, user_id):
        # 1. Gemini Analysis
        gemini_result = await self.gemini_client.analyze_image(image_path)
        
        # 2. Validate Gemini Results
        if gemini_result['confidence_overall'] < 0.7:
            gemini_result = await self.gemini_client.reanalyze_image(image_path, gemini_result)
        
        # 3. Get Nutrition Data
        enriched_foods = []
        for food in gemini_result['detected_foods']:
            nutrition = await self.get_nutrition_data(food['name'])
            enriched_foods.append({**food, 'nutrition': nutrition})
        
        # 4. Save to Database
        session = await self.save_analysis_session(user_id, gemini_result, enriched_foods)
        
        return session
        
    async def get_nutrition_data(self, food_name):
        # Try USDA first
        usda_data = await self.usda_client.search_food(food_name)
        if usda_data:
            return self.normalize_usda_nutrition(usda_data)
        
        # Fallback to FatSecret
        fatsecret_data = await self.fatsecret_client.search_food(food_name)
        if fatsecret_data:
            return self.normalize_fatsecret_nutrition(fatsecret_data)
        
        # Fallback to default estimates
        return self.get_default_nutrition_estimate(food_name)
```

## 8. Frontend Integration Points

### Image Upload Component
```javascript
const uploadImage = async (imageFile, mealType) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('meal_type', mealType);
  
  const response = await fetch('/api/food/analyze', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  return response.json();
};
```

### Real-time Analysis Updates
```javascript
const pollAnalysisStatus = async (sessionId) => {
  const response = await fetch(`/api/food/analysis/${sessionId}/status`);
  const data = await response.json();
  
  if (data.status === 'completed') {
    return data;
  } else if (data.status === 'processing') {
    // Poll again in 2 seconds
    setTimeout(() => pollAnalysisStatus(sessionId), 2000);
  }
};
```
