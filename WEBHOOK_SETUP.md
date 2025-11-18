# Lencopay Webhook Setup Guide

## Overview

Webhooks allow Lencopay to notify your application in real-time when payment events occur (e.g., when a payment is completed).

## Webhook Endpoint

Your payment API already has a webhook endpoint configured at:
```
POST /api/webhooks/lencopay
```

This endpoint handles the `collection.successful` event from Lencopay.

## Setup Instructions

### For Local Development (Testing)

Since Lencopay cannot reach `localhost` directly, you need to use a tunneling service.

#### Option 1: Using ngrok (Recommended)

1. **Install ngrok**
   - Download from: https://ngrok.com/download
   - Or install via npm: `npm install -g ngrok`

2. **Start your payment API**
   ```bash
   cd d:\personal\paymentapi
   pnpm run dev
   ```

3. **Start ngrok tunnel**
   ```bash
   ngrok http 3001
   ```

4. **Copy the ngrok URL**
   You'll see output like:
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3001
   ```

5. **Your webhook URL will be:**
   ```
   https://abc123.ngrok.io/api/webhooks/lencopay
   ```

#### Option 2: Using localtunnel

1. **Install localtunnel**
   ```bash
   npm install -g localtunnel
   ```

2. **Start tunnel**
   ```bash
   lt --port 3001
   ```

3. **Your webhook URL:**
   ```
   https://your-subdomain.loca.lt/api/webhooks/lencopay
   ```

### For Production Deployment

Once deployed, your webhook URL will be:
```
https://your-domain.com/api/webhooks/lencopay
```

## Configure Webhook in Lencopay Dashboard

### Step 1: Login to Lencopay

1. Go to: https://app.lenco.co/login
2. Login with your credentials

### Step 2: Navigate to Webhook Settings

1. Click on **LencoPay/Collections** section
2. Look for **Webhooks**, **API Settings**, or **Developer Settings**
3. Click **Add Webhook** or **Configure Webhook**

### Step 3: Add Webhook URL

1. **Webhook URL**: Enter your webhook URL
   - Development: `https://your-ngrok-url.ngrok.io/api/webhooks/lencopay`
   - Production: `https://your-domain.com/api/webhooks/lencopay`

2. **Events to Subscribe**: Select or enable:
   - ✅ `collection.successful` - Payment completed successfully
   - ✅ `collection.failed` (optional) - Payment failed
   - ✅ `collection.pending` (optional) - Payment pending

3. **Webhook Secret** (if available):
   - Copy the webhook secret provided by Lencopay
   - Add it to your `.env` file:
     ```env
     WEBHOOK_SECRET=your-webhook-secret-here
     ```

4. **Save** the webhook configuration

### Step 4: Test the Webhook

1. Make a test payment through your application
2. Check your payment API logs for webhook events:
   ```bash
   tail -f d:\personal\paymentapi\logs\combined.log
   ```

3. You should see:
   ```
   Received Lencopay webhook {
     event: 'collection.successful',
     data: { reference: 'SUB-...' }
   }
   
   Payment completed via webhook {
     reference: 'SUB-...'
   }
   ```

## Webhook Payload Example

When a payment is successful, Lencopay sends:

```json
{
  "event": "collection.successful",
  "data": {
    "id": "uuid",
    "reference": "SUB-1234567890-ABC123",
    "amount": "100",
    "currency": "ZMW",
    "status": "successful",
    "completedAt": "2024-01-15T10:30:00Z",
    "mobileMoneyDetails": {
      "country": "zm",
      "phone": "0977123456",
      "operator": "airtel",
      "operatorTransactionId": "MP240115.1234.A12345"
    }
  }
}
```

## How It Works

1. **User initiates payment** → Lencopay sends push to phone
2. **User approves payment** → Payment processed
3. **Lencopay sends webhook** → Your API receives notification
4. **Your API processes webhook**:
   - Verifies payment with Lencopay
   - Updates payment status in database
   - Activates subscription or unlocks contact
5. **User sees success** → Immediate access granted

## Webhook Security

### Current Implementation

The webhook endpoint currently logs all incoming requests and processes `collection.successful` events.

### Optional: Webhook Signature Verification

To add signature verification (if Lencopay provides it):

1. Get webhook secret from Lencopay dashboard
2. Add to `.env`:
   ```env
   WEBHOOK_SECRET=your-webhook-secret
   ```

3. The webhook handler will log the signature for debugging

## Troubleshooting

### Webhook Not Received

**Check 1: Is the URL accessible?**
```bash
# Test your webhook URL
curl -X POST https://your-webhook-url/api/webhooks/lencopay \
  -H "Content-Type: application/json" \
  -d '{"event":"test","data":{}}'
```

**Check 2: Is ngrok running?**
- Make sure ngrok is still running
- ngrok URLs change each time you restart (unless you have a paid plan)

**Check 3: Check Lencopay dashboard**
- Look for webhook delivery logs
- Check for failed webhook attempts

**Check 4: Check your API logs**
```bash
tail -f d:\personal\paymentapi\logs\combined.log
```

### Webhook Received but Not Processing

**Check payment reference:**
- Ensure the reference in the webhook matches a payment in your database

**Check logs for errors:**
```bash
grep "webhook" d:\personal\paymentapi\logs\error.log
```

### Testing Webhooks Manually

You can manually trigger the webhook handler:

```bash
curl -X POST http://localhost:3001/api/webhooks/lencopay \
  -H "Content-Type: application/json" \
  -d '{
    "event": "collection.successful",
    "data": {
      "reference": "SUB-1234567890-ABC123"
    }
  }'
```

## Webhook Endpoint Code

The webhook is already implemented in `src/routes/webhook.routes.ts`:

```typescript
router.post('/lencopay', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    logger.info('Received Lencopay webhook', { data: webhookData });

    // Handle collection.successful event
    if (webhookData.event === 'collection.successful') {
      const reference = webhookData.data?.reference;
      
      if (!reference) {
        return res.status(400).json({
          success: false,
          error: { message: 'Missing payment reference' }
        });
      }

      // Verify and complete the payment
      await paymentService.verifyAndCompletePayment(reference);
      
      logger.info('Payment completed via webhook', { reference });
      
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error: any) {
    logger.error('Failed to process webhook', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process webhook' }
    });
  }
});
```

## Production Checklist

- [ ] Deploy payment API to production server
- [ ] Configure production webhook URL in Lencopay dashboard
- [ ] Set `WEBHOOK_SECRET` in production environment
- [ ] Test webhook with real payment
- [ ] Monitor webhook logs
- [ ] Set up alerts for failed webhooks

## Support

If you need help configuring webhooks:
- **Lencopay Support**: [email protected]
- **API Documentation**: https://lenco-api.readme.io/v2.0/reference

## Notes

- Webhooks are **optional** - the payment API also polls for payment status
- Webhooks provide **real-time updates** for better user experience
- Without webhooks, users wait for polling (up to 10 seconds between checks)
- With webhooks, subscription/unlock is instant when payment completes
