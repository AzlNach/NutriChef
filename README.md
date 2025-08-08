# NutriChef - AI-Powered Diet Tracking System

## Overview
NutriChef adalah aplikasi web yang memungkinkan user untuk tracking diet mereka dengan menganalisis gambar makanan menggunakan AI. Sistem ini menggunakan Gemini API untuk identifikasi makanan dan USDA FoodData Central untuk data nutrisi.

## Tech Stack
- **Backend**: Python (Flask/FastAPI)
- **Frontend**: React.js
- **Database**: MySQL
- **AI/ML**: Google Gemini API
- **Nutrition Data**: USDA FoodData Central API / FatSecret API
- **Deployment**: ngrok (development), dapat dipindah ke cloud

## Architecture
```
Frontend (React) → Backend API (Python) → Database (MySQL)
                        ↓
                  Gemini API + USDA API
```

## Features
1. Upload foto makanan
2. AI analysis untuk identifikasi makanan dan estimasi porsi
3. Data nutrisi otomatis dari USDA/FatSecret API
4. History tracking diet harian
5. Dashboard analytics nutrisi
6. User management system

## Installation & Setup

### Quick Start
```powershell
# 1. Clone atau extract project ke folder Laragon
cd C:\Azel\laragon\www\NutriChef

# 2. Run setup script
.\setup.ps1

# 3. Import database
mysql -u root -p NutriChef_db < database/schema.sql

# 4. Configure API keys in backend/.env
# 5. Start development servers
.\start-dev.ps1

# 6. Setup ngrok (optional)
.\deploy-ngrok.ps1
```

### Detailed Setup
1. **Prerequisites**: Python 3.9+, Node.js 16+, MySQL (Laragon)
2. **API Keys**: Get Gemini API key dan USDA FoodData Central API key
3. **Environment**: Configure `.env` files untuk backend dan frontend
4. **Database**: Import schema dan setup MySQL connection
5. **ngrok**: Setup untuk external access (development/testing)

## API Documentation
Comprehensive API documentation tersedia di `docs/API.md`

### Key Endpoints
- `POST /api/food/analyze` - Analyze food image
- `GET /api/nutrition/history` - Get nutrition history
- `GET /api/dashboard/overview` - Dashboard data

## Project Structure
Lihat `PROJECT_STRUCTURE.md` untuk detail lengkap struktur project.

## Development
- **Backend**: Flask dengan Gemini & USDA API integration
- **Frontend**: React dengan Material-UI components
- **Database**: MySQL dengan comprehensive nutrition tracking schema
- **Deployment**: ngrok untuk development, scalable untuk production

# Database Structure Update - NutriChef

## ✅ Perubahan yang Telah Dilakukan

### 1. Struktur Tabel Foods ✅
- **Tabel `foods`**: Menyimpan makanan utama (pizza, nasi goreng, ketoprak, dll)
- **Sumber data**: Output dari Gemini AI yang mengidentifikasi jenis makanan
- **Kolom nutrisi**: Total akumulasi dari semua bahan ingredients
  - `calories_per_100g` - Total kalori dari semua bahan
  - `protein_per_100g` - Total protein dari semua bahan
  - `carbs_per_100g` - Total karbohidrat dari semua bahan
  - `fat_per_100g` - Total lemak dari semua bahan
  - `fiber_per_100g` - Total serat dari semua bahan
  - `sugar_per_100g` - Total gula dari semua bahan
  - `sodium_per_100g` - Total sodium dari semua bahan

### 2. Struktur Tabel Detected Ingredients ✅
- **Tabel `detected_ingredients`**: Menyimpan bahan-bahan makanan
- **Sumber data**: Output dari Gemini AI yang mengidentifikasi bahan-bahan
- **Hubungan**: Child dari tabel `foods` (many-to-one relationship)
- **Kolom yang dihapus**: ✅
  - `usda_food_id` - Dihapus dari detected_ingredients
  - `fatsecret_food_id` - Dihapus dari detected_ingredients

### 3. Sistem Kategori Otomatis ✅
- **Tabel `category_keywords`**: 71 kata kunci untuk pencocokan
- **Proses**: Sistem mencocokkan deskripsi dari Gemini dengan kata kunci
- **Contoh kata kunci**:
  - `nasi goreng` → Indonesian Food (weight: 1.00)
  - `pizza` → Fast Food (weight: 1.00)  
  - `rendang` → Indonesian Food (weight: 1.00)

## 📊 Status Implementasi

### ✅ Berhasil Diimplementasi
1. **Database Schema**: Struktur tabel sudah sesuai dengan requirement
2. **Tabel Foods**: Kolom nutrisi total sudah ada
3. **Tabel Detected Ingredients**: Kolom API eksternal sudah dihapus
4. **Category Keywords**: 71 kata kunci sudah tersedia
5. **Foreign Key Relations**: Hubungan antar tabel sudah benar

### ⚠️ Memerlukan Update di Backend
1. **Backend Services**: Perlu update untuk menggunakan `detected_ingredients`
2. **Gemini Service**: Perlu update untuk extract ingredients dari output
3. **Food Analysis**: Perlu update untuk akumulasi nutrition dari ingredients
4. **SQL Query**: Fix GROUP BY clause di category matching

## 🎯 Flow Sistem yang Baru

```
User Upload Foto → Gemini AI Analysis
     ↓
Gemini Output:
- Nama makanan utama (e.g., "Nasi Goreng")
- Deskripsi makanan
- List bahan ingredients (nasi, telur, kecap, sayuran)
- Estimasi porsi setiap bahan
     ↓
1. Save ke tabel `foods`:
   - name: "Nasi Goreng"
   - description: "Fried rice dish with..."
   - category_id: Otomatis dari keyword matching
   - calories_per_100g: Total dari semua ingredients
   - protein_per_100g: Total dari semua ingredients
   - dst...
     ↓
2. Save ke tabel `detected_ingredients`:
   - ingredient_name: "nasi putih"
   - estimated_portion: 150
   - portion_unit: "grams"
   - calories: 195.0
   - protein: 4.1
   - dst...
     ↓
   - ingredient_name: "telur ayam"
   - estimated_portion: 50
   - portion_unit: "grams"
   - calories: 77.5
   - protein: 6.5
   - dst...
```

## 🔧 Next Steps untuk Backend Update

1. **Update Gemini Service**:
   ```python
   # Extract main food name dan ingredients dari Gemini output
   gemini_response = analyze_image(image)
   main_food = extract_main_food_name(gemini_response)
   ingredients_list = extract_ingredients(gemini_response)
   ```

2. **Update Food Analysis Service**:
   ```python
   # Save main food dengan total nutrition
   food_id = save_main_food(main_food, total_nutrition)
   
   # Save individual ingredients
   for ingredient in ingredients_list:
       save_ingredient(session_id, food_id, ingredient)
   ```

3. **Update Category Matching**:
   ```sql
   -- Fix GROUP BY clause
   SELECT fc.id, fc.name, SUM(ck.weight) as total_weight
   FROM food_categories fc
   JOIN category_keywords ck ON fc.id = ck.category_id
   WHERE description LIKE %keyword%
   GROUP BY fc.id, fc.name
   ORDER BY total_weight DESC
   ```

## 📝 Contoh Data Flow

**Input**: Foto nasi goreng

**Gemini Output**:
```json
{
  "main_food": "Nasi Goreng",
  "description": "Indonesian fried rice with vegetables, egg, and sweet soy sauce",
  "ingredients": [
    {"name": "nasi putih", "portion": 150, "unit": "grams"},
    {"name": "telur ayam", "portion": 50, "unit": "grams"},
    {"name": "kecap manis", "portion": 15, "unit": "ml"},
    {"name": "sayuran campur", "portion": 35, "unit": "grams"}
  ]
}
```

**Database Result**:

**foods table**:
- name: "Nasi Goreng"
- category_id: 10 (Indonesian Food - dari keyword matching)
- calories_per_100g: 303.8 (total dari semua ingredients)
- protein_per_100g: 12.8 (total dari semua ingredients)

**detected_ingredients table**:
- 4 records untuk nasi, telur, kecap, sayuran
- Masing-masing dengan nutrition individual
- Semua ter-link ke food_id yang sama

## ✅ Kesimpulan

Struktur database sudah berhasil diubah sesuai dengan requirement:
- ✅ Tabel `foods` untuk makanan utama dengan nutrition total
- ✅ Tabel `detected_ingredients` untuk bahan-bahan individual  
- ✅ Sistem kategori otomatis dengan keyword matching
- ✅ Kolom API eksternal sudah dihapus dari detected_ingredients
- ⚠️ Backend services perlu diupdate untuk menggunakan struktur baru


# NutriChef Project Structure

```
NutriChef/
├── backend/                          # Python Backend (Flask/FastAPI)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py                 # Configuration settings
│   │   ├── models/                   # Database models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── food.py
│   │   │   ├── analysis.py
│   │   │   └── nutrition.py
│   │   ├── services/                 # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── gemini_service.py     # Gemini API integration
│   │   │   ├── usda_service.py       # USDA FoodData Central API
│   │   │   ├── fatsecret_service.py  # FatSecret API (alternative)
│   │   │   ├── image_service.py      # Image processing
│   │   │   ├── nutrition_service.py  # Nutrition calculations
│   │   │   └── auth_service.py       # Authentication
│   │   ├── routes/                   # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Authentication routes
│   │   │   ├── food_analysis.py     # Food analysis endpoints
│   │   │   ├── nutrition.py         # Nutrition tracking
│   │   │   ├── users.py             # User management
│   │   │   └── dashboard.py         # Dashboard data
│   │   ├── utils/                   # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── database.py          # Database connection
│   │   │   ├── validators.py        # Input validation
│   │   │   ├── helpers.py           # General helpers
│   │   │   └── decorators.py        # Custom decorators
│   │   └── middleware/              # Custom middleware
│   │       ├── __init__.py
│   │       ├── cors.py
│   │       └── error_handler.py
│   ├── uploads/                     # Uploaded images storage
│   ├── tests/                       # Unit tests
│   │   ├── test_models.py
│   │   ├── test_services.py
│   │   └── test_routes.py
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment variables template
│   ├── .env                         # Environment variables (gitignored)
│   ├── app.py                       # Main application entry point
│   └── wsgi.py                      # WSGI entry point for production
│
├── frontend/                        # React Frontend
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   │   ├── common/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Loading.jsx
│   │   │   │   └── Modal.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── RegisterForm.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── food/
│   │   │   │   ├── ImageUpload.jsx
│   │   │   │   ├── FoodAnalysisResult.jsx
│   │   │   │   ├── FoodCard.jsx
│   │   │   │   └── NutritionCard.jsx
│   │   │   └── dashboard/
│   │   │       ├── DashboardOverview.jsx
│   │   │       ├── NutritionChart.jsx
│   │   │       ├── CalorieTracker.jsx
│   │   │       └── MealHistory.jsx
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── FoodAnalysis.jsx
│   │   │   ├── History.jsx
│   │   │   └── Profile.jsx
│   │   ├── services/                # API calls
│   │   │   ├── api.js               # Axios configuration
│   │   │   ├── authService.js
│   │   │   ├── foodService.js
│   │   │   └── nutritionService.js
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useLocalStorage.js
│   │   │   └── useApi.js
│   │   ├── context/                 # React context
│   │   │   ├── AuthContext.js
│   │   │   └── ThemeContext.js
│   │   ├── utils/                   # Utility functions
│   │   │   ├── constants.js
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   ├── styles/                  # CSS/SCSS files
│   │   │   ├── globals.css
│   │   │   ├── components/
│   │   │   └── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   ├── .env.example
│   ├── .env
│   └── .gitignore
│
├── database/                        # Database related files
│   ├── schema.sql                   # Database schema
│   ├── migrations/                  # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   └── 002_add_indexes.sql
│   ├── seeds/                       # Seed data
│   │   ├── food_categories.sql
│   │   └── sample_foods.sql
│   └── backup/                      # Database backups
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── DEPLOYMENT.md                # Deployment guide
│   ├── DATABASE.md                  # Database documentation
│   └── DEVELOPMENT.md               # Development setup
│
├── config/                          # Configuration files
│   ├── nginx.conf                   # Nginx configuration
│   ├── docker-compose.yml           # Docker setup
│   └── .env.production              # Production environment
│
├── scripts/                         # Utility scripts
│   ├── setup.sh                     # Initial setup script
│   ├── deploy.sh                    # Deployment script
│   └── backup_db.sh                 # Database backup script
│
├── .gitignore                       # Git ignore file
├── README.md                        # Project documentation
└── docker-compose.yml               # Docker configuration
```

## Key Directories Explanation:

### Backend (`/backend`)
- **models/**: SQLAlchemy models untuk database tables
- **services/**: Business logic dan integrasi dengan external APIs
- **routes/**: API endpoints dan request handling
- **utils/**: Helper functions dan utilities

### Frontend (`/frontend`)
- **components/**: Reusable React components
- **pages/**: Page-level components
- **services/**: API integration dan HTTP calls
- **hooks/**: Custom React hooks untuk state management

### Database (`/database`)
- **schema.sql**: Complete database schema
- **migrations/**: Database version control
- **seeds/**: Initial data untuk development

### Config & Scripts
- **config/**: Server configuration files
- **scripts/**: Automation scripts untuk setup dan deployment
- **docs/**: Comprehensive documentation
