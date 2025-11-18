# Lencopay Payment API

A robust payment API for Zambian mobile money payments using Lencopay gateway, integrated with Supabase for subscription and contact unlock management.

## Features

- 💳 **Mobile Money Payments**: Support for MTN, Airtel, and Zamtel mobile money in Zambia
- 🔄 **Subscription Management**: Automated monthly subscription handling
- 🔓 **Contact Unlocks**: One-time payment for unlocking provider contacts
- 🔐 **Secure**: Built with security best practices (Helmet, CORS, Rate Limiting)
- 📊 **Database Integration**: Seamless Supabase integration for payment tracking
- 🪝 **Webhook Support**: Real-time payment status updates via webhooks
- 📝 **Comprehensive Logging**: Winston-based logging for debugging and monitoring

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Payment Gateway**: Lencopay API v2.0
- **Database**: Supabase (PostgreSQL)
- **Validation**: Express Validator
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js 18+ 
- npm or yarn or pnpm
- Supabase account and project
- Lencopay account with API credentials

## Installation

1. **Clone or navigate to the repository**:
   ```bash
   cd d:\personal\paymentapi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Lencopay Configuration
   LENCO_PUBLIC_KEY=your-lenco-public-key
   LENCO_SECRET_KEY=your-lenco-secret-key

   # Payment Configuration
   SUBSCRIPTION_AMOUNT=100.00
   CONTACT_UNLOCK_AMOUNT=30.00
   DEFAULT_CURRENCY=ZMW
   ```

5. **Run database migrations** (if not already done):
   - The API expects the following tables in Supabase:
     - `subscriptions`
     - `contact_unlocks`
     - `payments`
     - `provider_profiles`
   - These should already exist from your main application's schema

## Usage

### Development

```bash
npm run dev
```

The API will start on `http://localhost:3001` (or your configured PORT).

### Production

```bash
# Build the TypeScript code
npm run build

# Start the production server
npm start
```

## API Endpoints

### Health Check

```http
GET /health
```

Returns the API status.

### Payment Endpoints

#### 1. Initiate Subscription Payment

```http
POST /api/payments/subscription/initiate
Content-Type: application/json

{
  "userId": "uuid-of-user",
  "email": "[email protected]",
  "phone": "0977123456",
  "operator": "airtel",
  "plan": "monthly"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reference": "SUB-1234567890-ABC123",
    "paymentId": "payment-uuid",
    "status": "pay-offline"
  },
  "message": "Subscription payment initiated. Please complete payment on your phone."
}
```

#### 2. Initiate Contact Unlock Payment

```http
POST /api/payments/contact-unlock/initiate
Content-Type: application/json

{
  "clientId": "uuid-of-client",
  "providerId": "uuid-of-provider",
  "email": "[email protected]",
  "phone": "0977123456",
  "operator": "mtn"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reference": "UNLOCK-1234567890-XYZ789",
    "paymentId": "payment-uuid",
    "status": "pay-offline"
  },
  "message": "Contact unlock payment initiated. Please complete payment on your phone."
}
```

#### 3. Verify Payment

```http
POST /api/payments/verify
Content-Type: application/json

{
  "reference": "SUB-1234567890-ABC123"
}
```

**Response**:
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
    "transaction_reference": "SUB-1234567890-ABC123",
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:32:00Z"
  },
  "message": "Payment verified successfully"
}
```

#### 4. Get Payment by Reference

```http
GET /api/payments/:reference
```

#### 5. Get User Payments

```http
GET /api/payments/user/:userId
```

#### 6. Get Public Key

```http
GET /api/payments/config/public-key
```

Returns the Lencopay public key for client-side integration.

### Webhook Endpoint

```http
POST /api/webhooks/lencopay
Content-Type: application/json

{
  "event": "collection.successful",
  "data": {
    "reference": "SUB-1234567890-ABC123",
    "amount": "100.00",
    "status": "successful"
  }
}
```

## Mobile Money Operators

The API supports the following Zambian mobile money operators:

- **MTN Mobile Money**: `operator: "mtn"`
- **Airtel Money**: `operator: "airtel"`
- **Zamtel Kwacha**: `operator: "zamtel"`

## Phone Number Format

Phone numbers must be in Zambian format:
- Start with `09` or `07`
- Followed by 8 digits
- Example: `0977123456` or `0971234567`

## Payment Flow

### Subscription Payment Flow

1. Client initiates payment via `/api/payments/subscription/initiate`
2. API creates a payment record in Supabase with status `pending`
3. API calls Lencopay to initiate mobile money collection
4. Lencopay sends a push notification to the customer's phone
5. Customer approves payment on their phone
6. Lencopay sends a webhook to `/api/webhooks/lencopay` with status update
7. API verifies payment and updates status to `completed`
8. API activates subscription in Supabase (1 month from payment date)

### Contact Unlock Payment Flow

1. Client initiates payment via `/api/payments/contact-unlock/initiate`
2. API checks if contact is already unlocked
3. API creates a payment record in Supabase with status `pending`
4. API calls Lencopay to initiate mobile money collection
5. Customer approves payment on their phone
6. Lencopay sends webhook notification
7. API verifies payment and creates contact unlock record in Supabase

## Database Schema

The API integrates with the following Supabase tables:

### `payments`
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `amount`: Decimal
- `payment_type`: 'subscription' | 'contact_unlock'
- `payment_method`: 'mobile_money' | 'card'
- `status`: 'pending' | 'completed' | 'failed'
- `provider_id`: UUID (Optional, for contact unlocks)
- `transaction_reference`: String (Unique)
- `created_at`: Timestamp
- `completed_at`: Timestamp (Optional)

### `subscriptions`
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key, Unique)
- `active`: Boolean
- `plan`: String
- `amount`: Decimal
- `start_date`: Timestamp
- `end_date`: Timestamp
- `created_at`: Timestamp
- `updated_at`: Timestamp

### `contact_unlocks`
- `id`: UUID (Primary Key)
- `client_id`: UUID (Foreign Key)
- `provider_id`: UUID (Foreign Key)
- `amount`: Decimal
- `unlocked_at`: Timestamp
- Unique constraint on (client_id, provider_id)

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

## Security

- **Helmet**: Adds security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All inputs are validated using express-validator
- **Environment Variables**: Sensitive data stored in environment variables

## Logging

Logs are stored in the `logs/` directory:
- `error.log`: Error-level logs only
- `combined.log`: All logs

In development, logs are also output to the console with colors.

## Testing with Sandbox

For testing, use the Lencopay sandbox environment:

1. Set `NODE_ENV=development` in your `.env` file
2. Use sandbox API credentials from Lencopay
3. Use test mobile money accounts provided by Lencopay

## Integration with Your Frontend

### Example: Initiate Subscription Payment

```typescript
const initiateSubscription = async (userId: string, email: string, phone: string) => {
  try {
    const response = await fetch('http://localhost:3001/api/payments/subscription/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        phone,
        operator: 'airtel', // or 'mtn', 'zamtel'
        plan: 'monthly',
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      // Show success message to user
      alert('Payment initiated! Please check your phone to complete the payment.');
      
      // Poll for payment status or wait for webhook
      pollPaymentStatus(data.data.reference);
    }
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
};

const pollPaymentStatus = async (reference: string) => {
  const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`http://localhost:3001/api/payments/${reference}`);
      const data = await response.json();
      
      if (data.data.status === 'completed') {
        clearInterval(interval);
        alert('Payment successful! Your subscription is now active.');
      } else if (data.data.status === 'failed' || attempts >= maxAttempts) {
        clearInterval(interval);
        alert('Payment failed or timed out. Please try again.');
      }
    } catch (error) {
      console.error('Failed to check payment status:', error);
    }
  }, 10000); // Check every 10 seconds
};
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**
   - Ensure all required variables are set in `.env` file
   - Check that `.env` file is in the root directory

2. **"Failed to connect to Supabase"**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Check that your Supabase project is active

3. **"Failed to initiate payment"**
   - Verify Lencopay API credentials
   - Check that you're using the correct environment (sandbox vs production)
   - Ensure phone number is in correct format

4. **"Contact already unlocked"**
   - This is expected behavior if the contact was previously unlocked
   - Check the `contact_unlocks` table in Supabase

## Support

For issues related to:
- **Lencopay API**: Contact [email protected]
- **This API**: Check the logs in the `logs/` directory

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript best practices
- All endpoints are properly validated
- Error handling is comprehensive
- Logging is added for debugging
