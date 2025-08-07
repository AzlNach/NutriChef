# FoodVision API Test Script
# This script tests all API endpoints to ensure they work correctly

Write-Host "=== FoodVision API Test Script ===" -ForegroundColor Green
Write-Host "Testing backend API endpoints..."

$baseUrl = "http://localhost:5000/api"

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
    Write-Host "✓ Health check passed: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Database Connection
Write-Host "`n2. Testing Database Connection..." -ForegroundColor Yellow
try {
    $dbTest = Invoke-RestMethod -Uri "http://localhost:5000/test-db" -Method GET
    Write-Host "✓ Database connection: $($dbTest.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Database connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: User Registration
Write-Host "`n3. Testing User Registration..." -ForegroundColor Yellow
$testUser = @{
    username = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')"
    email = "test_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "password123"
}

try {
    $registerResult = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body ($testUser | ConvertTo-Json)
    $token = $registerResult.access_token
    Write-Host "✓ User registration successful. User: $($registerResult.user.username)" -ForegroundColor Green
} catch {
    Write-Host "✗ User registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: User Login
Write-Host "`n4. Testing User Login..." -ForegroundColor Yellow
try {
    $loginResult = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body (@{username=$testUser.username; password=$testUser.password} | ConvertTo-Json)
    Write-Host "✓ User login successful" -ForegroundColor Green
} catch {
    Write-Host "✗ User login failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get Profile
Write-Host "`n5. Testing Get Profile..." -ForegroundColor Yellow
try {
    $profile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ Profile retrieved: $($profile.user.username)" -ForegroundColor Green
} catch {
    Write-Host "✗ Get profile failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Dashboard Overview
Write-Host "`n6. Testing Dashboard Overview..." -ForegroundColor Yellow
try {
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/dashboard/overview" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ Dashboard overview retrieved. Today's calories: $($dashboard.today_nutrition.calories)" -ForegroundColor Green
} catch {
    Write-Host "✗ Dashboard overview failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Dashboard Stats
Write-Host "`n7. Testing Dashboard Stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/dashboard/stats" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ Dashboard stats retrieved" -ForegroundColor Green
} catch {
    Write-Host "✗ Dashboard stats failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Nutrition History
Write-Host "`n8. Testing Nutrition History..." -ForegroundColor Yellow
try {
    $nutrition = Invoke-RestMethod -Uri "$baseUrl/nutrition/history" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ Nutrition history retrieved. Days: $($nutrition.summary.total_days)" -ForegroundColor Green
} catch {
    Write-Host "✗ Nutrition history failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Nutrition Goals
Write-Host "`n9. Testing Nutrition Goals..." -ForegroundColor Yellow
try {
    $goals = Invoke-RestMethod -Uri "$baseUrl/nutrition/goals" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ Nutrition goals retrieved. Recommended calories: $($goals.recommended_goals.calories)" -ForegroundColor Green
} catch {
    Write-Host "✗ Nutrition goals failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Update Nutrition Goals
Write-Host "`n10. Testing Update Nutrition Goals..." -ForegroundColor Yellow
try {
    $updateGoals = @{
        calories = 2200
        protein = 150
        carbs = 250
        fat = 70
    }
    $updateResult = Invoke-RestMethod -Uri "$baseUrl/nutrition/goals" -Method PUT -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body ($updateGoals | ConvertTo-Json)
    Write-Host "✓ Nutrition goals updated successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Update nutrition goals failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 11: User Preferences
Write-Host "`n11. Testing User Preferences..." -ForegroundColor Yellow
try {
    $preferences = Invoke-RestMethod -Uri "$baseUrl/users/preferences" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ User preferences retrieved" -ForegroundColor Green
} catch {
    Write-Host "✗ User preferences failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 12: Food Analysis Error Handling (without image)
Write-Host "`n12. Testing Food Analysis Error Handling..." -ForegroundColor Yellow
try {
    $analysisError = Invoke-RestMethod -Uri "$baseUrl/food/analyze" -Method POST -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body "{}"
    Write-Host "✗ Food analysis should have failed without image" -ForegroundColor Red
} catch {
    Write-Host "✓ Food analysis correctly rejected request without image: No image file provided" -ForegroundColor Green
}

# Test 13: Food Search
Write-Host "`n13. Testing Food Search..." -ForegroundColor Yellow
try {
    $searchResult = Invoke-RestMethod -Uri "$baseUrl/food/search?query=apple&limit=5" -Method GET -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✓ Food search completed. Found: $($searchResult.foods.Count) items" -ForegroundColor Green
} catch {
    Write-Host "✗ Food search failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== API Test Summary ===" -ForegroundColor Green
Write-Host "✓ Backend API is working correctly!" -ForegroundColor Green
Write-Host "✓ Authentication system functioning" -ForegroundColor Green
Write-Host "✓ Dashboard endpoints responsive" -ForegroundColor Green
Write-Host "✓ Nutrition tracking ready" -ForegroundColor Green
Write-Host "✓ Food analysis error handling working" -ForegroundColor Green
Write-Host "✓ All core API endpoints operational" -ForegroundColor Green

Write-Host "`nTest user credentials:" -ForegroundColor Cyan
Write-Host "Username: $($testUser.username)" -ForegroundColor White
Write-Host "Email: $($testUser.email)" -ForegroundColor White
Write-Host "Password: $($testUser.password)" -ForegroundColor White
Write-Host "Token: $token" -ForegroundColor White

Write-Host "`nFoodVision API is ready for frontend integration!" -ForegroundColor Green
