# API Testing Guide

This guide provides examples for testing the Lencopay Payment API endpoints.

## Setup

### Using cURL

All examples below use cURL. Make sure you have it installed:
```bash
curl --version
```

### Using Postman

Import the following base URL into Postman:
- Development: `http://localhost:3001`
- Production: `https://api.yourdomain.com`

### Using Thunder Client (VS Code)

Install Thunder Client extension and use the examples below.

## Test Endpoints

### 1. Health Check

```bash
curl -X GET http://localhost:3001/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Lencopay Payment API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get Public Key

```bash
curl -X GET http://localhost:3001/api/payments/config/public-key
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "publicKey": "your-lenco-public-key"
  }
}
```

### 3. Initiate Subscription Payment

```bash
curl -X POST http://localhost:3001/api/payments/subscription/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "[email protected]",
    "phone": "0977123456",
    "operator": "airtel",
    "plan": "monthly"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "reference": "SUB-1705315800000-ABC123",
    "paymentId": "payment-uuid",
    "status": "pay-offline"
  },
  "message": "Subscription payment initiated. Please complete payment on your phone."
}
```

### 4. Initiate Contact Unlock Payment

```bash
curl -X POST http://localhost:3001/api/payments/contact-unlock/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "123e4567-e89b-12d3-a456-426614174000",
    "providerId": "987e6543-e21b-12d3-a456-426614174999",
    "email": "[email protected]",
    "phone": "0971234567",
    "operator": "mtn"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "reference": "UNLOCK-1705315800000-XYZ789",
    "paymentId": "payment-uuid",
    "status": "pay-offline"
  },
  "message": "Contact unlock payment initiated. Please complete payment on your phone."
}
```

### 5. Verify Payment

```bash
curl -X POST http://localhost:3001/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "SUB-1705315800000-ABC123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "user_id": "user-uuid",
    "amount": 100.00,
    "payment_type": "subscription",
    "payment_method": "mobile_money",
    "status": "completed",
    "transaction_reference": "SUB-1705315800000-ABC123",
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:32:00Z"
  },
  "message": "Payment verified successfully"
}
```

### 6. Get Payment by Reference

```bash
curl -X GET http://localhost:3001/api/payments/SUB-1705315800000-ABC123
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "user_id": "user-uuid",
    "amount": 100.00,
    "payment_type": "subscription",
    "payment_method": "mobile_money",
    "status": "completed",
    "transaction_reference": "SUB-1705315800000-ABC123",
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:32:00Z"
  }
}
```

### 7. Get User Payments

```bash
curl -X GET http://localhost:3001/api/payments/user/123e4567-e89b-12d3-a456-426614174000
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-uuid-1",
      "user_id": "user-uuid",
      "amount": 100.00,
      "payment_type": "subscription",
      "payment_method": "mobile_money",
      "status": "completed",
      "transaction_reference": "SUB-1705315800000-ABC123",
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:32:00Z"
    },
    {
      "id": "payment-uuid-2",
      "user_id": "user-uuid",
      "amount": 30.00,
      "payment_type": "contact_unlock",
      "payment_method": "mobile_money",
      "status": "completed",
      "provider_id": "provider-uuid",
      "transaction_reference": "UNLOCK-1705315900000-XYZ789",
      "created_at": "2024-01-15T11:30:00Z",
      "completed_at": "2024-01-15T11:32:00Z"
    }
  ]
}
```

### 8. Webhook Test (Simulate Lencopay Webhook)

```bash
curl -X POST http://localhost:3001/api/webhooks/lencopay \
  -H "Content-Type: application/json" \
  -d '{
    "event": "collection.successful",
    "data": {
      "reference": "SUB-1705315800000-ABC123",
      "amount": "100.00",
      "status": "successful",
      "lencoReference": "240720004",
      "completedAt": "2024-01-15T10:32:00Z"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## Error Testing

### 1. Invalid Phone Number

```bash
curl -X POST http://localhost:3001/api/payments/subscription/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "[email protected]",
    "phone": "1234567890",
    "operator": "airtel",
    "plan": "monthly"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid Zambian phone number is required (e.g., 0977123456)",
      "param": "phone",
      "location": "body"
    }
  ]
}
```

### 2. Invalid Operator

```bash
curl -X POST http://localhost:3001/api/payments/subscription/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "[email protected]",
    "phone": "0977123456",
    "operator": "vodacom",
    "plan": "monthly"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid operator is required (mtn, airtel, or zamtel)",
      "param": "operator",
      "location": "body"
    }
  ]
}
```

### 3. Missing Required Fields

```bash
curl -X POST http://localhost:3001/api/payments/subscription/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    },
    {
      "msg": "Valid Zambian phone number is required (e.g., 0977123456)",
      "param": "phone",
      "location": "body"
    },
    {
      "msg": "Valid operator is required (mtn, airtel, or zamtel)",
      "param": "operator",
      "location": "body"
    }
  ]
}
```

### 4. Payment Not Found

```bash
curl -X GET http://localhost:3001/api/payments/INVALID-REFERENCE
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Payment not found"
  }
}
```

### 5. Contact Already Unlocked

```bash
# First unlock
curl -X POST http://localhost:3001/api/payments/contact-unlock/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "123e4567-e89b-12d3-a456-426614174000",
    "providerId": "987e6543-e21b-12d3-a456-426614174999",
    "email": "[email protected]",
    "phone": "0971234567",
    "operator": "mtn"
  }'

# Try to unlock again (after first payment completes)
curl -X POST http://localhost:3001/api/payments/contact-unlock/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "123e4567-e89b-12d3-a456-426614174000",
    "providerId": "987e6543-e21b-12d3-a456-426614174999",
    "email": "[email protected]",
    "phone": "0971234567",
    "operator": "mtn"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "message": "Contact already unlocked"
  }
}
```

## Testing with Postman Collection

Create a Postman collection with the following structure:

```json
{
  "info": {
    "name": "Lencopay Payment API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001"
    },
    {
      "key": "userId",
      "value": "123e4567-e89b-12d3-a456-426614174000"
    },
    {
      "key": "providerId",
      "value": "987e6543-e21b-12d3-a456-426614174999"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Initiate Subscription",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/payments/subscription/initiate",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": \"{{userId}}\",\n  \"email\": \"[email protected]\",\n  \"phone\": \"0977123456\",\n  \"operator\": \"airtel\",\n  \"plan\": \"monthly\"\n}"
        }
      }
    }
  ]
}
```

## Integration Testing Script

Create a test script to verify the full payment flow:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
USER_ID="123e4567-e89b-12d3-a456-426614174000"
PROVIDER_ID="987e6543-e21b-12d3-a456-426614174999"

echo "Testing Lencopay Payment API..."

# Test 1: Health Check
echo -e "\n1. Testing Health Check..."
curl -s -X GET "$BASE_URL/health" | jq

# Test 2: Get Public Key
echo -e "\n2. Testing Get Public Key..."
curl -s -X GET "$BASE_URL/api/payments/config/public-key" | jq

# Test 3: Initiate Subscription Payment
echo -e "\n3. Testing Initiate Subscription Payment..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/payments/subscription/initiate" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"email\": \"[email protected]\",
    \"phone\": \"0977123456\",
    \"operator\": \"airtel\",
    \"plan\": \"monthly\"
  }")
echo "$RESPONSE" | jq

# Extract reference for verification
REFERENCE=$(echo "$RESPONSE" | jq -r '.data.reference')

# Test 4: Get Payment by Reference
echo -e "\n4. Testing Get Payment by Reference..."
curl -s -X GET "$BASE_URL/api/payments/$REFERENCE" | jq

# Test 5: Get User Payments
echo -e "\n5. Testing Get User Payments..."
curl -s -X GET "$BASE_URL/api/payments/user/$USER_ID" | jq

echo -e "\n✅ All tests completed!"
```

Save as `test-api.sh` and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

## Load Testing

Use Apache Bench or Artillery for load testing:

### Using Apache Bench

```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/health

# Test payment initiation (requires POST data file)
ab -n 100 -c 5 -p payment-data.json -T application/json \
  http://localhost:3001/api/payments/subscription/initiate
```

### Using Artillery

Create `artillery-config.yml`:
```yaml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health Check"
    flow:
      - get:
          url: "/health"
  - name: "Get Public Key"
    flow:
      - get:
          url: "/api/payments/config/public-key"
```

Run:
```bash
npm install -g artillery
artillery run artillery-config.yml
```

## Monitoring During Tests

While running tests, monitor:

1. **Application Logs**:
   ```bash
   tail -f logs/combined.log
   ```

2. **System Resources**:
   ```bash
   htop
   ```

3. **Database Connections** (Supabase Dashboard)

4. **API Response Times** (use Postman or Artillery reports)

## Test Data Cleanup

After testing, clean up test data from Supabase:

```sql
-- Delete test payments
DELETE FROM payments WHERE transaction_reference LIKE 'SUB-%' OR transaction_reference LIKE 'UNLOCK-%';

-- Delete test subscriptions
DELETE FROM subscriptions WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- Delete test contact unlocks
DELETE FROM contact_unlocks WHERE client_id = '123e4567-e89b-12d3-a456-426614174000';
```

## Troubleshooting Tests

### Issue: Connection Refused

**Solution**: Ensure the API is running:
```bash
npm run dev
```

### Issue: Invalid UUID

**Solution**: Use valid UUIDs for testing. Generate with:
```bash
node -e "console.log(require('crypto').randomUUID())"
```

### Issue: Lencopay API Errors

**Solution**: 
- Check API credentials in `.env`
- Verify you're using sandbox credentials for testing
- Check Lencopay API status

### Issue: Database Errors

**Solution**:
- Verify Supabase connection
- Check RLS policies
- Ensure tables exist

## Next Steps

After successful testing:
1. Review logs for any warnings or errors
2. Optimize slow endpoints
3. Add more comprehensive error handling
4. Set up automated testing with Jest
5. Configure CI/CD pipeline
