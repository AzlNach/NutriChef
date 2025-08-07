# FoodVision Deployment Guide dengan ngrok

## Prerequisites
1. Python 3.9+ terinstall
2. Node.js 16+ dan npm terinstall  
3. MySQL/MariaDB terinstall (via Laragon)
4. ngrok account dan authtoken

## Setup Instructions

### 1. Database Setup
```bash
# Masuk ke MySQL via Laragon Terminal
mysql -u root -p

# Import database schema
mysql -u root -p foodvision_db < database/schema.sql
```

### 2. Backend Setup
```bash
# Masuk ke direktori backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env file dengan credentials yang sesuai
# Minimal yang harus diisi:
# - DATABASE_URL
# - GEMINI_API_KEY  
# - USDA_API_KEY
# - SECRET_KEY
# - JWT_SECRET_KEY
```

### 3. Frontend Setup
```bash
# Masuk ke direktori frontend
cd frontend

# Install dependencies
npm install

# Install additional packages untuk FoodVision
npm install axios react-router-dom @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material chart.js react-chartjs-2
npm install react-dropzone react-image-crop

# Copy environment file
cp .env.example .env.local

# Edit .env.local dengan backend URL
```

### 4. ngrok Setup

#### Install ngrok
1. Download ngrok dari https://ngrok.com/download
2. Extract ke folder yang mudah diakses (misal: `C:\ngrok\`)
3. Tambahkan ke PATH atau gunakan full path

#### Konfigurasi ngrok
```bash
# Authenticate dengan authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE

# Untuk custom domain (opsional, perlu subscription)
ngrok config add-region us
```

## Development Deployment

### 1. Start Database (Laragon)
- Buka Laragon
- Start Apache & MySQL
- Pastikan MySQL berjalan di port 3306

### 2. Start Backend
```bash
cd backend
python app.py
# Backend akan berjalan di http://localhost:5000
```

### 3. Start Frontend  
```bash
cd frontend
npm start
# Frontend akan berjalan di http://localhost:3000
```

### 4. Expose dengan ngrok

#### Option 1: Expose Backend Only
```bash
# Expose backend API
ngrok http 5000

# Akan memberikan URL seperti: https://abc123.ngrok.io
# Update REACT_APP_API_URL di frontend/.env.local
```

#### Option 2: Expose Frontend Only (Recommended)
```bash
# Expose frontend yang sudah configured untuk backend localhost
ngrok http 3000

# Akan memberikan URL seperti: https://xyz789.ngrok.io
```

#### Option 3: Expose Both (Advanced)
```bash
# Terminal 1: Expose backend
ngrok http 5000 --subdomain foodvision-api

# Terminal 2: Expose frontend  
ngrok http 3000 --subdomain foodvision-app

# Update environment variables accordingly
```

### 5. Environment Configuration

#### Backend (.env)
```env
# Database
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/foodvision_db

# APIs
GEMINI_API_KEY=your_gemini_key_here
USDA_API_KEY=your_usda_key_here

# Security
SECRET_KEY=your_super_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_here

# CORS (add ngrok URLs)
CORS_ORIGINS=http://localhost:3000,https://xyz789.ngrok.io

# Upload
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
```

#### Frontend (.env.local)
```env
# API Base URL (update saat menggunakan ngrok)
REACT_APP_API_URL=http://localhost:5000/api
# atau
REACT_APP_API_URL=https://abc123.ngrok.io/api

# App Config
REACT_APP_NAME=FoodVision
REACT_APP_VERSION=1.0.0
```

## Production-Ready Deployment

### 1. Build Frontend
```bash
cd frontend
npm run build
```

### 2. Configure Production Backend
```bash
cd backend
pip install gunicorn

# Create wsgi.py if not exists
# Start dengan gunicorn
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

### 3. Serve Frontend Build
Option 1: Dengan Python
```bash
cd frontend/build
python -m http.server 3000
```

Option 2: Dengan Node.js serve
```bash
npm install -g serve
cd frontend
serve -s build -l 3000
```

### 4. ngrok untuk Production
```bash
# Dengan custom domain (perlu subscription)
ngrok http 3000 --domain=your-custom-domain.ngrok.app

# Atau dengan basic plan
ngrok http 3000 --region=us
```

## Testing & Monitoring

### 1. Test API Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Test dengan ngrok URL
curl https://abc123.ngrok.io/health
```

### 2. Monitor ngrok Dashboard
- Buka http://localhost:4040
- Monitor traffic, requests, responses
- Debug issues dengan logs

### 3. Database Monitoring
```sql
-- Check tables
SHOW TABLES;

-- Check user registrations
SELECT COUNT(*) FROM users;

-- Check food analysis sessions
SELECT COUNT(*) FROM food_analysis_sessions;
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Pastikan ngrok URL ada di CORS_ORIGINS
   - Restart backend setelah update .env

2. **Database Connection Failed**
   - Cek MySQL berjalan di Laragon
   - Verify credentials di DATABASE_URL
   - Test koneksi: `mysql -u root -p foodvision_db`

3. **Gemini API Errors**
   - Verify GEMINI_API_KEY valid
   - Check API quota/limits
   - Monitor error logs

4. **File Upload Issues**
   - Cek UPLOAD_FOLDER exists dan writable
   - Verify MAX_CONTENT_LENGTH setting
   - Check file permissions

5. **ngrok Issues**
   - Verify authtoken dengan `ngrok config check`
   - Check account limits (connections, bandwidth)
   - Try different regions jika slow

### Performance Tips

1. **Image Optimization**
   - Resize images before upload
   - Set optimal quality settings
   - Use WebP format jika supported

2. **API Caching**
   - Cache USDA nutrition data
   - Implement Redis caching
   - Cache frequent Gemini responses

3. **Database Optimization**
   - Add proper indexes
   - Optimize query performance
   - Regular maintenance

## Security Considerations

1. **API Keys**
   - Jangan commit .env files
   - Use environment variables
   - Rotate keys regularly

2. **CORS Configuration**
   - Restrictive CORS origins
   - HTTPS only di production
   - Secure headers

3. **File Upload Security**
   - Validate file types
   - Scan for malware
   - Limit file sizes

4. **ngrok Security**
   - Use authentication jika perlu
   - Monitor traffic logs
   - Consider custom domains

## Scaling Considerations

Untuk production scale yang lebih besar:

1. **Cloud Deployment**
   - AWS/GCP/Azure hosting
   - Docker containerization
   - Load balancers

2. **Database Scaling**
   - Read replicas
   - Connection pooling
   - Caching layer

3. **CDN & Storage**
   - CloudFront/CloudFlare
   - S3/GCS untuk images
   - Image optimization service

4. **Monitoring**
   - Application monitoring
   - Error tracking (Sentry)
   - Performance metrics
