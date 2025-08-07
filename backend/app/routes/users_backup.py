from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
import os
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
            import json
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
            WHERE user_id = %s AND status = 'completed'
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
    import json
    
    default_prefs = {
        'units': 'metric',  # metric or imperial
        'language': 'en',
        'theme': 'light',
        'notifications_enabled': True,
        'meal_reminders': True,
        'goal_tracking': True
    }
    
    try:
        # Insert default preferences as JSON
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

@users_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Define allowed fields
        allowed_fields = ['full_name', 'date_of_birth', 'gender', 'height', 'weight', 'activity_level', 'daily_calorie_goal']
        update_fields = []
        update_values = []
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if update_fields:
            update_fields.append("updated_at = %s")
            update_values.append(datetime.now())
            update_values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(query, update_values)
        
        # Update preferences if provided
        if 'preferences' in data:
            import json
            prefs = data['preferences']
            
            # Update preferences as JSON
            cursor.execute("""
                INSERT INTO user_preferences (user_id, preferences, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    preferences = VALUES(preferences),
                    updated_at = NOW()
            """, (user_id, json.dumps(prefs)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500
    except Exception as e:
        print(f"Error creating default preferences: {e}")
        return {}

@users_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
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
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])
        
        if update_fields:
            update_fields.append("updated_at = %s")
            update_values.append(datetime.now())
            update_values.append(user_id)
            
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
            cursor.execute(query, update_values)
        
        # Update preferences if provided
        if 'preferences' in data:
            prefs = data['preferences']
            
            # Delete existing preferences for this user
            cursor.execute("DELETE FROM user_preferences WHERE user_id = %s", (user_id,))
            
            # Insert new preferences
            for key, value in prefs.items():
                if value is not None:  # Only insert non-null values
                    cursor.execute("""
                        INSERT INTO user_preferences (user_id, preference_key, preference_value, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (user_id, key, str(value), datetime.now(), datetime.now()))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500

@users_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or not all(k in data for k in ('current_password', 'new_password')):
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        current_password = data['current_password']
        new_password = data['new_password']
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get current password hash
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password_hash'], current_password):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Update password
        new_password_hash = generate_password_hash(new_password)
        cursor.execute("""
            UPDATE users SET password_hash = %s, updated_at = %s WHERE id = %s
        """, (new_password_hash, datetime.now(), user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        print(f"Change password error: {e}")
        return jsonify({'error': 'Failed to change password'}), 500

@users_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'password' not in data:
            return jsonify({'error': 'Password confirmation required'}), 400
        
        password = data['password']
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verify password
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password_hash'], password):
            cursor.close()
            conn.close()
            return jsonify({'error': 'Incorrect password'}), 401
        
        # Delete user (cascade will handle related records)
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Account deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete account error: {e}")
        return jsonify({'error': 'Failed to delete account'}), 500

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
            import json
            preferences = preferences_row['preferences']
            if isinstance(preferences, str):
                preferences = json.loads(preferences)
        
        return jsonify({'preferences': preferences}), 200
        
    except Exception as e:
        print(f"Get preferences error: {e}")
        return jsonify({'error': 'Failed to get preferences'}), 500

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
        
        import json
        
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

def create_default_user_preferences(user_id):
    """Create default user preferences when user first registers"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
        default_preferences = {
            'theme': 'light',
            'notifications_enabled': 'true',
            'meal_reminders': 'true',
            'goal_tracking': 'true',
            'units': 'metric',
            'language': 'en'
        }
        
        for key, value in default_preferences.items():
            cursor.execute("""
                INSERT IGNORE INTO user_preferences (user_id, preference_key, preference_value, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, key, value, datetime.now(), datetime.now()))
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Create default preferences error: {e}")
        return False

@users_bp.route('/initialize', methods=['POST'])
@jwt_required()
def initialize_user_data():
    """Initialize user data setelah first login - preferences, goals, etc"""
    try:
        user_id = int(get_jwt_identity())
        
        # Create default preferences if not exist
        create_default_user_preferences(user_id)
        
        # Check if user has calorie goal, if not set default
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT daily_calorie_goal FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user['daily_calorie_goal']:
            # Set default calorie goal based on basic calculation
            cursor.execute("""
                UPDATE users 
                SET daily_calorie_goal = %s, updated_at = %s 
                WHERE id = %s
            """, (2000, datetime.now(), user_id))  # Default 2000 calories
            conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'User data initialized successfully'}), 200
        
    except Exception as e:
        print(f"Initialize user data error: {e}")
        return jsonify({'error': 'Failed to initialize user data'}), 500
