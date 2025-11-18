# Lencopay Authentication Troubleshooting Guide

## Current Issue
Getting 401 Unauthorized errors when calling Lencopay API.

## Debug Steps Added

### 1. Configuration Debug Output
When the server starts, you'll now see:
```
🔧 Configuration Debug:
  - Supabase URL: https://...
  - Supabase Key Length: XXX
  - Lenco Public Key: pub-88dd921c0ecd...
  - Lenco Secret Key Length: XXX
  - Lenco Secret Key Prefix: 94246ce346bbe6f...
  - Lenco API Base URL: https://api.sandbox.lenco.co/access/v2
  - Node Environment: development
```

### 2. Enhanced Request Logging
Each API request will show:
- Full URL being called
- Headers being sent (masked)
- Request data

### 3. Enhanced Error Logging
Errors will show:
- HTTP status code
- Response data from Lencopay
- Which headers were sent
- Request method and URL

## Things to Check

### 1. Verify API Keys
The keys in your `.env` file should be:

**For Sandbox (Development):**
- `LENCO_PUBLIC_KEY` - starts with `pub-` (for frontend)
- `LENCO_SECRET_KEY` - long alphanumeric string (for backend API calls)
- `LENCO_SANDBOX_API_BASE_URL=https://api.sandbox.lenco.co/access/v2`

**For Production:**
- Different keys from Lencopay dashboard
- `LENCO_API_BASE_URL=https://api.lenco.co/access/v2`

### 2. Check API Key Format
Lencopay API keys should look like:
- Public Key: `pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Secret Key: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (64 chars)

### 3. Verify API Endpoint
Make sure you're using the correct base URL:
- Sandbox: `https://api.sandbox.lenco.co/access/v2`
- Production: `https://api.lenco.co/access/v2`

### 4. Test Authentication Manually

Try this curl command to test your secret key:

```bash
curl -X POST https://api.sandbox.lenco.co/access/v2/collections/mobile-money \
  -H "api-key: YOUR_SECRET_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "currency": "ZMW",
    "reference": "TEST-123456",
    "email": "test@example.com",
    "phone": "0977123456",
    "country": "zm",
    "operator": "airtel",
    "bearer": "customer"
  }'
```

If this returns 401, your API key is invalid or not activated.

## Common Issues

### Issue 1: Wrong API Key Type
**Problem:** Using public key instead of secret key
**Solution:** Make sure `LENCO_SECRET_KEY` in `.env` is the SECRET key, not the public key

### Issue 2: API Key Not Activated
**Problem:** Keys exist but not activated in Lencopay dashboard
**Solution:** 
1. Login to Lencopay dashboard
2. Go to API Keys section
3. Ensure keys are activated for your environment (sandbox/production)

### Issue 3: Wrong Environment
**Problem:** Using production keys with sandbox URL or vice versa
**Solution:** Match your keys to the environment:
- Sandbox keys → Sandbox URL
- Production keys → Production URL

### Issue 4: Whitespace in API Key
**Problem:** Extra spaces or newlines in `.env` file
**Solution:** Ensure no spaces around the `=` sign:
```env
LENCO_SECRET_KEY=your_key_here
# NOT: LENCO_SECRET_KEY = your_key_here
```

### Issue 5: API Key Permissions
**Problem:** API key doesn't have permission for collections
**Solution:** Check Lencopay dashboard for key permissions

## Next Steps

1. **Restart the server** to see the new debug output
2. **Check the logs** for the configuration values
3. **Verify your API keys** match the format above
4. **Test with curl** to isolate if it's a key issue or code issue
5. **Contact Lencopay support** if keys are correct but still failing

## Expected Log Output

When working correctly, you should see:

```
🔧 Configuration Debug:
  - Lenco Secret Key Length: 64
  - Lenco API Base URL: https://api.sandbox.lenco.co/access/v2

Initializing Lencopay Service {
  baseURL: 'https://api.sandbox.lenco.co/access/v2',
  hasSecretKey: true,
  secretKeyLength: 64,
  secretKeyPrefix: '94246ce346...'
}

Lenco API Request {
  method: 'post',
  url: '/collections/mobile-money',
  fullURL: 'https://api.sandbox.lenco.co/access/v2/collections/mobile-money',
  headers: {
    'api-key': '94246ce346...',
    'Content-Type': 'application/json'
  }
}

Lenco API Response {
  status: 200,
  data: { status: true, ... }
}
```

## Contact Lencopay Support

If all else fails:
- Email: [email protected]
- Provide: Your account email, environment (sandbox/production), and error logs
- Ask them to verify your API keys are active and have correct permissions
