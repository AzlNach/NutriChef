# ngrok Setup and Deployment Script untuk NutriChef

Write-Host "=== NutriChef ngrok Setup & Deployment ===" -ForegroundColor Green

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version 2>&1
    Write-Host "✓ ngrok found: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok not found. Please install ngrok first:" -ForegroundColor Red
    Write-Host "   1. Download from https://ngrok.com/download" -ForegroundColor White
    Write-Host "   2. Extract to C:\ngrok\ or add to PATH" -ForegroundColor White
    Write-Host "   3. Run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    exit 1
}

# Check if services are running
$frontendRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
$backendRunning = Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet -WarningAction SilentlyContinue

Write-Host "`nService Status:" -ForegroundColor Yellow
Write-Host "Frontend (3000): $(if ($frontendRunning) { '✓ Running' } else { '❌ Not Running' })" -ForegroundColor $(if ($frontendRunning) { 'Green' } else { 'Red' })
Write-Host "Backend (5000):  $(if ($backendRunning) { '✓ Running' } else { '❌ Not Running' })" -ForegroundColor $(if ($backendRunning) { 'Green' } else { 'Red' })

if (!$frontendRunning -and !$backendRunning) {
    Write-Host "`n⚠️  No services running. Please start them first:" -ForegroundColor Yellow
    Write-Host "   Run: .\start-dev.ps1" -ForegroundColor White
    exit 1
}

# Show options
Write-Host "`n🌐 Choose deployment option:" -ForegroundColor Cyan
Write-Host "1. Expose Frontend Only (Recommended for testing)" -ForegroundColor White
Write-Host "2. Expose Backend Only (For API testing)" -ForegroundColor White  
Write-Host "3. Expose Both (Advanced - requires 2 terminals)" -ForegroundColor White
Write-Host "4. Show Current ngrok Status" -ForegroundColor White

$choice = Read-Host "`nEnter your choice (1-4)"

switch ($choice) {
    "1" {
        if (!$frontendRunning) {
            Write-Host "❌ Frontend is not running on port 3000" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "`n🚀 Exposing Frontend on port 3000..." -ForegroundColor Green
        Write-Host "This will make your React app accessible from the internet" -ForegroundColor Gray
        Write-Host "The backend should remain on localhost:5000" -ForegroundColor Gray
        Write-Host "`nPress Ctrl+C to stop ngrok" -ForegroundColor Yellow
        
        # Start ngrok for frontend
        ngrok http 3000
    }
    
    "2" {
        if (!$backendRunning) {
            Write-Host "❌ Backend is not running on port 5000" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "`n🚀 Exposing Backend API on port 5000..." -ForegroundColor Green
        Write-Host "This will make your API accessible from the internet" -ForegroundColor Gray
        Write-Host "Remember to update REACT_APP_API_URL in frontend/.env.local" -ForegroundColor Yellow
        Write-Host "`nPress Ctrl+C to stop ngrok" -ForegroundColor Yellow
        
        # Start ngrok for backend
        ngrok http 5000
    }
    
    "3" {
        Write-Host "`n🚀 Starting ngrok for both services..." -ForegroundColor Green
        Write-Host "This will open 2 terminal windows for ngrok tunnels" -ForegroundColor Gray
        
        if ($frontendRunning) {
            Write-Host "Starting ngrok for Frontend (3000)..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList @(
                "-NoExit",
                "-Command",
                "Write-Host 'Frontend ngrok tunnel (Port 3000)' -ForegroundColor Green; ngrok http 3000"
            )
        }
        
        Start-Sleep -Seconds 2
        
        if ($backendRunning) {
            Write-Host "Starting ngrok for Backend (5000)..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList @(
                "-NoExit", 
                "-Command",
                "Write-Host 'Backend ngrok tunnel (Port 5000)' -ForegroundColor Green; ngrok http 5000"
            )
        }
        
        Write-Host "`n✅ Both ngrok tunnels started in separate windows" -ForegroundColor Green
        Write-Host "📝 Remember to:" -ForegroundColor Yellow
        Write-Host "   1. Note the URLs from both ngrok windows" -ForegroundColor White
        Write-Host "   2. Update CORS_ORIGINS in backend/.env with frontend URL" -ForegroundColor White
        Write-Host "   3. Update REACT_APP_API_URL in frontend/.env.local with backend URL" -ForegroundColor White
        Write-Host "   4. Restart services after updating environment files" -ForegroundColor White
    }
    
    "4" {
        Write-Host "`n📊 Checking ngrok status..." -ForegroundColor Cyan
        
        try {
            # Check if ngrok web interface is accessible
            $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
            
            if ($ngrokApi.tunnels.Count -gt 0) {
                Write-Host "`n✅ Active ngrok tunnels:" -ForegroundColor Green
                foreach ($tunnel in $ngrokApi.tunnels) {
                    $localAddr = $tunnel.config.addr
                    $publicUrl = $tunnel.public_url
                    Write-Host "   $localAddr → $publicUrl" -ForegroundColor White
                }
                
                Write-Host "`n🌐 ngrok Web Interface: http://localhost:4040" -ForegroundColor Cyan
            } else {
                Write-Host "`n❌ No active ngrok tunnels found" -ForegroundColor Red
            }
        } catch {
            Write-Host "`n❌ ngrok is not running or web interface is not accessible" -ForegroundColor Red
            Write-Host "   Start ngrok first with options 1, 2, or 3" -ForegroundColor White
        }
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

if ($choice -in @("1", "2", "3")) {
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "📱 ngrok Deployment Tips:" -ForegroundColor Yellow
    Write-Host "="*60 -ForegroundColor Green
    
    Write-Host "`n🔗 URL Management:" -ForegroundColor Cyan
    Write-Host "• ngrok URLs change each time you restart (free plan)" -ForegroundColor White
    Write-Host "• Consider upgrading to ngrok Pro for static URLs" -ForegroundColor White
    Write-Host "• Use custom domains for production deployment" -ForegroundColor White
    
    Write-Host "`n🔒 Security Notes:" -ForegroundColor Yellow
    Write-Host "• Your app will be publicly accessible" -ForegroundColor White
    Write-Host "• Consider adding authentication for sensitive data" -ForegroundColor White
    Write-Host "• Monitor usage in ngrok dashboard" -ForegroundColor White
    
    Write-Host "`n⚙️  Configuration Updates:" -ForegroundColor Cyan
    Write-Host "• Update CORS settings in backend when exposing frontend" -ForegroundColor White
    Write-Host "• Update API URL in frontend when exposing backend" -ForegroundColor White
    Write-Host "• Restart services after environment changes" -ForegroundColor White
    
    Write-Host "`n🐛 Troubleshooting:" -ForegroundColor Red
    Write-Host "• If tunnel fails: Check if ports are really running" -ForegroundColor White
    Write-Host "• If app doesn't load: Verify CORS and API URL settings" -ForegroundColor White
    Write-Host "• If API fails: Check authentication token in requests" -ForegroundColor White
}
