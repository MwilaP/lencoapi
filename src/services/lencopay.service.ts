import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface MobileMoneyPaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  email: string;
  phone: string;
  country: string;
  operator: 'mtn' | 'airtel' | 'zamtel';
  bearer?: 'merchant' | 'customer';
}

export interface PaymentVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    initiatedAt: string;
    completedAt: string | null;
    amount: string;
    fee: string | null;
    bearer: 'merchant' | 'customer';
    currency: string;
    reference: string;
    lencoReference: string;
    type: 'mobile-money' | 'card';
    status: 'pending' | 'successful' | 'failed' | 'pay-offline';
    source: string;
    reasonForFailure: string | null;
    settlementStatus: 'pending' | 'settled' | null;
    settlement: any;
    mobileMoneyDetails: {
      country: string;
      phone: string;
      operator: string;
      accountName: string | null;
      operatorTransactionId: string | null;
    } | null;
    bankAccountDetails: any;
    cardDetails: any;
  };
}

export class LencoPayService {
  private client: AxiosInstance;

  constructor() {
    // Log configuration for debugging
    logger.info('Initializing Lencopay Service', {
      baseURL: config.lenco.apiBaseUrl,
      hasSecretKey: !!config.lenco.secretKey,
      secretKeyLength: config.lenco.secretKey?.length || 0,
      secretKeyPrefix: config.lenco.secretKey?.substring(0, 10) + '...',
      hasPublicKey: !!config.lenco.publicKey,
      publicKeyPrefix: config.lenco.publicKey?.substring(0, 15) + '...',
    });

    this.client = axios.create({
      baseURL: config.lenco.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${config.lenco.secretKey}`,
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Lenco API Request', {
          method: config.method,
          url: config.url,
          fullURL: `${config.baseURL}${config.url}`,
          headers: {
            'Authorization': config.headers?.['Authorization'] ? 'Bearer ***...' : 'MISSING',
            'Content-Type': config.headers?.['Content-Type'],
            'accept': config.headers?.['accept'],
          },
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('Lenco API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Lenco API Response', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error('Lenco API Request Failed', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          requestHeaders: {
            'Authorization': error.config?.headers?.['Authorization'] ? 'Present (Bearer)' : 'MISSING',
            'Content-Type': error.config?.headers?.['Content-Type'],
            'accept': error.config?.headers?.['accept'],
          },
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initiate a mobile money payment collection
   */
  async initiateMobileMoneyPayment(
    paymentData: MobileMoneyPaymentRequest
  ): Promise<PaymentVerificationResponse> {
    try {
      const response = await this.client.post<PaymentVerificationResponse>(
        '/collections/mobile-money',
        {
          amount: paymentData.amount.toString(),
          currency: paymentData.currency,
          reference: paymentData.reference,
          email: paymentData.email,
          phone: paymentData.phone,
          country: paymentData.country,
          operator: paymentData.operator,
          bearer: paymentData.bearer || 'customer',
        }
      );

      logger.info('Mobile money payment initiated', {
        reference: paymentData.reference,
        amount: paymentData.amount,
        status: response.data.data.status,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to initiate mobile money payment', {
        error: error.message,
        reference: paymentData.reference,
        response: error.response?.data,
      });
      throw new Error(
        error.response?.data?.message || 'Failed to initiate payment'
      );
    }
  }

  /**
   * Verify payment status by reference
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await this.client.get<PaymentVerificationResponse>(
        `/collections/status/${reference}`
      );

      logger.info('Payment verification completed', {
        reference,
        status: response.data.data.status,
        amount: response.data.data.amount,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to verify payment', {
        error: error.message,
        reference,
        response: error.response?.data,
      });
      throw new Error(
        error.response?.data?.message || 'Failed to verify payment'
      );
    }
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get public key for client-side integration
   */
  getPublicKey(): string {
    return config.lenco.publicKey;
  }
}

export const lencoPayService = new LencoPayService();
