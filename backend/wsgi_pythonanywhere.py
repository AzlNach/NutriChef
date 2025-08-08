import sys
import os

# Add your project directory to the sys.path
path = '/home/azelnach/NutriChef/backend'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment to production
os.environ['FLASK_ENV'] = 'production'
os.environ['FLASK_DEBUG'] = 'False'

# Import your Flask application
from app import app as application

if __name__ == "__main__":
    application.run()
