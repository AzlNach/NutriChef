from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import mysql.connector
import os
from datetime import datetime, timedelta

nutrition_bp = Blueprint('nutrition', __name__)

def get_db_connection():
    """Get database connection"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'foodvision_db'),
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Database connection error: {e}")
        return None

@nutrition_bp.route('/history', methods=['GET'])
@jwt_required()
def get_nutrition_history():
    try:
        user_id = int(get_jwt_identity())
        
        # Get query parameters
        days = request.args.get('days', default=30, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        if start_date and end_date:
            # Use provided date range
            cursor.execute("""
                SELECT date, total_calories, total_protein, total_carbs, total_fat,
                       total_fiber, total_sugar, total_sodium, created_at
                FROM daily_nutrition_summary 
                WHERE user_id = %s AND date BETWEEN %s AND %s
                ORDER BY date DESC
            """, (user_id, start_date, end_date))
        else:
            # Use days parameter
            start_date = datetime.now().date() - timedelta(days=days)
            cursor.execute("""
                SELECT date, total_calories, total_protein, total_carbs, total_fat,
                       total_fiber, total_sugar, total_sodium, created_at
                FROM daily_nutrition_summary 
                WHERE user_id = %s AND date >= %s
                ORDER BY date DESC
            """, (user_id, start_date))
        
        nutrition_history = cursor.fetchall()
        
        # Get user's daily goals for context
        cursor.execute("""
            SELECT daily_calorie_goal, activity_level
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user_goals = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format dates
        for entry in nutrition_history:
            if entry['date']:
                entry['date'] = entry['date'].isoformat()
            if entry['created_at']:
                entry['created_at'] = entry['created_at'].isoformat()
        
        return jsonify({
            'nutrition_history': nutrition_history,
            'user_goals': user_goals,
            'summary': {
                'total_days': len(nutrition_history),
                'avg_calories': sum(entry['total_calories'] for entry in nutrition_history) / len(nutrition_history) if nutrition_history else 0
            }
        }), 200
        
    except Exception as e:
        print(f"Nutrition history error: {e}")
        return jsonify({'error': 'Failed to get nutrition history'}), 500

@nutrition_bp.route('/daily-summary', methods=['GET'])
@jwt_required()
def get_daily_summary():
    try:
        user_id = int(get_jwt_identity())
        
        # Get date parameter (default to today)
        date_str = request.args.get('date', datetime.now().date().isoformat())
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get daily summary
        cursor.execute("""
            SELECT * FROM daily_nutrition_summary 
            WHERE user_id = %s AND date = %s
        """, (user_id, target_date))
        daily_summary = cursor.fetchone()
        
        # If no summary exists for today, create one by aggregating user's meals
        if not daily_summary:
            daily_summary = create_daily_summary_for_date(user_id, target_date, cursor, conn)
        
        # Get all meals for this date
        cursor.execute("""
            SELECT um.*, mt.name as meal_type_name, mt.description as meal_type_description
            FROM user_meals um
            JOIN meal_types mt ON um.meal_type_id = mt.id
            WHERE um.user_id = %s AND DATE(um.meal_date) = %s
            ORDER BY um.meal_date
        """, (user_id, target_date))
        meals = cursor.fetchall()
        
        # Get detailed food analysis for this date
        cursor.execute("""
            SELECT fas.id as session_id, fas.image_filename, fas.total_estimated_calories,
                   fas.confidence_score, fas.created_at, f.name as food_name,
                   di.ingredient_name, di.estimated_portion, di.portion_unit,
                   di.calories, di.protein, di.carbs, di.fat
            FROM food_analysis_sessions fas
            LEFT JOIN detected_ingredients di ON fas.id = di.session_id
            LEFT JOIN foods f ON di.food_id = f.id
            WHERE fas.user_id = %s AND DATE(fas.created_at) = %s
            ORDER BY fas.created_at DESC
        """, (user_id, target_date))
        food_analyses = cursor.fetchall()
        
        # Get user goals
        cursor.execute("""
            SELECT daily_calorie_goal, activity_level
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user_goals = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format dates
        for meal in meals:
            if meal['meal_date']:
                meal['meal_date'] = meal['meal_date'].isoformat()
            if meal['created_at']:
                meal['created_at'] = meal['created_at'].isoformat()
        
        for analysis in food_analyses:
            if analysis['created_at']:
                analysis['created_at'] = analysis['created_at'].isoformat()
        
        if daily_summary and daily_summary.get('created_at'):
            daily_summary['created_at'] = daily_summary['created_at'].isoformat()
        
        return jsonify({
            'date': target_date.isoformat(),
            'daily_summary': daily_summary,
            'meals': meals,
            'food_analyses': food_analyses,
            'user_goals': user_goals,
            'progress': {
                'calories_percentage': (daily_summary['total_calories'] / user_goals['daily_calorie_goal'] * 100) if daily_summary and user_goals and user_goals['daily_calorie_goal'] else 0
            }
        }), 200
        
    except Exception as e:
        print(f"Daily summary error: {e}")
        return jsonify({'error': 'Failed to get daily summary'}), 500

def create_daily_summary_for_date(user_id, target_date, cursor, conn):
    """Create daily summary by aggregating nutrition data for a specific date"""
    try:
        # Get all detected foods for this date
        cursor.execute("""
            SELECT SUM(df.calories) as total_calories,
                   SUM(df.protein) as total_protein,
                   SUM(df.carbs) as total_carbs,
                   SUM(df.fat) as total_fat,
                   SUM(df.fiber) as total_fiber,
                   SUM(df.sugar) as total_sugar,
                   SUM(df.sodium) as total_sodium,
                   COUNT(DISTINCT fas.id) as meal_count
            FROM food_analysis_sessions fas
            JOIN detected_ingredients df ON fas.id = df.session_id
            WHERE fas.user_id = %s AND DATE(fas.created_at) = %s
        """, (user_id, target_date))
        
        totals = cursor.fetchone()
        
        if totals and totals['total_calories']:
            # Create the daily summary entry
            cursor.execute("""
                INSERT INTO daily_nutrition_summary 
                (user_id, date, total_calories, total_protein, total_carbs, total_fat,
                 total_fiber, total_sugar, total_sodium, meal_count, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, target_date,
                totals['total_calories'] or 0,
                totals['total_protein'] or 0,
                totals['total_carbs'] or 0,
                totals['total_fat'] or 0,
                totals['total_fiber'] or 0,
                totals['total_sugar'] or 0,
                totals['total_sodium'] or 0,
                totals['meal_count'] or 0,
                datetime.now()
            ))
            
            conn.commit()
            
            # Return the created summary
            return {
                'user_id': user_id,
                'date': target_date,
                'total_calories': totals['total_calories'] or 0,
                'total_protein': totals['total_protein'] or 0,
                'total_carbs': totals['total_carbs'] or 0,
                'total_fat': totals['total_fat'] or 0,
                'total_fiber': totals['total_fiber'] or 0,
                'total_sugar': totals['total_sugar'] or 0,
                'total_sodium': totals['total_sodium'] or 0,
                'meal_count': totals['meal_count'] or 0,
                'created_at': datetime.now()
            }
        else:
            # No data for this date
            return {
                'user_id': user_id,
                'date': target_date,
                'total_calories': 0,
                'total_protein': 0,
                'total_carbs': 0,
                'total_fat': 0,
                'total_fiber': 0,
                'total_sugar': 0,
                'total_sodium': 0,
                'meal_count': 0,
                'created_at': datetime.now()
            }
            
    except Exception as e:
        print(f"Error creating daily summary: {e}")
        return None

@nutrition_bp.route('/goals', methods=['GET'])
@jwt_required()
def get_nutrition_goals():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get user profile and calculated goals
        cursor.execute("""
            SELECT height, weight, age, gender, activity_level, daily_calorie_goal
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user_profile = cursor.fetchone()
        
        # Get user preferences
        cursor.execute("""
            SELECT preference_key, preference_value FROM user_preferences 
            WHERE user_id = %s
        """, (user_id,))
        preferences_rows = cursor.fetchall()
        
        # Convert to dictionary
        preferences = {}
        for pref in preferences_rows:
            preferences[pref['preference_key']] = pref['preference_value']
        
        cursor.close()
        conn.close()
        
        # Calculate recommended goals based on profile
        if user_profile:
            # Basic BMR calculation (Mifflin-St Jeor Equation)
            # This is a simplified calculation
            bmr = 1500  # Default fallback
            if user_profile['weight'] and user_profile['height']:
                if user_profile['gender'] == 'male':
                    bmr = (10 * user_profile['weight']) + (6.25 * user_profile['height']) - (5 * (user_profile['age'] or 30)) + 5
                else:
                    bmr = (10 * user_profile['weight']) + (6.25 * user_profile['height']) - (5 * (user_profile['age'] or 30)) - 161
            
            # Activity multiplier
            activity_multipliers = {
                'sedentary': 1.2,
                'light': 1.375,
                'moderate': 1.55,
                'active': 1.725,
                'very_active': 1.9
            }
            
            activity_level = user_profile['activity_level'] or 'moderate'
            recommended_calories = int(bmr * activity_multipliers.get(activity_level, 1.55))
            
            # Macro recommendations (as percentages of calories)
            recommended_protein = int(recommended_calories * 0.15 / 4)  # 15% protein
            recommended_carbs = int(recommended_calories * 0.55 / 4)    # 55% carbs
            recommended_fat = int(recommended_calories * 0.30 / 9)      # 30% fat
        else:
            recommended_calories = 2000
            recommended_protein = 75
            recommended_carbs = 275
            recommended_fat = 67
        
        return jsonify({
            'current_goals': {
                'calories': user_profile['daily_calorie_goal'] if user_profile else recommended_calories,
                'protein': int(preferences.get('protein_goal', recommended_protein)) if preferences.get('protein_goal') else recommended_protein,
                'carbs': int(preferences.get('carbs_goal', recommended_carbs)) if preferences.get('carbs_goal') else recommended_carbs,
                'fat': int(preferences.get('fat_goal', recommended_fat)) if preferences.get('fat_goal') else recommended_fat
            },
            'recommended_goals': {
                'calories': recommended_calories,
                'protein': recommended_protein,
                'carbs': recommended_carbs,
                'fat': recommended_fat
            },
            'user_profile': user_profile,
            'preferences': preferences
        }), 200
        
    except Exception as e:
        print(f"Nutrition goals error: {e}")
        return jsonify({'error': 'Failed to get nutrition goals'}), 500

@nutrition_bp.route('/goals', methods=['PUT'])
@jwt_required()
def update_nutrition_goals():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Update daily calorie goal in users table
        if 'calories' in data:
            cursor.execute("""
                UPDATE users SET daily_calorie_goal = %s WHERE id = %s
            """, (data['calories'], user_id))
        
        # Update or insert user preferences using key-value structure
        preference_updates = [
            ('protein_goal', data.get('protein')),
            ('carbs_goal', data.get('carbs')),
            ('fat_goal', data.get('fat')),
            ('fiber_goal', data.get('fiber'))
        ]
        
        # Delete existing preferences for these keys
        keys_to_update = [key for key, value in preference_updates if value is not None]
        if keys_to_update:
            placeholders = ', '.join(['%s'] * len(keys_to_update))
            cursor.execute(f"""
                DELETE FROM user_preferences 
                WHERE user_id = %s AND preference_key IN ({placeholders})
            """, [user_id] + keys_to_update)
            
            # Insert new preferences
            for key, value in preference_updates:
                if value is not None:
                    cursor.execute("""
                        INSERT INTO user_preferences (user_id, preference_key, preference_value, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, key, str(value), datetime.now(), datetime.now()))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Nutrition goals updated successfully'}), 200
        
    except Exception as e:
        print(f"Update nutrition goals error: {e}")
        return jsonify({'error': 'Failed to update nutrition goals'}), 500

@nutrition_bp.route('/ingredients-count/<date>', methods=['GET'])
@jwt_required()
def get_ingredients_count_by_date(date):
    """Get total ingredient count for all food analysis sessions on a specific date"""
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get all sessions for the specified date
        cursor.execute("""
            SELECT fas.id as session_id
            FROM food_analysis_sessions fas
            WHERE fas.user_id = %s 
            AND DATE(fas.created_at) = %s
            AND fas.analysis_status = 'completed'
        """, (user_id, date))
        
        sessions = cursor.fetchall()
        
        if not sessions:
            cursor.close()
            conn.close()
            return jsonify({'count': 0, 'sessions': 0}), 200
        
        # Count all detected ingredients for these sessions
        session_ids = [session['session_id'] for session in sessions]
        placeholders = ','.join(['%s'] * len(session_ids))
        
        cursor.execute(f"""
            SELECT COUNT(*) as total_ingredients
            FROM detected_ingredients di
            WHERE di.session_id IN ({placeholders})
        """, session_ids)
        
        result = cursor.fetchone()
        total_ingredients = result['total_ingredients'] if result else 0
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'count': total_ingredients,
            'sessions': len(sessions),
            'date': date
        }), 200
        
    except Exception as e:
        print(f"Get ingredients count error: {e}")
        return jsonify({'error': 'Failed to get ingredients count', 'count': 1}), 500
