from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import mysql.connector
import os
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

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

@dashboard_bp.route('/overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get today's date
        today = datetime.now().date()
        
        # Get today's nutrition summary
        cursor.execute("""
            SELECT * FROM daily_nutrition_summary 
            WHERE user_id = %s AND date = %s
        """, (user_id, today))
        today_nutrition = cursor.fetchone()
        
        # Get this week's average calories
        week_ago = today - timedelta(days=7)
        cursor.execute("""
            SELECT AVG(total_calories) as avg_calories 
            FROM daily_nutrition_summary 
            WHERE user_id = %s AND date BETWEEN %s AND %s
        """, (user_id, week_ago, today))
        week_avg = cursor.fetchone()
        
        # Get recent analysis sessions with enhanced food details using the requested query
        cursor.execute("""
            SELECT
                f.name AS food_name,
                f.description AS food_description,
                GROUP_CONCAT(DISTINCT di.ingredient_name) AS ingredients,
                fas.total_estimated_calories AS total_calories,
                fas.confidence_score,
                fas.id as session_id,
                fas.image_filename,
                fas.created_at
            FROM
                foods f
            JOIN
                detected_ingredients di ON f.id = di.food_id
            JOIN
                food_analysis_sessions fas ON di.session_id = fas.id
            WHERE
                fas.user_id = %s AND fas.analysis_status = 'completed'
            GROUP BY
                f.id, fas.id, fas.created_at
            ORDER BY
                fas.created_at DESC
            LIMIT 5
        """, (user_id,))
        recent_analyses = cursor.fetchall()
        
        # Get user goals
        cursor.execute("""
            SELECT daily_calorie_goal, activity_level 
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user_goals = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format recent analyses
        for analysis in recent_analyses:
            if analysis['created_at']:
                analysis['created_at'] = analysis['created_at'].isoformat()
        
        return jsonify({
            'today_nutrition': {
                'calories': today_nutrition['total_calories'] if today_nutrition else 0,
                'protein': today_nutrition['total_protein'] if today_nutrition else 0,
                'carbs': today_nutrition['total_carbs'] if today_nutrition else 0,
                'fat': today_nutrition['total_fat'] if today_nutrition else 0,
                'goal': user_goals['daily_calorie_goal'] if user_goals and user_goals['daily_calorie_goal'] else 2000
            },
            'week_average': {
                'calories': float(week_avg['avg_calories']) if week_avg and week_avg['avg_calories'] else 0
            },
            'recent_analyses': recent_analyses,
            'activity_level': user_goals['activity_level'] if user_goals and user_goals['activity_level'] else 'moderate'
        }), 200
        
    except Exception as e:
        print(f"Dashboard overview error: {e}")
        return jsonify({'error': 'Failed to get dashboard overview'}), 500

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get total analysis sessions (Total Analysis)
        cursor.execute("""
            SELECT COUNT(*) as total_analyses
            FROM food_analysis_sessions 
            WHERE user_id = %s AND analysis_status = 'completed'
        """, (user_id,))
        total_analyses_result = cursor.fetchone()
        total_analyses = total_analyses_result['total_analyses'] if total_analyses_result else 0
        
        # Get total calories (instead of average)
        cursor.execute("""
            SELECT SUM(total_calories) as total_calories
            FROM daily_nutrition_summary 
            WHERE user_id = %s
        """, (user_id,))
        total_calories_result = cursor.fetchone()
        total_calories = total_calories_result['total_calories'] if total_calories_result and total_calories_result['total_calories'] else 0
        
        # Get average calories per day for reference
        cursor.execute("""
            SELECT AVG(total_calories) as avg_calories_per_day
            FROM daily_nutrition_summary 
            WHERE user_id = %s AND total_calories > 0
        """, (user_id,))
        avg_calories_result = cursor.fetchone()
        avg_calories_per_day = avg_calories_result['avg_calories_per_day'] if avg_calories_result and avg_calories_result['avg_calories_per_day'] else 0
        
        # Get last analysis date (Last Analysis)
        cursor.execute("""
            SELECT created_at
            FROM food_analysis_sessions 
            WHERE user_id = %s AND analysis_status = 'completed'
            ORDER BY created_at DESC
            LIMIT 1
        """, (user_id,))
        last_analysis_result = cursor.fetchone()
        last_analysis_time = None
        if last_analysis_result and last_analysis_result['created_at']:
            last_analysis_time = last_analysis_result['created_at'].strftime('%Y-%m-%d %H:%M')
        
        # Get last 30 days nutrition data for history
        thirty_days_ago = datetime.now().date() - timedelta(days=30)
        cursor.execute("""
            SELECT date, total_calories, total_protein, total_carbs, total_fat
            FROM daily_nutrition_summary 
            WHERE user_id = %s AND date >= %s
            ORDER BY date
        """, (user_id, thirty_days_ago))
        nutrition_history = cursor.fetchall()
        
        # Get most analyzed ingredients
        cursor.execute("""
            SELECT ingredient_name, COUNT(*) as count
            FROM detected_ingredients di
            JOIN food_analysis_sessions fas ON di.session_id = fas.id
            WHERE fas.user_id = %s
            GROUP BY ingredient_name
            ORDER BY count DESC
            LIMIT 10
        """, (user_id,))
        top_foods = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Format nutrition history dates
        for entry in nutrition_history:
            if entry['date']:
                entry['date'] = entry['date'].isoformat()
        
        return jsonify({
            'total_analyses': total_analyses,
            'total_calories': float(total_calories),
            'avg_calories_per_day': float(avg_calories_per_day),
            'last_analysis_time': last_analysis_time,
            'nutrition_history': nutrition_history,
            'top_foods': top_foods
        }), 200
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({'error': 'Failed to get dashboard stats'}), 500

@dashboard_bp.route('/nutrition/daily', methods=['GET'])
@jwt_required()
def get_daily_nutrition():
    try:
        user_id = int(get_jwt_identity())
        
        # Get date parameter from query string, default to today
        date_str = request.args.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        else:
            target_date = datetime.now().date()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get daily nutrition summary
        cursor.execute("""
            SELECT * FROM daily_nutrition_summary 
            WHERE user_id = %s AND date = %s
        """, (user_id, target_date))
        daily_nutrition = cursor.fetchone()
        
        # Get meals for this date
        cursor.execute("""
            SELECT um.id, um.meal_date, um.meal_time, um.notes,
                   mt.name as meal_type,
                   fas.total_estimated_calories, fas.confidence_score,
                   fas.image_filename
            FROM user_meals um
            JOIN meal_types mt ON um.meal_type_id = mt.id
            JOIN food_analysis_sessions fas ON um.session_id = fas.id
            WHERE um.user_id = %s AND um.meal_date = %s
            ORDER BY um.meal_time
        """, (user_id, target_date))
        meals = cursor.fetchall()
        
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
            if meal['meal_time']:
                meal['meal_time'] = meal['meal_time'].isoformat()
        
        response_data = {
            'date': target_date.isoformat(),
            'nutrition_summary': daily_nutrition if daily_nutrition else {
                'total_calories': 0,
                'total_protein': 0,
                'total_carbs': 0,
                'total_fat': 0,
                'total_fiber': 0,
                'total_sugar': 0,
                'total_sodium': 0,
                'meal_count': 0
            },
            'meals': meals,
            'goals': {
                'calories': user_goals['daily_calorie_goal'] if user_goals and user_goals['daily_calorie_goal'] else 2000,
                'activity_level': user_goals['activity_level'] if user_goals and user_goals['activity_level'] else 'moderate'
            }
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Get daily nutrition error: {e}")
        return jsonify({'error': 'Failed to get daily nutrition data'}), 500

@dashboard_bp.route('/nutrition/weekly', methods=['GET'])
@jwt_required() 
def get_weekly_nutrition():
    try:
        user_id = int(get_jwt_identity())
        
        # Get last 7 days
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get weekly nutrition data
        cursor.execute("""
            SELECT date, total_calories, total_protein, total_carbs, total_fat,
                   total_fiber, total_sugar, total_sodium, meal_count
            FROM daily_nutrition_summary 
            WHERE user_id = %s AND date BETWEEN %s AND %s
            ORDER BY date DESC
        """, (user_id, week_ago, today))
        weekly_data = cursor.fetchall()
        
        # Get weekly averages
        cursor.execute("""
            SELECT 
                AVG(total_calories) as avg_calories,
                AVG(total_protein) as avg_protein,
                AVG(total_carbs) as avg_carbs,
                AVG(total_fat) as avg_fat,
                AVG(meal_count) as avg_meals
            FROM daily_nutrition_summary 
            WHERE user_id = %s AND date BETWEEN %s AND %s
        """, (user_id, week_ago, today))
        averages = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format dates
        for entry in weekly_data:
            if entry['date']:
                entry['date'] = entry['date'].isoformat()
        
        return jsonify({
            'weekly_data': weekly_data,
            'averages': averages,
            'period': {
                'start': week_ago.isoformat(),
                'end': today.isoformat()
            }
        }), 200
        
    except Exception as e:
        print(f"Get weekly nutrition error: {e}")
        return jsonify({'error': 'Failed to get weekly nutrition data'}), 500
