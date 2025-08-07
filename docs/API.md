# FoodVision REST API Documentation

## Base URL
- Development: `http://localhost:5000/api`
- ngrok: `https://your-ngrok-url.ngrok.io/api`

## Authentication
API menggunakan JWT Bearer token authentication.

```http
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register new user account.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com", 
  "password": "secure_password",
  "full_name": "John Doe",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "height": 175.5,
  "weight": 70.0,
  "activity_level": "moderate",
  "daily_calorie_goal": 2000
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "full_name": "John Doe"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Food Analysis

#### POST /food/analyze
Analyze food image and get nutrition information.

**Request:**
- Content-Type: `multipart/form-data`
- Authentication required

**Form Data:**
- `image`: Image file (jpg, jpeg, png, webp)
- `meal_type`: "breakfast" | "lunch" | "dinner" | "snack"
- `notes`: Optional notes about the meal

**Response (200 OK):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "analysis_time": 3.2,
  "confidence_overall": 0.85,
  "detected_foods": [
    {
      "id": 1,
      "name": "Grilled Chicken Breast",
      "category": "Protein",
      "estimated_portion": 150,
      "portion_unit": "grams",
      "confidence": 0.92,
      "nutrition": {
        "calories": 247.5,
        "protein": 46.5,
        "carbs": 0,
        "fat": 5.4,
        "fiber": 0,
        "sugar": 0,
        "sodium": 111
      },
      "notes": "Well-cooked, no visible seasoning"
    },
    {
      "id": 2,
      "name": "Steamed Broccoli",
      "category": "Vegetables",
      "estimated_portion": 100,
      "portion_unit": "grams",
      "confidence": 0.88,
      "nutrition": {
        "calories": 34,
        "protein": 2.8,
        "carbs": 7,
        "fat": 0.4,
        "fiber": 2.6,
        "sugar": 1.5,
        "sodium": 33
      },
      "notes": "Fresh, bright green color"
    }
  ],
  "total_nutrition": {
    "calories": 281.5,
    "protein": 49.3,
    "carbs": 7,
    "fat": 5.8,
    "fiber": 2.6,
    "sugar": 1.5,
    "sodium": 144
  },
  "image_info": {
    "filename": "meal_20240106_123045.jpg",
    "size": 2048576,
    "quality": "good"
  }
}
```

#### GET /food/analysis/{session_id}
Get analysis result by session ID.

**Response (200 OK):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "created_at": "2024-01-06T12:30:45Z",
  "detected_foods": [...],
  "total_nutrition": {...}
}
```

#### PUT /food/analysis/{session_id}/foods/{food_id}
Update detected food information (manual correction).

**Request Body:**
```json
{
  "name": "Corrected Food Name",
  "estimated_portion": 200,
  "portion_unit": "grams",
  "manual_override": true
}
```

#### DELETE /food/analysis/{session_id}/foods/{food_id}
Remove detected food from analysis.

### Nutrition Tracking

#### GET /nutrition/history
Get nutrition history for user.

**Query Parameters:**
- `date`: Date in YYYY-MM-DD format (default: today)
- `period`: "day" | "week" | "month" (default: "day")
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200 OK):**
```json
{
  "date": "2024-01-06",
  "period": "day",
  "meals": [
    {
      "id": 1,
      "meal_type": "breakfast",
      "meal_time": "2024-01-06T08:30:00Z",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "foods": [
        {
          "name": "Oatmeal with Berries",
          "calories": 350,
          "protein": 12,
          "carbs": 58,
          "fat": 8
        }
      ],
      "total_calories": 350,
      "notes": "Morning meal with fresh fruits"
    },
    {
      "id": 2,
      "meal_type": "lunch", 
      "meal_time": "2024-01-06T12:30:00Z",
      "session_id": "660e8400-e29b-41d4-a716-446655440001",
      "foods": [...],
      "total_calories": 281.5
    }
  ],
  "daily_totals": {
    "calories": 1847.5,
    "protein": 95.2,
    "carbs": 180.5,
    "fat": 65.8,
    "fiber": 25.3,
    "sugar": 45.2,
    "sodium": 1850
  },
  "goals": {
    "calories": 2000,
    "protein": 100,
    "carbs": 200,
    "fat": 70
  },
  "progress": {
    "calories_percentage": 92.4,
    "protein_percentage": 95.2,
    "carbs_percentage": 90.3,
    "fat_percentage": 94.0
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "has_next": false
  }
}
```

#### GET /nutrition/daily-summary
Get daily nutrition summary.

**Query Parameters:**
- `date`: Date in YYYY-MM-DD format (default: today)

**Response (200 OK):**
```json
{
  "date": "2024-01-06",
  "totals": {
    "calories": 1847.5,
    "protein": 95.2,
    "carbs": 180.5,
    "fat": 65.8,
    "fiber": 25.3,
    "sugar": 45.2,
    "sodium": 1850
  },
  "goals": {
    "calories": 2000,
    "protein": 100,
    "carbs": 200,
    "fat": 70
  },
  "meal_breakdown": {
    "breakfast": { "calories": 350, "count": 1 },
    "lunch": { "calories": 450, "count": 2 },
    "dinner": { "calories": 680, "count": 1 },
    "snack": { "calories": 367.5, "count": 3 }
  },
  "macro_percentages": {
    "protein": 20.6,
    "carbs": 39.0,
    "fat": 32.0,
    "other": 8.4
  }
}
```

### User Management

#### GET /users/profile
Get current user profile.

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "height": 175.5,
  "weight": 70.0,
  "activity_level": "moderate",
  "daily_calorie_goal": 2000,
  "created_at": "2024-01-01T00:00:00Z",
  "stats": {
    "total_analyses": 45,
    "days_tracked": 15,
    "average_daily_calories": 1950.5
  }
}
```

#### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "full_name": "John Smith",
  "weight": 72.0,
  "daily_calorie_goal": 2100,
  "activity_level": "active"
}
```

### Dashboard

#### GET /dashboard/overview
Get dashboard overview data.

**Query Parameters:**
- `period`: "week" | "month" | "year" (default: "week")

**Response (200 OK):**
```json
{
  "period": "week",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-07"
  },
  "summary": {
    "total_meals": 21,
    "average_daily_calories": 1950.5,
    "days_tracked": 7,
    "goal_achievement_rate": 0.85
  },
  "trends": {
    "calories": [1800, 2100, 1950, 2050, 1850, 1900, 2000],
    "protein": [85, 95, 90, 100, 88, 92, 96],
    "weight": [70.0, 69.8, 69.9, 69.7, 69.5, 69.6, 69.4]
  },
  "top_foods": [
    { "name": "Chicken Breast", "frequency": 5, "total_calories": 825 },
    { "name": "Brown Rice", "frequency": 4, "total_calories": 520 },
    { "name": "Broccoli", "frequency": 6, "total_calories": 204 }
  ],
  "nutrition_distribution": {
    "protein": 22.5,
    "carbs": 45.0,
    "fat": 27.5,
    "other": 5.0
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "validation_failed",
  "message": "Invalid input data",
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Access token is missing or invalid"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "request_id": "req_123456789"
}
```

## Rate Limits
- Authentication endpoints: 5 requests per minute per IP
- Food analysis: 30 requests per hour per user  
- Other endpoints: 100 requests per hour per user

## File Upload Limits
- Maximum file size: 16MB
- Supported formats: JPG, JPEG, PNG, WebP
- Maximum image dimensions: 4096x4096 pixels

## Webhooks (Future Feature)
- Analysis completion notifications
- Daily summary reports
- Goal achievement alerts
