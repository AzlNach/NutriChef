#!/usr/bin/python3.10

"""
WSGI configuration for FoodVision backend on PythonAnywhere
"""

import sys
import os

# Add your project directory to sys.path
project_home = '/home/yourusername/FoodVision'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

# Add backend directory to sys.path
backend_path = os.path.join(project_home, 'backend')
if backend_path not in sys.path:
    sys.path = [backend_path] + sys.path

# Set environment variables
os.environ['FLASK_ENV'] = 'production'

# Import your Flask application
from app import create_app

# Create the application
application = create_app('production')

if __name__ == "__main__":
    application.run()
