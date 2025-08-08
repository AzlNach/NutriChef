"""
FIXED Food Analysis Route - Comprehensive fixes for all identified issues
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import uuid
from datetime import datetime
import mysql.connector
from decimal import Decimal
import json
import asyncio
import logging

food_analysis_bp = Blueprint('food_analysis', __name__)

def get_db_connection():
    """Get database connection"""
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'foodvision_db'),
        charset='utf8mb4',
        collation='utf8mb4_unicode_ci'
    )

@food_analysis_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_food():
    """
    FIXED: Food analysis endpoint with comprehensive fixes for:
    1. Confidence score preservation (use actual Gemini confidence)
    2. Nutrition calculation (proper USDA enrichment)
    3. Main food saving to foods table
    4. Ingredients saving with proper categories
    5. User preferences updating
    """
    try:
        user_id = get_jwt_identity()
        
        # Validate file upload
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        # Get form data
        meal_type = request.form.get('meal_type', 'lunch')
        notes = request.form.get('notes', '')
        
        # Initialize services
        from ..services.gemini_service import GeminiService
        from ..services.usda_service import USDAService
        gemini_service = GeminiService()
        usda_service = USDAService()
        
        # Run Gemini analysis
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            analysis_result = loop.run_until_complete(
                gemini_service.analyze_food_image(file_path)
            )
        finally:
            loop.close()
        
        if analysis_result.get('analysis_status') == 'failed':
            return jsonify({
                'error': 'Food analysis failed', 
                'details': analysis_result.get('error', 'Unknown error')
            }), 500
        
        print(f"🔍 Raw Gemini Analysis Result:")
        print(f"   Confidence Overall: {analysis_result.get('confidence_overall')}")
        print(f"   Main Food: {analysis_result.get('main_food', {})}")
        print(f"   Ingredients: {len(analysis_result.get('ingredients', []))}")
        
        # FIX 1: Extract and preserve actual confidence from Gemini
        main_food = analysis_result.get('main_food', {})
        ingredients = analysis_result.get('ingredients', [])
        
        # Use actual Gemini confidence - DON'T OVERRIDE
        actual_confidence = analysis_result.get('confidence_overall', 0.8)
        if main_food.get('confidence'):
            # Use main food confidence as it's usually more accurate
            actual_confidence = main_food.get('confidence')
        
        print(f"✅ FIX 1: Using actual Gemini confidence: {actual_confidence}")
        
        # FIX 2: Proper nutrition enrichment for each ingredient
        enriched_ingredients = []
        total_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0, 'sugar': 0, 'sodium': 0}
        
        print(f"🔍 Processing {len(ingredients)} ingredients:")
        
        for ingredient in ingredients:
            ingredient_name = ingredient.get('name', 'Unknown')
            ingredient_category = ingredient.get('category', 'General')
            
            print(f"   Processing: {ingredient_name} - Category: {ingredient_category}")
            
            # Get USDA nutrition data
            usda_data = usda_service.search_food(ingredient_name)
            
            # Calculate portion in grams
            raw_portion = ingredient.get('estimated_portion', 100)
            try:
                portion_grams = float(raw_portion) if not isinstance(raw_portion, str) else 100
            except (ValueError, TypeError):
                portion_grams = 100
            
            # Calculate nutrition for this portion
            ingredient_nutrition = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0, 'sugar': 0, 'sodium': 0}
            data_source = 'none'
            
            if usda_data and usda_data.get('nutrition'):
                # Use USDA data
                nutrition_per_100g = usda_data['nutrition']
                portion_multiplier = portion_grams / 100.0
                
                ingredient_nutrition = {
                    'calories': round(nutrition_per_100g.get('calories', 0) * portion_multiplier, 1),
                    'protein': round(nutrition_per_100g.get('protein', 0) * portion_multiplier, 1),
                    'carbs': round(nutrition_per_100g.get('carbs', 0) * portion_multiplier, 1),
                    'fat': round(nutrition_per_100g.get('fat', 0) * portion_multiplier, 1),
                    'fiber': round(nutrition_per_100g.get('fiber', 0) * portion_multiplier, 1),
                    'sugar': round(nutrition_per_100g.get('sugar', 0) * portion_multiplier, 1),
                    'sodium': round(nutrition_per_100g.get('sodium', 0) * portion_multiplier, 1)
                }
                data_source = 'usda'
                print(f"     ✅ USDA: {ingredient_nutrition['calories']} cal")
            else:
                # Use fallback estimates
                fallback_data = usda_service.get_fallback_nutrition_estimate(ingredient_name, ingredient_category)
                if fallback_data and fallback_data.get('nutrition'):
                    nutrition_per_100g = fallback_data['nutrition']
                    portion_multiplier = portion_grams / 100.0
                    
                    ingredient_nutrition = {
                        'calories': round(nutrition_per_100g.get('calories', 0) * portion_multiplier, 1),
                        'protein': round(nutrition_per_100g.get('protein', 0) * portion_multiplier, 1),
                        'carbs': round(nutrition_per_100g.get('carbs', 0) * portion_multiplier, 1),
                        'fat': round(nutrition_per_100g.get('fat', 0) * portion_multiplier, 1),
                        'fiber': round(nutrition_per_100g.get('fiber', 0) * portion_multiplier, 1),
                        'sugar': round(nutrition_per_100g.get('sugar', 0) * portion_multiplier, 1),
                        'sodium': round(nutrition_per_100g.get('sodium', 0) * portion_multiplier, 1)
                    }
                    data_source = 'fallback'
                    print(f"     ⚠️  Fallback: {ingredient_nutrition['calories']} cal")
            
            # Add to total nutrition
            for key in total_nutrition:
                total_nutrition[key] += ingredient_nutrition[key]
            
            # Create enriched ingredient with preserved category
            enriched_ingredient = {
                'name': ingredient_name,
                'category': ingredient_category,  # FIX: Preserve original category
                'estimated_portion': portion_grams,
                'portion_unit': ingredient.get('portion_unit', 'grams'),
                'confidence': ingredient.get('confidence', 0.8),
                'nutrition': ingredient_nutrition,
                'data_source': data_source,
                'usda_data': usda_data if usda_data else None
            }
            enriched_ingredients.append(enriched_ingredient)
        
        print(f"✅ FIX 2: Total nutrition calculated: {total_nutrition['calories']} cal")
        
        # FIX 3: Database operations with proper data saving
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Create analysis session with ACTUAL confidence and nutrition
            session_query = """
            INSERT INTO food_analysis_sessions (user_id, image_path, image_filename, analysis_status, 
                                              gemini_analysis_raw, total_estimated_calories, confidence_score, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            cursor.execute(session_query, (
                user_id, 
                file_path, 
                unique_filename, 
                'completed',
                json.dumps(analysis_result),  # Store complete Gemini result
                Decimal(str(total_nutrition.get('calories', 0))),
                Decimal(str(actual_confidence)),  # Use actual confidence
                datetime.now()
            ))
            session_id = cursor.lastrowid
            
            print(f"✅ FIX 3a: Session created with confidence {actual_confidence}")
            
            # FIX 4: Save main food to foods table
            main_food_id = None
            if main_food.get('name'):
                print(f"🔍 Saving main food: {main_food.get('name')}")
                
                # Check if main food already exists
                cursor.execute("SELECT id FROM foods WHERE name = %s", (main_food.get('name'),))
                existing_main_food = cursor.fetchone()
                
                if existing_main_food:
                    main_food_id = existing_main_food['id']
                    print(f"     ✅ Found existing main food with ID: {main_food_id}")
                else:
                    # Create new main food entry
                    main_food_query = """
                    INSERT INTO foods (name, description, category_id, serving_size, serving_unit,
                                     calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
                                     fiber_per_100g, sugar_per_100g, sodium_per_100g, gemini_source, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    # Calculate per-100g nutrition from total
                    main_dish_portion = main_food.get('estimated_portion', 300)
                    per_100g_multiplier = 100.0 / main_dish_portion
                    
                    cursor.execute(main_food_query, (
                        main_food.get('name'),
                        main_food.get('description', ''),
                        None,  # category_id will be determined later
                        main_dish_portion,
                        main_food.get('portion_unit', 'grams'),
                        Decimal(str(round(total_nutrition.get('calories', 0) * per_100g_multiplier, 2))),
                        Decimal(str(round(total_nutrition.get('protein', 0) * per_100g_multiplier, 2))),
                        Decimal(str(round(total_nutrition.get('carbs', 0) * per_100g_multiplier, 2))),
                        Decimal(str(round(total_nutrition.get('fat', 0) * per_100g_multiplier, 2))),
                        Decimal(str(round(total_nutrition.get('fiber', 0) * per_100g_multiplier, 2))),
                        Decimal(str(round(total_nutrition.get('sugar', 0) * per_100g_multiplier, 2))),
                        Decimal(str(round(total_nutrition.get('sodium', 0) * per_100g_multiplier, 2))),
                        True,  # gemini_source
                        datetime.now(),
                        datetime.now()
                    ))
                    main_food_id = cursor.lastrowid
                    print(f"     ✅ Created new main food with ID: {main_food_id}")
            
            # FIX 5: CORRECTED - Save ingredients ONLY to detected_ingredients (NOT to foods table)
            # Ingredients should reference the main food_id, not create individual food entries
            detected_foods_response = []
            
            for ingredient in enriched_ingredients:
                ingredient_name = ingredient.get('name')
                
                # FIX: All ingredients reference the MAIN FOOD ID, not individual food entries
                # This eliminates redundancy - ingredients are NOT foods, they are components of the main food
                detected_ingredient_query = """
                INSERT INTO detected_ingredients (
                    session_id, food_id, ingredient_name, ingredient_category, estimated_portion, portion_unit, 
                    estimated_weight_grams, confidence_score, calories, protein, 
                    carbs, fat, fiber, sugar, sodium, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                nutrition = ingredient.get('nutrition', {})
                
                cursor.execute(detected_ingredient_query, (
                    session_id,
                    main_food_id,  # FIX: ALL ingredients reference the main food, not individual entries
                    ingredient_name,
                    ingredient.get('category'),  # Preserve original category from Gemini
                    Decimal(str(ingredient.get('estimated_portion', 100))),
                    ingredient.get('portion_unit', 'grams'),
                    Decimal(str(ingredient.get('estimated_portion', 100))),  # estimated_weight_grams
                    Decimal(str(ingredient.get('confidence', 0.8))),
                    Decimal(str(nutrition.get('calories', 0))),
                    Decimal(str(nutrition.get('protein', 0))),
                    Decimal(str(nutrition.get('carbs', 0))),
                    Decimal(str(nutrition.get('fat', 0))),
                    Decimal(str(nutrition.get('fiber', 0))),
                    Decimal(str(nutrition.get('sugar', 0))),
                    Decimal(str(nutrition.get('sodium', 0))),
                    datetime.now()
                ))
                
                detected_ingredient_id = cursor.lastrowid
                
                detected_foods_response.append({
                    'id': detected_ingredient_id,
                    'food_id': main_food_id,  # FIX: Reference main food ID
                    'name': ingredient_name,
                    'category': ingredient.get('category'),
                    'portion': ingredient.get('estimated_portion'),
                    'unit': ingredient.get('portion_unit', 'grams'),
                    'confidence': ingredient.get('confidence'),
                    'nutrition': nutrition,
                    'data_source': ingredient.get('data_source')
                })
            
            print(f"✅ FIX 5: Saved {len(detected_foods_response)} ingredients referencing main food ID {main_food_id}")
            
            # FIX 6: Update user preferences with detected foods
            try:
                cursor.execute("SELECT id, preferences FROM user_preferences WHERE user_id = %s", (user_id,))
                existing_prefs = cursor.fetchone()
                
                # Extract favorite foods from analysis (high confidence foods)
                favorite_foods = [food['name'] for food in detected_foods_response if food.get('confidence', 0) > 0.8]
                
                if existing_prefs:
                    # Update existing preferences
                    try:
                        current_prefs = json.loads(existing_prefs['preferences']) if isinstance(existing_prefs['preferences'], str) else existing_prefs['preferences']
                    except:
                        current_prefs = {}
                    
                    # Ensure structure exists
                    if 'diet' not in current_prefs:
                        current_prefs['diet'] = {}
                    if 'favorite_foods' not in current_prefs['diet']:
                        current_prefs['diet']['favorite_foods'] = []
                    
                    # Add new favorite foods
                    for food in favorite_foods:
                        if food not in current_prefs['diet']['favorite_foods']:
                            current_prefs['diet']['favorite_foods'].append(food)
                    
                    # Update timestamp
                    current_prefs['last_updated'] = datetime.now().isoformat()
                    
                    cursor.execute("""
                        UPDATE user_preferences 
                        SET preferences = %s, updated_at = %s
                        WHERE user_id = %s
                    """, (json.dumps(current_prefs), datetime.now(), user_id))
                    
                    print(f"✅ FIX 6: Updated user preferences with {len(favorite_foods)} favorite foods")
                else:
                    # Create default preferences
                    default_prefs = {
                        "diet": {
                            "favorite_foods": favorite_foods,
                            "dietary_restrictions": [],
                            "preferred_meal_times": {
                                "breakfast": "07:00",
                                "lunch": "12:00", 
                                "dinner": "19:00"
                            }
                        },
                        "goals": {
                            "daily_calories": 2000,
                            "weekly_weight": 0,
                            "macronutrient_distribution": {
                                "protein_percentage": 15,
                                "carbs_percentage": 50,
                                "fat_percentage": 35
                            }
                        },
                        "display": {
                            "nutrition_order": ["calories", "protein", "carbs", "fat", "fiber"],
                            "hide_detailed_nutrition": False
                        },
                        "general": {
                            "language": "en",
                            "units": "metric"
                        },
                        "notifications": {
                            "enabled": True,
                            "daily_reminder_time": "09:00"
                        },
                        "last_updated": datetime.now().isoformat()
                    }
                    
                    cursor.execute("""
                        INSERT INTO user_preferences (user_id, preferences, created_at, updated_at)
                        VALUES (%s, %s, %s, %s)
                    """, (user_id, json.dumps(default_prefs), datetime.now(), datetime.now()))
                    
                    print(f"✅ FIX 6: Created user preferences with {len(favorite_foods)} favorite foods")
            
            except Exception as pref_error:
                logging.warning(f"Failed to update user preferences: {pref_error}")
                # Don't fail the whole operation for preferences
            
            # FIX 7: Update or create daily nutrition summary
            today = datetime.now().date()
            
            cursor.execute("""
                SELECT id, total_calories, total_protein, total_carbs, total_fat, 
                       total_fiber, total_sugar, total_sodium, meal_count
                FROM daily_nutrition_summary 
                WHERE user_id = %s AND date = %s
            """, (user_id, today))
            existing_summary = cursor.fetchone()
            
            if existing_summary:
                # Update existing entry
                cursor.execute("""
                    UPDATE daily_nutrition_summary 
                    SET total_calories = total_calories + %s,
                        total_protein = total_protein + %s,
                        total_carbs = total_carbs + %s,
                        total_fat = total_fat + %s,
                        total_fiber = total_fiber + %s,
                        total_sugar = total_sugar + %s,
                        total_sodium = total_sodium + %s,
                        meal_count = meal_count + 1,
                        updated_at = %s
                    WHERE user_id = %s AND date = %s
                """, (
                    Decimal(str(total_nutrition.get('calories', 0))),
                    Decimal(str(total_nutrition.get('protein', 0))),
                    Decimal(str(total_nutrition.get('carbs', 0))),
                    Decimal(str(total_nutrition.get('fat', 0))),
                    Decimal(str(total_nutrition.get('fiber', 0))),
                    Decimal(str(total_nutrition.get('sugar', 0))),
                    Decimal(str(total_nutrition.get('sodium', 0))),
                    datetime.now(),
                    user_id, today
                ))
                print(f"✅ FIX 7: Updated daily nutrition summary")
            else:
                # Create new entry
                cursor.execute("""
                    INSERT INTO daily_nutrition_summary 
                    (user_id, date, total_calories, total_protein, total_carbs, total_fat,
                     total_fiber, total_sugar, total_sodium, meal_count, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id, today,
                    Decimal(str(total_nutrition.get('calories', 0))),
                    Decimal(str(total_nutrition.get('protein', 0))),
                    Decimal(str(total_nutrition.get('carbs', 0))),
                    Decimal(str(total_nutrition.get('fat', 0))),
                    Decimal(str(total_nutrition.get('fiber', 0))),
                    Decimal(str(total_nutrition.get('sugar', 0))),
                    Decimal(str(total_nutrition.get('sodium', 0))),
                    1,  # meal_count
                    datetime.now(), datetime.now()
                ))
                print(f"✅ FIX 7: Created daily nutrition summary")
            
            # FIX 8: Save to user_meals table - MISSING from previous code
            # Get meal_type_id based on meal_type string
            cursor.execute("SELECT id FROM meal_types WHERE name = %s", (meal_type.capitalize(),))
            meal_type_record = cursor.fetchone()
            meal_type_id = meal_type_record['id'] if meal_type_record else 2  # Default to lunch if not found
            
            # Insert into user_meals
            user_meal_query = """
            INSERT INTO user_meals (user_id, session_id, meal_type_id, meal_date, meal_time, notes, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            cursor.execute(user_meal_query, (
                user_id,
                session_id,
                meal_type_id,
                today,
                datetime.now(),
                notes,
                datetime.now()
            ))
            user_meal_id = cursor.lastrowid
            
            print(f"✅ FIX 8: Saved to user_meals table with ID {user_meal_id}")
            
            conn.commit()
            
            print(f"🎉 ALL FIXES APPLIED SUCCESSFULLY!")
            print(f"   Session ID: {session_id}")
            print(f"   User Meal ID: {user_meal_id}")
            print(f"   Confidence: {actual_confidence}")
            print(f"   Main Food ID: {main_food_id} ('{main_food.get('name')}')")
            print(f"   Ingredients: {len(detected_foods_response)} (all referencing main food)")
            print(f"   Total Nutrition: {total_nutrition}")
            
            # Return complete response with corrected structure
            return jsonify({
                'success': True,
                'session_id': session_id,
                'user_meal_id': user_meal_id,
                'analysis_result': {
                    'session_id': session_id,
                    'status': 'completed',
                    'detected_foods': detected_foods_response,
                    'main_food': {
                        'id': main_food_id,
                        'name': main_food.get('name'),
                        'description': main_food.get('description'),
                        'confidence': actual_confidence
                    },
                    'total_nutrition': total_nutrition,
                    'confidence': actual_confidence,  # Use actual confidence
                    'image_quality': analysis_result.get('image_quality', 'good'),
                    'additional_notes': analysis_result.get('additional_notes', ''),
                    'meal_type': meal_type,
                    'meal_date': today.isoformat(),
                    'analysis_time': datetime.now().isoformat(),
                    'database_structure_fixes': [
                        'main_food_only_in_foods_table',
                        'ingredients_reference_main_food_id', 
                        'no_redundant_ingredient_foods',
                        'user_meals_table_integration',
                        'proper_database_relationships'
                    ],
                    'fixes_applied': [
                        'confidence_preservation',
                        'nutrition_calculation', 
                        'main_food_saving',
                        'ingredient_categories',
                        'user_preferences_update',
                        'daily_summary_update',
                        'user_meals_integration'
                    ]
                }
            })
        
        except Exception as db_error:
            conn.rollback()
            logging.error(f"Database error: {db_error}")
            return jsonify({
                'error': 'Database operation failed',
                'details': str(db_error)
            }), 500
        finally:
            conn.close()
    
    except Exception as e:
        logging.error(f"Analysis error: {e}")
        return jsonify({
            'error': 'Food analysis failed',
            'details': str(e)
        }), 500

def secure_filename(filename):
    """Create secure filename"""
    import re
    filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    return filename

@food_analysis_bp.route('/session/<int:session_id>', methods=['GET'])
@jwt_required()
def get_analysis_result(session_id):
    """Get analysis result by session ID with main food info and ingredients"""
    try:
        user_id = get_jwt_identity()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get session details - Include main_food_id to match direct analysis
        cursor.execute("""
            SELECT fas.*, f.id as main_food_id, f.name as main_food_name, f.description as main_food_description
            FROM food_analysis_sessions fas
            LEFT JOIN detected_ingredients di ON fas.id = di.session_id
            LEFT JOIN foods f ON di.food_id = f.id
            WHERE fas.id = %s AND fas.user_id = %s
            LIMIT 1
        """, (session_id, user_id))
        session_data = cursor.fetchone()
        
        if not session_data:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Analysis session not found'}), 404
        
        # Get all detected ingredients for this session
        cursor.execute("""
            SELECT di.*, f.name as food_name
            FROM detected_ingredients di
            LEFT JOIN foods f ON di.food_id = f.id
            WHERE di.session_id = %s
            ORDER BY di.created_at
        """, (session_id,))
        ingredients = cursor.fetchall()
        
        # Get user meal info if exists
        cursor.execute("""
            SELECT um.*, mt.name as meal_type_name
            FROM user_meals um
            LEFT JOIN meal_types mt ON um.meal_type_id = mt.id
            WHERE um.session_id = %s
        """, (session_id,))
        meal_info = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format detected foods - MATCH structure with direct analysis
        detected_foods = []
        for ingredient in ingredients:
            detected_foods.append({
                'id': ingredient['id'],
                'food_id': ingredient['food_id'],  # ⭐ ADD food_id to match direct analysis
                'name': ingredient['ingredient_name'],
                'category': ingredient['ingredient_category'],
                'portion': float(ingredient['estimated_portion']) if ingredient['estimated_portion'] else 0,
                'unit': ingredient['portion_unit'],
                'confidence': float(ingredient['confidence_score']) if ingredient['confidence_score'] else 0,
                'nutrition': {
                    'calories': float(ingredient['calories']) if ingredient['calories'] else 0,
                    'protein': float(ingredient['protein']) if ingredient['protein'] else 0,
                    'carbs': float(ingredient['carbs']) if ingredient['carbs'] else 0,
                    'fat': float(ingredient['fat']) if ingredient['fat'] else 0,
                    'fiber': float(ingredient['fiber']) if ingredient['fiber'] else 0,
                    'sugar': float(ingredient['sugar']) if ingredient['sugar'] else 0,
                    'sodium': float(ingredient['sodium']) if ingredient['sodium'] else 0
                },
                'data_source': 'USDA'  # ⭐ ADD data_source to match direct analysis
            })
        
        # Calculate total nutrition
        total_nutrition = {
            'calories': sum(food['nutrition']['calories'] for food in detected_foods),
            'protein': sum(food['nutrition']['protein'] for food in detected_foods),
            'carbs': sum(food['nutrition']['carbs'] for food in detected_foods),
            'fat': sum(food['nutrition']['fat'] for food in detected_foods),
            'fiber': sum(food['nutrition']['fiber'] for food in detected_foods),
            'sugar': sum(food['nutrition']['sugar'] for food in detected_foods),
            'sodium': sum(food['nutrition']['sodium'] for food in detected_foods)
        }
        
        # Format response - MATCH structure with direct analysis
        analysis_result = {
            'session_id': session_id,
            'status': session_data['analysis_status'],
            'main_food': {
                'id': session_data['main_food_id'],  # ⭐ ADD id to match direct analysis
                'name': session_data['main_food_name'] or 'Unknown Dish',
                'description': session_data['main_food_description'] or 'No description available',
                'confidence': float(session_data['confidence_score']) if session_data['confidence_score'] else 0
            },
            'detected_foods': detected_foods,
            'total_nutrition': total_nutrition,
            'confidence': float(session_data['confidence_score']) if session_data['confidence_score'] else 0,  # ⭐ ADD confidence to match direct analysis
            'confidence_overall': float(session_data['confidence_score']) if session_data['confidence_score'] else 0,
            'image_filename': session_data['image_filename'],
            'total_estimated_calories': float(session_data['total_estimated_calories']) if session_data['total_estimated_calories'] else 0,
            'created_at': session_data['created_at'].isoformat() if session_data['created_at'] else None,
            'meal_type': meal_info['meal_type_name'] if meal_info else 'Unknown',
            'meal_date': meal_info['meal_date'].isoformat() if meal_info and meal_info['meal_date'] else None,
            'notes': meal_info['notes'] if meal_info else None
        }
        
        return jsonify({
            'success': True,
            'analysis_result': analysis_result
        }), 200
        
    except Exception as e:
        print(f"Get analysis result error: {e}")
        return jsonify({'error': 'Failed to get analysis result'}), 500
