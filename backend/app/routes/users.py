from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
import os
import json
from datetime import datetime

users_bp = Blueprint('users', __name__)

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

@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get user profile  
        cursor.execute("""
            SELECT id, username, email, full_name, date_of_birth, gender, 
                   height, weight, activity_level, daily_calorie_goal, created_at, updated_at
            FROM users 
            WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Get user preferences
        cursor.execute("""
            SELECT preferences FROM user_preferences 
            WHERE user_id = %s
        """, (user_id,))
        preferences_row = cursor.fetchone()
        
        # Convert JSON preferences to dictionary
        preferences = {}
        if preferences_row and preferences_row['preferences']:
            preferences = preferences_row['preferences']
            if isinstance(preferences, str):
                preferences = json.loads(preferences)
        else:
            # Create default preferences if none exist
            preferences = create_default_preferences(user_id, cursor, conn)
        
        # Get basic stats
        cursor.execute("""
            SELECT COUNT(*) as total_analyses
            FROM food_analysis_sessions 
            WHERE user_id = %s
        """, (user_id,))
        stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format dates
        if user['date_of_birth']:
            user['date_of_birth'] = user['date_of_birth'].isoformat()
        if user['created_at']:
            user['created_at'] = user['created_at'].isoformat()
        if user['updated_at']:
            user['updated_at'] = user['updated_at'].isoformat()
        
        return jsonify({
            'user': user,
            'preferences': preferences,
            'stats': stats
        }), 200
        
    except Exception as e:
        print(f"Get profile error: {e}")
        return jsonify({'error': 'Failed to get profile'}), 500

def create_default_preferences(user_id, cursor, conn):
    """Create default preferences for a user"""
    default_prefs = {
        'units': 'metric',
        'language': 'en',
        'theme': 'light',
        'notifications_enabled': True,
        'meal_reminders': True,
        'goal_tracking': True
    }
    
    try:
        cursor.execute("""
            INSERT INTO user_preferences (user_id, preferences, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                preferences = VALUES(preferences),
                updated_at = NOW()
        """, (user_id, json.dumps(default_prefs)))
        
        conn.commit()
        return default_prefs
        
    except Exception as e:
        print(f"Create default preferences error: {e}")
        return default_prefs

@users_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT preferences FROM user_preferences 
            WHERE user_id = %s
        """, (user_id,))
        preferences_row = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Convert to dictionary
        preferences = {}
        if preferences_row and preferences_row['preferences']:
            preferences = preferences_row['preferences']
            if isinstance(preferences, str):
                preferences = json.loads(preferences)
        
        return jsonify({'preferences': preferences}), 200
        
    except Exception as e:
        print(f"Get preferences error: {e}")
        return jsonify({'error': 'Failed to get preferences'}), 500

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Debug: Print received data
        print(f"Update profile data received: {data}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Prepare update fields
        update_fields = []
        update_values = []
        
        allowed_fields = [
            'full_name', 'date_of_birth', 'gender', 'height', 
            'weight', 'activity_level', 'daily_calorie_goal'
        ]
        
        for field in allowed_fields:
            if field in data:
                value = data[field]
                
                # FIX: Handle empty date_of_birth - convert empty string to NULL
                if field == 'date_of_birth':
                    if value == '' or value is None:
                        value = None
                    elif isinstance(value, str):
                        # Validate date format
                        try:
                            from datetime import datetime as dt
                            dt.strptime(value, '%Y-%m-%d')
                        except ValueError:
                            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
                
                # Handle gender field validation
                elif field == 'gender':
                    if value == '' or value is None:
                        value = None
                    elif value not in ['male', 'female', 'other']:
                        return jsonify({'error': 'Invalid gender value. Must be male, female, or other'}), 400
                
                # Handle activity_level field validation
                elif field == 'activity_level':
                    if value == '' or value is None:
                        value = None
                    elif value not in ['sedentary', 'light', 'moderate', 'active', 'very_active']:
                        return jsonify({'error': 'Invalid activity level'}), 400
                
                # Handle empty numeric fields
                elif field in ['height', 'weight', 'daily_calorie_goal']:
                    if value == '' or value is None:
                        value = None
                    else:
                        try:
                            value = float(value) if field in ['height', 'weight'] else int(value)
                        except (ValueError, TypeError):
                            return jsonify({'error': f'Invalid {field} value'}), 400
                
                update_fields.append(f"{field} = %s")
                update_values.append(value)
        
        if update_fields:
            update_fields.append("updated_at = %s")
            update_values.append(datetime.now())
            update_values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(query, update_values)
            conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500

@users_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No preferences data provided'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Insert/update preferences as JSON
        cursor.execute("""
            INSERT INTO user_preferences (user_id, preferences, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                preferences = VALUES(preferences),
                updated_at = NOW()
        """, (user_id, json.dumps(data)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Preferences updated successfully'}), 200
        
    except Exception as e:
        print(f"Update preferences error: {e}")
        return jsonify({'error': 'Failed to update preferences'}), 500
