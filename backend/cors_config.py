"""
Alternative CORS configuration if the main approach doesn't work
"""

from flask import Flask, request, make_response
from flask_cors import CORS, cross_origin
import functools

def setup_cors(app):
    """Setup comprehensive CORS configuration"""
    
    # Basic CORS setup
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
         allow_headers=[
             'Content-Type', 
             'Authorization', 
             'Access-Control-Allow-Credentials',
             'Access-Control-Allow-Origin',
             'Access-Control-Allow-Headers',
             'Access-Control-Allow-Methods'
         ],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)

    @app.after_request
    def after_request(response):
        """Add CORS headers to all responses"""
        origin = request.headers.get('Origin')
        if origin in ['http://localhost:3000', 'http://127.0.0.1:3000']:
            response.headers.add('Access-Control-Allow-Origin', origin)
        else:
            response.headers.add('Access-Control-Allow-Origin', '*')
        
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    @app.before_request
    def handle_preflight():
        """Handle preflight OPTIONS requests"""
        if request.method == "OPTIONS":
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "*")
            response.headers.add('Access-Control-Allow-Methods', "*")
            return response

def cors_enabled(f):
    """Decorator to enable CORS for specific routes"""
    @functools.wraps(f)
    @cross_origin(origins=['http://localhost:3000'])
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function
