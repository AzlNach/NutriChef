
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
import mysql.connector

# Load environment variables
load_dotenv()

# Initialize extensions
jwt = JWTManager()

def test_db_connection():
    """Test database connection"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'foodvision_db'),
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            connection.close()
            return True
    except mysql.connector.Error as e:
        print(f"Database connection test failed: {e}")
        return False
    return False

def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-foodvision-2024')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-foodvision-2024')
    app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16777216))
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
    
    # Initialize JWT with app
    jwt.init_app(app)
    
    # CORS configuration - Allow all origins for development
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Create upload directory if it doesn't exist
    upload_path = os.path.join(os.getcwd(), app.config['UPLOAD_FOLDER'])
    os.makedirs(upload_path, exist_ok=True)
    
    # Import and register blueprints
    try:
        from app.routes.auth import auth_bp
        from app.routes.food_analysis import food_analysis_bp
        from app.routes.nutrition import nutrition_bp
        from app.routes.users import users_bp
        from app.routes.dashboard import dashboard_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(food_analysis_bp, url_prefix='/api/food')
        app.register_blueprint(nutrition_bp, url_prefix='/api/nutrition')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    except ImportError as e:
        print(f"Warning: Could not import routes: {e}")
    
    # Health check route
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'FoodVision API', 'version': '1.0.0'}
    
    # Test database route
    @app.route('/test-db')
    def test_db():
        try:
            # Test database connection using mysql.connector
            connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', ''),
                database=os.getenv('DB_NAME', 'foodvision_db'),
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci'
            )
            if connection.is_connected():
                cursor = connection.cursor()
                cursor.execute("SELECT 1 as test")
                result = cursor.fetchone()
                cursor.close()
                connection.close()
                return {'status': 'success', 'message': 'Database connection successful', 'result': result}
            else:
                return {'status': 'error', 'message': 'Database connection failed'}, 500
        except Exception as e:
            return {'status': 'error', 'message': f'Database connection failed: {str(e)}'}, 500
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Endpoint not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
