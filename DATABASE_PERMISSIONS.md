# 🗄️ MongoDB Atlas Database Permissions for BrainSAIT

## Database Configuration

**Database Name**: `brainsait_platform`  
**Cluster**: `Cluster0`  
**Collections**:
- `hospitals` - Hospital management data
- `patients` - Patient records (FHIR compliant)
- `ai_models` - AI model performance tracking
- `vision2030_metrics` - Saudi Vision 2030 compliance metrics

## 🔐 Required Permissions

### 1. MongoDB Atlas Data API Setup

#### Enable Data API
1. Go to MongoDB Atlas Dashboard
2. Select your project and cluster
3. Navigate to **Data API** section
4. Click **Enable the Data API**
5. Generate an API key

#### Data API Permissions
The API key needs these permissions:
```json
{
  "dataSource": "Cluster0",
  "database": "brainsait_platform",
  "collections": ["hospitals", "patients", "ai_models", "vision2030_metrics"],
  "permissions": {
    "read": true,
    "write": true,
    "delete": false
  }
}
```

### 2. Database User Permissions

Create a database user with these specific roles:
```json
{
  "roles": [
    {
      "role": "readWrite",
      "db": "brainsait_platform"
    },
    {
      "role": "read",
      "db": "admin"
    }
  ]
}
```

### 3. Network Access Configuration

#### IP Whitelist
Add these to Network Access:
- **Development**: Your local IP address
- **Production**: Cloudflare Workers IP ranges:
  ```
  0.0.0.0/0 (All IPs) - For Cloudflare Workers
  ```
  Or specific Cloudflare IP ranges if more restrictive access needed

### 4. Collection-Level Permissions

#### Required Operations per Collection:

**hospitals**:
- `find` - List hospitals
- `findOne` - Get hospital details
- `insertOne` - Create new hospital
- `updateOne` - Update hospital info

**patients**:
- `find` - List patients (with hospital filtering)
- `findOne` - Get patient details
- `insertOne` - Create patient records
- `updateOne` - Update patient data

**ai_models**:
- `find` - List AI models
- `findOne` - Get model details
- `insertOne` - Add new models
- `updateOne` - Update model metrics

**vision2030_metrics**:
- `find` - Get compliance metrics
- `insertOne` - Add new metrics
- `updateOne` - Update progress

### 🔧 Environment Variables Needed

Add these to your **Cloudflare Pages** dashboard:

```env
MONGODB_API_KEY=your_mongodb_data_api_key_here
MONGODB_API_URL=https://data.mongodb-api.com/app/data-kmxgp/endpoint/data/v1
MONGODB_PUBLIC_KEY=your_mongodb_public_key_here
```
### How to Get These Values:

#### MONGODB_API_KEY:
1. MongoDB Atlas Dashboard
2. Go to **Data API** section
3. Click **Create API Key**
4. Copy the generated key

#### MONGODB_API_URL:
1. In Data API section
2. Copy the **URL Endpoint**
3. Should look like: `https://data.mongodb-api.com/app/[app-id]/endpoint/data/v1`

## 🏥 Healthcare Data Compliance

### FHIR Compliance Requirements:
- Patient data follows FHIR R4 standards
- PHI (Protected Health Information) encryption
- Audit logging for all data access
- Role-based access control

### Saudi Healthcare Regulations:
- Data residency in Saudi Arabia (if required)
- NPHIES integration compliance
- Vision 2030 healthcare transformation tracking

## 🔒 Security Best Practices

1. **API Key Security**:
   - Store in Cloudflare Pages environment variables
   - Never commit to code repository
   - Rotate keys regularly

2. **Network Security**:
   - Use IP whitelisting when possible
   - Enable TLS/SSL for all connections
   - Monitor access logs

3. **Data Encryption**:
   - Enable encryption at rest in MongoDB Atlas
   - Use HTTPS for all API calls
   - Encrypt sensitive patient data fields

## 🚨 Current Status

The BrainSAIT integration is ready but requires:
1. ✅ MongoDB Atlas cluster setup
2. ❌ **Data API key generation needed**
3. ❌ **Environment variables in Cloudflare Pages**
4. ❌ **Database permissions configuration**

Once configured, the healthcare intelligence dashboard will be fully functional at `/brainsait` route.