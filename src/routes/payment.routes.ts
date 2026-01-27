import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { lencoPayService } from '../services/lencopay.service';
import {
  subscriptionPaymentValidation,
  contactUnlockPaymentValidation,
  referralAccessPaymentValidation,
  verifyPaymentValidation,
} from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/payments/subscription/initiate
 * Initiate a subscription payment
 */
router.post(
  '/subscription/initiate',
  subscriptionPaymentValidation,
  async (req: Request, res: Response) => {
    try {
      const { userId, email, phone, operator, plan } = req.body;

      const result = await paymentService.initiateSubscriptionPayment({
        userId,
        email,
        phone,
        operator,
        plan,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Subscription payment initiated. Please complete payment on your phone.',
      });
    } catch (error: any) {
      logger.error('Failed to initiate subscription payment', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to initiate payment',
        },
      });
    }
  }
);

/**
 * POST /api/payments/referral-access/initiate
 * Initiate a referral access payment
 */
router.post(
  '/referral-access/initiate',
  referralAccessPaymentValidation,
  async (req: Request, res: Response) => {
    try {
      const { userId, email, phone, operator } = req.body;

      const result = await paymentService.initiateReferralAccessPayment({
        userId,
        email,
        phone,
        operator,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Referral access payment initiated. Please complete payment on your phone.',
      });
    } catch (error: any) {
      logger.error('Failed to initiate referral access payment', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to initiate payment',
        },
      });
    }
  }
);

/**
 * POST /api/payments/contact-unlock/initiate
 * Initiate a contact unlock payment
 */
router.post(
  '/contact-unlock/initiate',
  contactUnlockPaymentValidation,
  async (req: Request, res: Response) => {
    try {
      const { clientId, providerId, email, phone, operator } = req.body;

      const result = await paymentService.initiateContactUnlockPayment({
        clientId,
        providerId,
        email,
        phone,
        operator,
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Contact unlock payment initiated. Please complete payment on your phone.',
      });
    } catch (error: any) {
      logger.error('Failed to initiate contact unlock payment', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to initiate payment',
        },
      });
    }
  }
);

/**
 * POST /api/payments/verify
 * Verify a payment by reference
 */
router.post(
  '/verify',
  verifyPaymentValidation,
  async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;

      const payment = await paymentService.verifyAndCompletePayment(reference);

      res.status(200).json({
        success: true,
        data: payment,
        message: 'Payment verified successfully',
      });
    } catch (error: any) {
      logger.error('Failed to verify payment', { error: error.message });
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to verify payment',
        },
      });
    }
  }
);

/**
 * GET /api/payments/:reference
 * Get payment details by reference
 */
router.get('/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    const payment = await paymentService.getPaymentByReference(reference);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Payment not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    logger.error('Failed to get payment', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get payment',
      },
    });
  }
});

/**
 * GET /api/payments/user/:userId
 * Get all payments for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const payments = await paymentService.getUserPayments(userId);

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    logger.error('Failed to get user payments', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get user payments',
      },
    });
  }
});

/**
 * GET /api/payments/config/public-key
 * Get Lencopay public key for client-side integration
 */
router.get('/config/public-key', (req: Request, res: Response) => {
  try {
    const publicKey = lencoPayService.getPublicKey();

    res.status(200).json({
      success: true,
      data: {
        publicKey,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get public key', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get public key',
      },
    });
  }
});


export default router;
