-- FoodVision Database Schema
-- MySQL Database Design for Diet Tracking System
-- Updated: Sistem tabel foods dan detected_ingredients 
--          foods = makanan utama (nasi goreng, pizza, dll) dengan nutrisi total terakumulasi
--          detected_ingredients = bahan-bahan makanan (kecap, nasi, telur, dll)
--          Kategori makanan ditentukan otomatis berdasarkan pencocokan kata kunci

CREATE DATABASE IF NOT EXISTS foodvision_db;
USE foodvision_db;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    height DECIMAL(5,2), -- in cm
    weight DECIMAL(5,2), -- in kg
    activity_level ENUM('sedentary', 'light', 'moderate', 'active', 'very_active'),
    daily_calorie_goal INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Food categories table
CREATE TABLE food_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT, -- kata kunci untuk pencocokan otomatis dengan output Gemini
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk kata kunci kategori (membantu sistem menentukan kategori)
CREATE TABLE category_keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.0, -- bobot kata kunci (0.1-1.0)
    language ENUM('id', 'en') DEFAULT 'id',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES food_categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_keyword (category_id, keyword, language)
);

-- Foods table (makanan utama yang terdeteksi dari Gemini)
CREATE TABLE foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL, -- nama makanan dari output Gemini (pizza, nasi goreng, ketoprak, dll)
    description TEXT, -- deskripsi makanan dari Gemini untuk pencocokan kategori
    category_id INT, -- kategori ditentukan sistem berdasarkan deskripsi
    serving_size DECIMAL(8,2), -- ukuran porsi default
    serving_unit VARCHAR(50), -- gram, cup, piece, etc
    -- Nutrisi total dari akumulasi semua bahan (ingredients)
    calories_per_100g DECIMAL(8,2), -- total kalori dari semua bahan
    protein_per_100g DECIMAL(8,2), -- total protein dari semua bahan
    carbs_per_100g DECIMAL(8,2), -- total karbohidrat dari semua bahan
    fat_per_100g DECIMAL(8,2), -- total lemak dari semua bahan
    fiber_per_100g DECIMAL(8,2), -- total serat dari semua bahan
    sugar_per_100g DECIMAL(8,2), -- total gula dari semua bahan
    sodium_per_100g DECIMAL(8,2), -- total sodium dari semua bahan
    gemini_source BOOLEAN DEFAULT TRUE, -- apakah data berasal dari Gemini
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES food_categories(id)
);

-- Food analysis sessions (setiap kali user upload foto)
CREATE TABLE food_analysis_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_path VARCHAR(500), -- path ke file gambar yang diupload
    image_filename VARCHAR(255),
    gemini_analysis_raw TEXT, -- raw response dari Gemini API
    analysis_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    total_estimated_calories DECIMAL(8,2),
    confidence_score DECIMAL(3,2), -- 0.00-1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Detected ingredients dalam setiap session (bahan-bahan makanan yang terdeteksi)
CREATE TABLE detected_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    food_id INT NOT NULL, -- referensi ke makanan utama (nasi goreng, pizza, dll)
    ingredient_name VARCHAR(200) NOT NULL, -- nama bahan dari Gemini (kecap, nasi, telur, sayuran)
    ingredient_category VARCHAR(100), -- kategori bahan (protein, carbs, vegetables, etc)
    estimated_portion DECIMAL(8,2), -- estimasi porsi bahan oleh Gemini
    portion_unit VARCHAR(50), -- gram, cup, piece, etc
    estimated_weight_grams DECIMAL(8,2), -- konversi ke gram
    confidence_score DECIMAL(3,2), -- confidence untuk deteksi bahan ini
    manual_override BOOLEAN DEFAULT FALSE, -- apakah user sudah edit manual
    -- Calculated nutrition values untuk bahan ini
    calories DECIMAL(8,2),
    protein DECIMAL(8,2),
    carbs DECIMAL(8,2),
    fat DECIMAL(8,2),
    fiber DECIMAL(8,2),
    sugar DECIMAL(8,2),
    sodium DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES food_analysis_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id)
);

-- Daily nutrition summary
CREATE TABLE daily_nutrition_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    total_calories DECIMAL(8,2) DEFAULT 0,
    total_protein DECIMAL(8,2) DEFAULT 0,
    total_carbs DECIMAL(8,2) DEFAULT 0,
    total_fat DECIMAL(8,2) DEFAULT 0,
    total_fiber DECIMAL(8,2) DEFAULT 0,
    total_sugar DECIMAL(8,2) DEFAULT 0,
    total_sodium DECIMAL(8,2) DEFAULT 0,
    meal_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meal types (breakfast, lunch, dinner, snack)
CREATE TABLE meal_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(100),
    typical_time_start TIME,
    typical_time_end TIME
);

-- User meals (untuk tracking kapan makan apa)
CREATE TABLE user_meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT NOT NULL,
    meal_type_id INT,
    meal_date DATE NOT NULL,
    meal_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES food_analysis_sessions(id),
    FOREIGN KEY (meal_type_id) REFERENCES meal_types(id)
);

-- User preferences dan settings (menggunakan JSON untuk struktur berkelompok)
CREATE TABLE user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preferences JSON NOT NULL,  -- Struktur JSON untuk preferences yang terorganisir
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_preferences (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API usage tracking (untuk monitoring penggunaan API eksternal)
CREATE TABLE api_usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_name ENUM('gemini', 'usda', 'fatsecret') NOT NULL,
    endpoint VARCHAR(200),
    request_count INT DEFAULT 1,
    response_status VARCHAR(10),
    response_time_ms INT,
    cost_credits DECIMAL(10,4), -- untuk tracking biaya API
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data
INSERT INTO meal_types (name, description, typical_time_start, typical_time_end) VALUES
('Breakfast', 'Morning meal', '06:00:00', '10:00:00'),
('Lunch', 'Midday meal', '11:00:00', '14:00:00'),
('Dinner', 'Evening meal', '17:00:00', '21:00:00'),
('Snack', 'Light meal/snack', '00:00:00', '23:59:59');

INSERT INTO food_categories (name, description) VALUES
('Fruits', 'Fresh and dried fruits, buah segar, buah kering, apple, banana, orange, mangga, jeruk'),
('Vegetables', 'Fresh and cooked vegetables, sayuran segar, sayur rebus, brokoli, bayam, wortel, tomat'),
('Grains', 'Rice, bread, pasta, cereals, nasi, roti, mie, pasta, sereal, gandum'),
('Protein', 'Meat, fish, eggs, legumes, daging, ikan, telur, ayam, sapi, tahu, tempe'),
('Dairy', 'Milk, cheese, yogurt, susu, keju, yogurt, mentega'),
('Beverages', 'Drinks and liquids, minuman, jus, teh, kopi, air'),
('Snacks', 'Processed snacks and treats, camilan, keripik, kue kering'),
('Desserts', 'Sweet treats and desserts, makanan manis, es krim, kue, puding'),
('Condiments', 'Sauces, spices, and seasonings, bumbu, saus, kecap, sambal, garam'),
('Indonesian Food', 'Traditional Indonesian dishes, makanan indonesia, nasi goreng, rendang, gado-gado, soto'),
('Fast Food', 'Restaurant and fast food items, makanan cepat saji, burger, pizza, kentang goreng'),
('Mixed Dishes', 'Complex dishes with multiple ingredients, makanan campuran, masakan rumahan');

-- Insert kata kunci untuk sistem kategori otomatis
-- Fruits
INSERT INTO category_keywords (category_id, keyword, weight, language) VALUES
(1, 'buah', 1.0, 'id'), (1, 'fruit', 1.0, 'en'), (1, 'apple', 0.9, 'en'), (1, 'apel', 0.9, 'id'),
(1, 'banana', 0.9, 'en'), (1, 'pisang', 0.9, 'id'), (1, 'orange', 0.9, 'en'), (1, 'jeruk', 0.9, 'id'),
(1, 'mangga', 0.9, 'id'), (1, 'mango', 0.9, 'en'), (1, 'fresh', 0.7, 'en'), (1, 'segar', 0.7, 'id');

-- Vegetables  
INSERT INTO category_keywords (category_id, keyword, weight, language) VALUES
(2, 'sayur', 1.0, 'id'), (2, 'vegetable', 1.0, 'en'), (2, 'brokoli', 0.9, 'id'), (2, 'broccoli', 0.9, 'en'),
(2, 'bayam', 0.9, 'id'), (2, 'spinach', 0.9, 'en'), (2, 'wortel', 0.9, 'id'), (2, 'carrot', 0.9, 'en'),
(2, 'tomat', 0.9, 'id'), (2, 'tomato', 0.9, 'en'), (2, 'hijau', 0.6, 'id'), (2, 'green', 0.6, 'en');

-- Grains
INSERT INTO category_keywords (category_id, keyword, weight, language) VALUES
(3, 'nasi', 1.0, 'id'), (3, 'rice', 1.0, 'en'), (3, 'roti', 0.9, 'id'), (3, 'bread', 0.9, 'en'),
(3, 'mie', 0.9, 'id'), (3, 'noodle', 0.9, 'en'), (3, 'pasta', 0.9, 'id'), (3, 'pasta', 0.9, 'en'),
(3, 'gandum', 0.8, 'id'), (3, 'wheat', 0.8, 'en'), (3, 'sereal', 0.8, 'id'), (3, 'cereal', 0.8, 'en');

-- Protein
INSERT INTO category_keywords (category_id, keyword, weight, language) VALUES
(4, 'daging', 1.0, 'id'), (4, 'meat', 1.0, 'en'), (4, 'ayam', 0.9, 'id'), (4, 'chicken', 0.9, 'en'),
(4, 'sapi', 0.9, 'id'), (4, 'beef', 0.9, 'en'), (4, 'ikan', 0.9, 'id'), (4, 'fish', 0.9, 'en'),
(4, 'telur', 0.9, 'id'), (4, 'egg', 0.9, 'en'), (4, 'tahu', 0.8, 'id'), (4, 'tofu', 0.8, 'en'),
(4, 'tempe', 0.8, 'id'), (4, 'tempeh', 0.8, 'en'), (4, 'protein', 0.7, 'en');

-- Indonesian Food
INSERT INTO category_keywords (category_id, keyword, weight, language) VALUES
(10, 'nasi goreng', 1.0, 'id'), (10, 'rendang', 1.0, 'id'), (10, 'gado-gado', 1.0, 'id'),
(10, 'soto', 1.0, 'id'), (10, 'gudeg', 1.0, 'id'), (10, 'ketoprak', 1.0, 'id'),
(10, 'pecel', 1.0, 'id'), (10, 'rawon', 1.0, 'id'), (10, 'bakso', 1.0, 'id'),
(10, 'indonesia', 0.8, 'id'), (10, 'traditional', 0.7, 'en'), (10, 'khas', 0.7, 'id');

-- Fast Food  
INSERT INTO category_keywords (category_id, keyword, weight, language) VALUES
(11, 'pizza', 1.0, 'id'), (11, 'burger', 1.0, 'id'), (11, 'kentang goreng', 1.0, 'id'),
(11, 'french fries', 1.0, 'en'), (11, 'fast food', 1.0, 'en'), (11, 'cepat saji', 1.0, 'id'),
(11, 'restaurant', 0.7, 'en'), (11, 'restoran', 0.7, 'id');

-- Insert default user preferences structure
INSERT INTO users (id, username, email, password_hash) VALUES
(1, 'defaultuser', 'default@example.com', 'dummyhash');

-- This will be used as template for new users
INSERT INTO user_preferences (user_id, preferences) VALUES 
(1, JSON_OBJECT(
  'general', JSON_OBJECT(
    'units', 'metric',
    'language', 'en'
  ),
  'notifications', JSON_OBJECT(
    'enabled', true,
    'daily_reminder_time', '09:00'
  ),
  'goals', JSON_OBJECT(
    'weekly_weight', 0,
    'macronutrient_distribution', JSON_OBJECT(
      'protein_percentage', 15,
      'carbs_percentage', 50,
      'fat_percentage', 35
    )
  ),
  'display', JSON_OBJECT(
    'nutrition_order', JSON_ARRAY('calories', 'protein', 'carbs', 'fat', 'fiber'),
    'hide_detailed_nutrition', false
  ),
  'diet', JSON_OBJECT(
    'preferred_meal_times', JSON_OBJECT(
      'breakfast', '07:00',
      'lunch', '12:00',
      'dinner', '19:00'
    ),
    'dietary_restrictions', JSON_ARRAY(),
    'favorite_foods', JSON_ARRAY()
  )
)) ON DUPLICATE KEY UPDATE preferences = VALUES(preferences);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_food_analysis_sessions_user_date ON food_analysis_sessions(user_id, created_at);
CREATE INDEX idx_detected_ingredients_session ON detected_ingredients(session_id);
CREATE INDEX idx_detected_ingredients_food ON detected_ingredients(food_id);
CREATE INDEX idx_detected_ingredients_name ON detected_ingredients(ingredient_name);
CREATE INDEX idx_daily_nutrition_user_date ON daily_nutrition_summary(user_id, date);
CREATE INDEX idx_user_meals_user_date ON user_meals(user_id, meal_date);
CREATE INDEX idx_foods_name ON foods(name);
CREATE INDEX idx_foods_category ON foods(category_id);
CREATE INDEX idx_food_categories_description ON food_categories(description(255));
CREATE INDEX idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX idx_api_usage_logs_date ON api_usage_logs(date, api_name);
