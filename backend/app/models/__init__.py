# Database Models for FoodVision
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100))
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.Enum('male', 'female', 'other', name='gender_enum'))
    height = db.Column(db.Decimal(5, 2))  # in cm
    weight = db.Column(db.Decimal(5, 2))  # in kg
    activity_level = db.Column(db.Enum('sedentary', 'light', 'moderate', 'active', 'very_active', name='activity_enum'))
    daily_calorie_goal = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    analysis_sessions = db.relationship('FoodAnalysisSession', backref='user', lazy=True, cascade='all, delete-orphan')
    daily_summaries = db.relationship('DailyNutritionSummary', backref='user', lazy=True, cascade='all, delete-orphan')
    meals = db.relationship('UserMeal', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'height': float(self.height) if self.height else None,
            'weight': float(self.weight) if self.weight else None,
            'activity_level': self.activity_level,
            'daily_calorie_goal': self.daily_calorie_goal,
            'created_at': self.created_at.isoformat()
        }

class FoodCategory(db.Model):
    __tablename__ = 'food_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    foods = db.relationship('Food', backref='category', lazy=True)

class Food(db.Model):
    __tablename__ = 'foods'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)  # Nama makanan dari Gemini
    description = db.Column(db.Text)  # Deskripsi untuk kategori matching
    category_id = db.Column(db.Integer, db.ForeignKey('food_categories.id'))
    serving_size = db.Column(db.Decimal(8, 2))
    serving_unit = db.Column(db.String(50))
    # Nutrisi total dari akumulasi ingredients
    calories_per_100g = db.Column(db.Decimal(8, 2))
    protein_per_100g = db.Column(db.Decimal(8, 2))
    carbs_per_100g = db.Column(db.Decimal(8, 2))
    fat_per_100g = db.Column(db.Decimal(8, 2))
    fiber_per_100g = db.Column(db.Decimal(8, 2))
    sugar_per_100g = db.Column(db.Decimal(8, 2))
    sodium_per_100g = db.Column(db.Decimal(8, 2))
    gemini_source = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FoodAnalysisSession(db.Model):
    __tablename__ = 'food_analysis_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    image_path = db.Column(db.String(500))
    image_filename = db.Column(db.String(255))
    gemini_analysis_raw = db.Column(db.Text)
    analysis_status = db.Column(db.Enum('pending', 'processing', 'completed', 'failed', name='analysis_status_enum'), default='pending')
    total_estimated_calories = db.Column(db.Decimal(8, 2))
    confidence_score = db.Column(db.Decimal(3, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    detected_ingredients = db.relationship('DetectedIngredient', backref='session', lazy=True, cascade='all, delete-orphan')
    meals = db.relationship('UserMeal', backref='session', lazy=True)

class DetectedIngredient(db.Model):
    __tablename__ = 'detected_ingredients'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('food_analysis_sessions.id'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.id'), nullable=False)
    ingredient_name = db.Column(db.String(200), nullable=False)  # Nama bahan
    ingredient_category = db.Column(db.String(100))  # Kategori bahan
    estimated_portion = db.Column(db.Decimal(8, 2))
    portion_unit = db.Column(db.String(50))
    estimated_weight_grams = db.Column(db.Decimal(8, 2))
    confidence_score = db.Column(db.Decimal(3, 2))
    manual_override = db.Column(db.Boolean, default=False)
    # Calculated nutrition values untuk bahan ini
    calories = db.Column(db.Decimal(8, 2))
    protein = db.Column(db.Decimal(8, 2))
    carbs = db.Column(db.Decimal(8, 2))
    fat = db.Column(db.Decimal(8, 2))
    fiber = db.Column(db.Decimal(8, 2))
    sugar = db.Column(db.Decimal(8, 2))
    sodium = db.Column(db.Decimal(8, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MealType(db.Model):
    __tablename__ = 'meal_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(100))
    typical_time_start = db.Column(db.Time)
    typical_time_end = db.Column(db.Time)
    
    # Relationships
    meals = db.relationship('UserMeal', backref='meal_type', lazy=True)

class UserMeal(db.Model):
    __tablename__ = 'user_meals'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('food_analysis_sessions.id'), nullable=False)
    meal_type_id = db.Column(db.Integer, db.ForeignKey('meal_types.id'))
    meal_date = db.Column(db.Date, nullable=False)
    meal_time = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DailyNutritionSummary(db.Model):
    __tablename__ = 'daily_nutrition_summary'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_calories = db.Column(db.Decimal(8, 2), default=0)
    total_protein = db.Column(db.Decimal(8, 2), default=0)
    total_carbs = db.Column(db.Decimal(8, 2), default=0)
    total_fat = db.Column(db.Decimal(8, 2), default=0)
    total_fiber = db.Column(db.Decimal(8, 2), default=0)
    total_sugar = db.Column(db.Decimal(8, 2), default=0)
    total_sodium = db.Column(db.Decimal(8, 2), default=0)
    meal_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'date', name='unique_user_date'),)
