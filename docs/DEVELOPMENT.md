# NutriChef - Development Guide

## Project Overview
NutriChef adalah sistem tracking diet berbasis AI yang menggunakan:
- **Backend**: Python Flask dengan Gemini API untuk analisis gambar
- **Frontend**: React.js untuk interface pengguna
- **Database**: MySQL untuk penyimpanan data
- **Deployment**: ngrok untuk development/testing

## Development Workflow

### 1. API Keys yang Diperlukan

#### Google Gemini API
1. Buka https://makersuite.google.com/app/apikey
2. Login dengan Google account
3. Create new API key
4. Copy key ke `backend/.env` sebagai `GEMINI_API_KEY`

#### USDA FoodData Central API  
1. Buka https://fdc.nal.usda.gov/api-key-signup.html
2. Sign up dengan email
3. Verify email dan login
4. Copy API key ke `backend/.env` sebagai `USDA_API_KEY`

#### FatSecret API (Optional)
1. Register di https://platform.fatsecret.com/api/
2. Create application
3. Get Client ID dan Secret
4. Add ke `backend/.env`

### 2. Database Development

#### Schema Changes
Jika perlu mengubah database schema:
```sql
-- 1. Backup existing data
mysqldump -u root -p NutriChef_db > backup_$(date +%Y%m%d).sql

-- 2. Make changes to database/schema.sql

-- 3. Apply changes
mysql -u root -p NutriChef_db < database/schema.sql
```

#### Sample Data
```sql
-- Insert test user
INSERT INTO users (username, email, password_hash, full_name) VALUES 
('testuser', 'test@example.com', 'hashed_password', 'Test User');

-- Insert sample foods
INSERT INTO foods (name, category_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g) VALUES
('Chicken Breast', 4, 165, 31, 0, 3.6),
('White Rice', 3, 130, 2.7, 28, 0.3),
('Broccoli', 2, 34, 2.8, 7, 0.4);
```

### 3. Backend Development

#### Project Structure
```
backend/
├── app/
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── routes/           # API endpoints  
│   └── utils/            # Helper functions
├── uploads/              # File storage
├── tests/                # Unit tests
└── app.py               # Main application
```

#### Key Services

**GeminiService** (`app/services/gemini_service.py`)
- Image analysis dengan Gemini Vision API
- Food identification dan portion estimation
- Confidence scoring

**USDAService** (`app/services/usda_service.py`)
- Nutrition data retrieval
- Food database search
- Data normalization

**NutritionService** (`app/services/nutrition_service.py`)
- Calorie calculations
- Macro tracking
- Daily summaries

#### API Testing
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test food analysis (with file upload)
curl -X POST -F "image=@test_food.jpg" -F "meal_type=lunch" \
  http://localhost:5000/api/food/analyze

# Test with ngrok
curl https://your-ngrok-url.ngrok.io/health
```

### 4. Frontend Development

#### Project Structure
```
frontend/src/
├── components/           # Reusable components
│   ├── common/          # Header, Footer, Loading
│   ├── auth/            # Login, Register forms
│   ├── food/            # Food analysis components
│   └── dashboard/       # Dashboard components
├── pages/               # Page components
├── services/            # API calls
├── hooks/               # Custom React hooks
└── utils/               # Helper functions
```

#### Key Components

**ImageUpload** (`components/food/ImageUpload.jsx`)
```jsx
// Drag & drop image upload dengan preview
// Integration dengan backend API
// Progress tracking untuk analysis
```

**FoodAnalysisResult** (`components/food/FoodAnalysisResult.jsx`)
```jsx
// Display hasil analisis dari Gemini
// Nutrition information cards
// Edit/confirm detected foods
```

**NutritionChart** (`components/dashboard/NutritionChart.jsx`)
```jsx
// Chart.js integration
// Daily/weekly/monthly views
// Goal tracking visualization
```

#### State Management
```jsx
// Context untuk authentication
const AuthContext = createContext();

// Context untuk nutrition data
const NutritionContext = createContext();

// Custom hooks
const useAuth = () => useContext(AuthContext);
const useNutrition = () => useContext(NutritionContext);
```

### 5. Integration Points

#### Image Upload Flow
1. User selects/captures image
2. Frontend uploads ke `/api/food/analyze`
3. Backend processes dengan Gemini API
4. Backend fetches nutrition dari USDA API
5. Results dikembalikan ke frontend
6. User dapat edit/confirm results
7. Data disimpan ke database

#### Real-time Updates
```javascript
// Polling untuk analysis status
const pollAnalysisStatus = async (sessionId) => {
  const response = await fetch(`/api/food/analysis/${sessionId}/status`);
  const data = await response.json();
  
  if (data.status === 'completed') {
    setAnalysisResult(data);
  } else if (data.status === 'processing') {
    setTimeout(() => pollAnalysisStatus(sessionId), 2000);
  }
};
```

### 6. Testing Strategy

#### Backend Testing
```python
# Unit tests untuk services
def test_gemini_analysis():
    service = GeminiService()
    result = service.analyze_food_image('test_image.jpg')
    assert result['analysis_status'] == 'success'

# Integration tests untuk API endpoints
def test_food_analysis_endpoint():
    response = client.post('/api/food/analyze', 
                          data={'image': (io.BytesIO(image_data), 'test.jpg')})
    assert response.status_code == 200
```

#### Frontend Testing
```javascript
// Component tests dengan React Testing Library
test('ImageUpload component renders correctly', () => {
  render(<ImageUpload onUpload={mockOnUpload} />);
  expect(screen.getByText('Upload Food Image')).toBeInTheDocument();
});

// API integration tests
test('Food analysis API call', async () => {
  const mockResponse = { detected_foods: [...] };
  fetch.mockResolvedValue({ json: () => mockResponse });
  
  const result = await analyzeFoodImage(imageFile);
  expect(result.detected_foods).toBeDefined();
});
```

### 7. Performance Optimization

#### Backend Optimization
- Image resizing sebelum analysis
- Caching USDA nutrition data
- Database query optimization
- Rate limiting untuk API calls

#### Frontend Optimization
- Image compression sebelum upload
- Lazy loading untuk components
- Memoization untuk expensive calculations
- Bundle splitting dan code optimization

### 8. Error Handling

#### Backend Error Responses
```python
# Standardized error format
{
  "error": "validation_failed",
  "message": "Invalid image format",
  "details": {
    "field": "image",
    "allowed_formats": ["jpg", "jpeg", "png"]
  }
}
```

#### Frontend Error Handling
```javascript
// Global error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to monitoring service
  }
}

// API error handling
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Redirect to login
  } else if (error.response?.status >= 500) {
    // Show generic error message
  }
};
```

### 9. Monitoring & Logging

#### Backend Logging
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/NutriChef.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
```

#### API Usage Tracking
```python
# Track API calls di database
def log_api_usage(api_name, endpoint, status, response_time):
    usage_log = APIUsageLog(
        api_name=api_name,
        endpoint=endpoint,
        response_status=status,
        response_time_ms=response_time,
        date=datetime.utcnow().date()
    )
    db.session.add(usage_log)
    db.session.commit()
```

### 10. Deployment Checklist

#### Pre-deployment
- [ ] All API keys configured
- [ ] Database schema applied
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Tests passing

#### ngrok Setup
- [ ] Account created dan verified
- [ ] Authtoken configured
- [ ] Custom domain (optional)
- [ ] CORS origins updated

#### Post-deployment
- [ ] Health checks passing
- [ ] Image upload working
- [ ] Food analysis functional
- [ ] Database connections stable
- [ ] Monitoring setup

### 11. Common Development Issues

1. **Gemini API Rate Limits**
   - Implement exponential backoff
   - Cache common food items
   - Use batch processing

2. **Large Image Files**
   - Client-side compression
   - Progressive upload
   - Timeout handling

3. **CORS Issues**
   - Proper origin configuration
   - Preflight request handling
   - Credential inclusion

4. **Database Performance**
   - Proper indexing
   - Connection pooling
   - Query optimization
