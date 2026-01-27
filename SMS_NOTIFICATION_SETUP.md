# SMS Notification System Setup

This document describes the SMS notification system integrated with Africa's Talking API for booking notifications.

## Overview

The notification system sends SMS alerts to:
- **Providers**: When a booking is reserved (after client pays commitment fee)
- **Clients**: When a provider confirms or rejects their booking

## Installation

1. Install the Africa's Talking SDK:
```bash
pnpm install africastalking
```

2. Add the required environment variables to your `.env` file:
```env
AFRICASTALKING_USERNAME=your_africastalking_username
AFRICASTALKING_API_KEY=your_africastalking_api_key
AFRICASTALKING_SENDER_ID=your_sender_id  # Optional
```

## Getting Africa's Talking Credentials

1. Sign up at [Africa's Talking](https://africastalking.com/)
2. Create an application in your dashboard
3. Get your **Username** (usually your app name or "sandbox" for testing)
4. Get your **API Key** from the API Key section
5. (Optional) Register a **Sender ID** for branded SMS

### Sandbox Mode
For testing, use:
- Username: `sandbox`
- API Key: Get from your sandbox app
- Phone numbers must be in international format (e.g., +260971234567)

## Notification Flow

### 1. Provider Notification (Booking Reserved)
**Trigger**: After client successfully pays commitment fee
**Location**: `booking.service.ts` → `handleSuccessfulCommitmentPayment()`
**Message Format**:
```
New Booking Alert!

You have a new booking request for [Service Name].
Date: [Date] at [Time]
Amount: ZMW [Total]
Commitment Fee Paid: ZMW [Fee]

Please confirm or reject this booking in your dashboard.
```

### 2. Client Confirmation Notification
**Trigger**: When provider confirms the booking
**Location**: `booking.service.ts` → `confirmByProvider()`
**Message Format**:
```
Booking Confirmed!

[Provider Name] has confirmed your booking for [Service Name].
Date: [Date] at [Time]
Total Amount: ZMW [Total]
Remaining Balance: ZMW [Balance]

See you soon!
```

### 3. Client Rejection Notification
**Trigger**: When provider rejects the booking
**Location**: `booking.service.ts` → `rejectByProvider()`
**Message Format**:
```
Booking Update

Unfortunately, [Provider Name] cannot accommodate your booking for [Service Name].
Your commitment fee of ZMW [Fee] will be refunded.

Reason: [Rejection Reason]
```

## Database Requirements

### Provider Contact Number
Providers must have a `contact_number` field in the `provider_profiles` table:
```sql
ALTER TABLE provider_profiles 
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
```

### Client Phone Number
Clients must have a `phone_number` field in the `client_profiles` table. If not present, add:
```sql
ALTER TABLE client_profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
```

## Service Architecture

### NotificationService (`src/services/notification.service.ts`)
Main service handling all SMS notifications:
- `sendSMS()`: Core SMS sending function
- `notifyProviderOfReservation()`: Notifies provider of new booking
- `notifyClientOfConfirmation()`: Notifies client of booking confirmation
- `notifyClientOfRejection()`: Notifies client of booking rejection

### Integration Points
The notification service is integrated into `BookingService`:
1. **After payment success**: Notifies provider
2. **After confirmation**: Notifies client
3. **After rejection**: Notifies client with refund info

## Error Handling

- SMS failures are logged but don't block the booking flow
- Notifications run asynchronously (fire-and-forget)
- Missing phone numbers are logged as warnings
- If Africa's Talking credentials are not configured, notifications are skipped with a warning

## Testing

### Test in Sandbox Mode
1. Set `AFRICASTALKING_USERNAME=sandbox`
2. Use test phone numbers from Africa's Talking dashboard
3. Check SMS logs in Africa's Talking dashboard

### Production Checklist
- [ ] Register production app on Africa's Talking
- [ ] Get production API credentials
- [ ] Register Sender ID (optional but recommended)
- [ ] Test with real phone numbers
- [ ] Monitor SMS delivery rates
- [ ] Set up SMS credit alerts

## Phone Number Format

All phone numbers must be in international format:
- ✅ Correct: `+260971234567` (Zambia)
- ❌ Incorrect: `0971234567`, `971234567`

## Cost Considerations

- SMS costs vary by country and provider
- Monitor your Africa's Talking balance
- Consider implementing SMS rate limiting if needed
- Test thoroughly in sandbox before production

## Troubleshooting

### SMS Not Sending
1. Check Africa's Talking credentials are correct
2. Verify phone numbers are in international format
3. Check Africa's Talking account balance
4. Review logs for error messages: `logs/error.log`

### Provider Not Receiving SMS
- Verify `contact_number` is set in `provider_profiles`
- Check phone number format

### Client Not Receiving SMS
- Verify `phone_number` is set in `client_profiles`
- Check phone number format

## Future Enhancements

Potential improvements:
- SMS templates with variables
- Multi-language support
- SMS delivery status tracking
- Retry mechanism for failed SMS
- SMS notification preferences (opt-in/opt-out)
- WhatsApp integration via Africa's Talking
