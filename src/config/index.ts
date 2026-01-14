import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  lenco: {
    publicKey: process.env.LENCO_PUBLIC_KEY || '',
    secretKey: process.env.LENCO_SECRET_KEY || '',
    apiBaseUrl: (process.env.NODE_ENV === 'production' 
      ? process.env.LENCO_API_BASE_URL || 'https://api.lenco.co/access/v2'
      : process.env.LENCO_SANDBOX_API_BASE_URL || 'https://api.sandbox.lenco.co/access/v2'
    ).replace(/\/$/, ''), // Remove trailing slash
  },
  
  webhook: {
    secret: process.env.WEBHOOK_SECRET || '',
  },
  
  payment: {
    subscriptionAmount: parseFloat(process.env.SUBSCRIPTION_AMOUNT || '100.00'),
    contactUnlockAmount: parseFloat(process.env.CONTACT_UNLOCK_AMOUNT || '30.00'),
    referralAccessAmount: parseFloat(process.env.REFERRAL_ACCESS_AMOUNT || '30.00'),
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'ZMW',
  },

  booking: {
    paymentExpiryMinutes: parseInt(process.env.BOOKING_PAYMENT_EXPIRY_MINUTES || '15', 10),
    defaultCommitmentPercentage: parseFloat(process.env.BOOKING_COMMITMENT_PERCENTAGE || '35'),
    defaultCancellationDeadlineHours: parseInt(process.env.BOOKING_CANCELLATION_DEADLINE_HOURS || '24', 10),
    platformCommissionPercentage: parseFloat(process.env.PLATFORM_COMMISSION_PERCENTAGE || '10'),
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LENCO_PUBLIC_KEY',
  'LENCO_SECRET_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Debug: Log configuration (without exposing full keys)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Configuration Debug:');
  console.log('  - Supabase URL:', config.supabase.url);
  console.log('  - Supabase Key Length:', config.supabase.serviceRoleKey.length);
  console.log('  - Lenco Public Key:', config.lenco.publicKey.substring(0, 20) + '...');
  console.log('  - Lenco Secret Key Length:', config.lenco.secretKey.length);
  console.log('  - Lenco Secret Key Prefix:', config.lenco.secretKey.substring(0, 15) + '...');
  console.log('  - Lenco API Base URL:', config.lenco.apiBaseUrl);
  console.log('  - Node Environment:', config.nodeEnv);
}
