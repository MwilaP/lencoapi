# Update Subscription Amount for Testing

## Quick Instructions

Update your `.env` file in `d:\personal\paymentapi\.env`:

Change this line:
```env
SUBSCRIPTION_AMOUNT=100.00
```

To this (for testing with K5):
```env
SUBSCRIPTION_AMOUNT=5.00
```

Or use K1 for even cheaper testing:
```env
SUBSCRIPTION_AMOUNT=1.00
```

Then restart the payment API:
```bash
pnpm run dev
```

That's it! The payment API will now use K5 (or K1) for subscriptions.
