from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import mysql.connector
import os

auth_bp = Blueprint('auth', __name__)

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

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(k in data for k in ('username', 'email', 'password')):
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        
        # Basic validation
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        if '@' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Hash password
        password_hash = generate_password_hash(password)
        
        # Insert new user
        insert_query = """
        INSERT INTO users (username, email, password_hash, created_at) 
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (username, email, password_hash, datetime.now()))
        user_id = cursor.lastrowid
        conn.commit()
        
        # Get the created user
        cursor.execute("SELECT id, username, email, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Create access token
        access_token = create_access_token(
            identity=str(user_id),
            expires_delta=timedelta(days=7)
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            }
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(k in data for k in ('username', 'password')):
            return jsonify({'error': 'Username and password are required'}), 400
        
        username = data['username'].strip()
        password = data['password']
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Find user by username or email
        cursor.execute("""
            SELECT id, username, email, password_hash, created_at 
            FROM users 
            WHERE username = %s OR email = %s
        """, (username, username))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Verify user exists and password is correct
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Create access token
        access_token = create_access_token(
            identity=str(user['id']),
            expires_delta=timedelta(days=7)
        )
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        # In a production app, you might want to blacklist the token
        # For now, we'll just return success (client will remove token)
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, username, email, full_name, date_of_birth, gender, 
                   height, weight, activity_level, daily_calorie_goal, created_at, updated_at
            FROM users WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Convert date fields to strings
        if user['date_of_birth']:
            user['date_of_birth'] = user['date_of_birth'].isoformat()
        if user['created_at']:
            user['created_at'] = user['created_at'].isoformat()
        if user['updated_at']:
            user['updated_at'] = user['updated_at'].isoformat()
        
        return jsonify({'user': user}), 200
        
    except Exception as e:
        print(f"Profile error: {e}")
        return jsonify({'error': 'Failed to get profile'}), 500

@auth_bp.route('/profile', methods=['PUT'])
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
            conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500

@auth_bp.route('/user-info', methods=['GET'])
@jwt_required()
def get_user_info():
    """Get complete user information for profile page"""
    try:
        user_id = int(get_jwt_identity())
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get user profile data
            cursor.execute("""
                SELECT 
                    id, username, email, full_name, 
                    date_of_birth, gender, height, weight, 
                    activity_level, daily_calorie_goal,
                    created_at, updated_at
                FROM users 
                WHERE id = %s
            """, (user_id,))
            
            user = cursor.fetchone()
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Get user statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_analyses,
                    COUNT(DISTINCT DATE(created_at)) as active_days
                FROM food_analysis_sessions 
                WHERE user_id = %s
            """, (user_id,))
            
            stats = cursor.fetchone()
            
            # Get recent activity
            cursor.execute("""
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as analyses_count
                FROM food_analysis_sessions 
                WHERE user_id = %s 
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 10
            """, (user_id,))
            
            recent_activity = cursor.fetchall()
            
            # Remove password-related fields and format response
            user_info = {
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'date_of_birth': user['date_of_birth'].isoformat() if user['date_of_birth'] else None,
                    'gender': user['gender'],
                    'height': user['height'],
                    'weight': user['weight'],
                    'activity_level': user['activity_level'],
                    'daily_calorie_goal': user['daily_calorie_goal'],
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                    'updated_at': user['updated_at'].isoformat() if user['updated_at'] else None
                },
                'statistics': {
                    'total_analyses': stats['total_analyses'] if stats else 0,
                    'active_days': stats['active_days'] if stats else 0
                },
                'recent_activity': recent_activity or []
            }
            
            return jsonify(user_info), 200
            
        finally:
            cursor.close()
            conn.close()
        
    except Exception as e:
        print(f"Get user info error: {e}")
        return jsonify({'error': 'Failed to get user information'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required()
def refresh():
    try:
        user_id = int(get_jwt_identity())
        access_token = create_access_token(
            identity=str(user_id),
            expires_delta=timedelta(days=7)
        )
        return jsonify({'access_token': access_token}), 200
    except Exception as e:
        print(f"Refresh error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500
