import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { lencoPayService } from '../services/lencopay.service';
import {
  subscriptionPaymentValidation,
  contactUnlockPaymentValidation,
  referralAccessPaymentValidation,
  verifyPaymentValidation,
  createCommitmentFeeValidation,
  initiateCommitmentPaymentValidation,
  acceptCommitmentFeeValidation,
  rejectCommitmentFeeValidation,
  completeCommitmentFeeValidation,
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

/**
 * POST /api/payments/commitment-fee/create
 * Create a commitment fee
 */
router.post(
  '/commitment-fee/create',
  createCommitmentFeeValidation,
  async (req: Request, res: Response) => {
  try {
    const { clientId, providerId, serviceType, serviceDescription, totalServiceAmount, commitmentPercentage } = req.body;

    if (!clientId || !providerId || !serviceType || !totalServiceAmount) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
        },
      });
    }

    const commitmentFee = await paymentService.createCommitmentFee({
      clientId,
      providerId,
      serviceType,
      serviceDescription,
      totalServiceAmount,
      commitmentPercentage,
    });

    res.status(201).json({
      success: true,
      data: commitmentFee,
      message: 'Commitment fee created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to create commitment fee',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/pay
 * Initiate commitment fee payment
 */
router.post(
  '/commitment-fee/pay',
  initiateCommitmentPaymentValidation,
  async (req: Request, res: Response) => {
  try {
    const { commitmentFeeId, email, phone, operator } = req.body;

    if (!commitmentFeeId || !email || !phone || !operator) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
        },
      });
    }

    const result = await paymentService.initiateCommitmentPayment({
      commitmentFeeId,
      email,
      phone,
      operator,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Commitment fee payment initiated. Please complete payment on your phone. ' + 
               'The provider will be notified once payment is confirmed.',
    });
  } catch (error: any) {
    logger.error('Failed to initiate commitment payment', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to initiate payment',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/pay-direct
 * Initiate commitment fee payment directly (without creating commitment fee first)
 */
router.post('/commitment-fee/pay-direct', async (req: Request, res: Response) => {
  try {
    const { clientId, providerId, serviceType, serviceDescription, totalServiceAmount, commitmentPercentage, phone, operator } = req.body;

    if (!clientId || !providerId || !serviceType || !totalServiceAmount || !phone || !operator) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
        },
      });
    }

    const result = await paymentService.initiateDirectCommitmentPayment({
      clientId,
      providerId,
      serviceType,
      serviceDescription,
      totalServiceAmount,
      commitmentPercentage,
      phone,
      operator,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Payment initiated. Please complete payment on your phone.',
    });
  } catch (error: any) {
    logger.error('Failed to initiate direct commitment payment', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to initiate payment',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/accept
 * Provider accepts commitment fee
 */
router.post(
  '/commitment-fee/accept',
  acceptCommitmentFeeValidation,
  async (req: Request, res: Response) => {
  try {
    const { commitmentFeeId, providerId, notes } = req.body;

    if (!commitmentFeeId || !providerId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
        },
      });
    }

    const commitmentFee = await paymentService.acceptCommitmentFee({
      commitmentFeeId,
      providerId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: commitmentFee,
      message: 'Commitment fee accepted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to accept commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to accept commitment fee',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/reject
 * Provider rejects commitment fee
 */
router.post(
  '/commitment-fee/reject',
  rejectCommitmentFeeValidation,
  async (req: Request, res: Response) => {
  try {
    const { commitmentFeeId, providerId, reason } = req.body;

    if (!commitmentFeeId || !providerId || !reason) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
        },
      });
    }

    const commitmentFee = await paymentService.rejectCommitmentFee({
      commitmentFeeId,
      providerId,
      reason,
    });

    res.status(200).json({
      success: true,
      data: commitmentFee,
      message: 'Commitment fee rejected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to reject commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to reject commitment fee',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/:id/accept
 * Provider accepts commitment fee (alternative route with ID in URL)
 */
router.post('/commitment-fee/:id/accept', async (req: Request, res: Response) => {
  try {
    const commitmentFeeId = req.params.id;
    const { providerId, notes } = req.body;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required field: providerId',
        },
      });
    }

    const commitmentFee = await paymentService.acceptCommitmentFee({
      commitmentFeeId,
      providerId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: commitmentFee,
      message: 'Commitment fee accepted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to accept commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to accept commitment fee',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/:id/reject
 * Provider rejects commitment fee (alternative route with ID in URL)
 */
router.post('/commitment-fee/:id/reject', async (req: Request, res: Response) => {
  try {
    const commitmentFeeId = req.params.id;
    const { providerId, rejectionReason } = req.body;

    if (!providerId || !rejectionReason) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: providerId and rejectionReason',
        },
      });
    }

    const commitmentFee = await paymentService.rejectCommitmentFee({
      commitmentFeeId,
      providerId,
      reason: rejectionReason,
    });

    res.status(200).json({
      success: true,
      data: commitmentFee,
      message: 'Commitment fee rejected successfully',
    });
  } catch (error: any) {
    logger.error('Failed to reject commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to reject commitment fee',
      },
    });
  }
});

/**
 * POST /api/payments/commitment-fee/complete
 * Complete commitment fee and release funds
 */
router.post(
  '/commitment-fee/complete',
  completeCommitmentFeeValidation,
  async (req: Request, res: Response) => {
  try {
    const { commitmentFeeId, providerId } = req.body;

    if (!commitmentFeeId || !providerId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
        },
      });
    }

    const commitmentFee = await paymentService.completeCommitmentFee({
      commitmentFeeId,
      providerId,
    });

    res.status(200).json({
      success: true,
      data: commitmentFee,
      message: 'Commitment fee completed successfully. Funds released to your account.',
    });
  } catch (error: any) {
    logger.error('Failed to complete commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to complete commitment fee',
      },
    });
  }
});

/**
 * GET /api/payments/commitment-fee/provider/:providerId
 * Get provider's commitment fees
 */
router.get('/commitment-fee/provider/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const { status } = req.query;

    const commitmentFees = await paymentService.getProviderCommitmentFees(
      providerId,
      status as any
    );

    res.status(200).json({
      success: true,
      data: commitmentFees,
    });
  } catch (error: any) {
    logger.error('Failed to get provider commitment fees', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get commitment fees',
      },
    });
  }
});

/**
 * GET /api/payments/commitment-fee/client/:clientId
 * Get client's commitment fees
 */
router.get('/commitment-fee/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { status } = req.query;

    const commitmentFees = await paymentService.getClientCommitmentFees(
      clientId,
      status as any
    );

    res.status(200).json({
      success: true,
      data: commitmentFees,
    });
  } catch (error: any) {
    logger.error('Failed to get client commitment fees', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get commitment fees',
      },
    });
  }
});

/**
 * GET /api/payments/commitment-fee/:id
 * Get commitment fee by ID
 */
router.get('/commitment-fee/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const commitmentFee = await paymentService.getCommitmentFeeById(id);

    if (!commitmentFee) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Commitment fee not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: commitmentFee,
    });
  } catch (error: any) {
    logger.error('Failed to get commitment fee', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get commitment fee',
      },
    });
  }
});

/**
 * GET /api/payments/commitment-fee/provider/:providerId/stats
 * Get provider dashboard statistics
 */
router.get('/commitment-fee/provider/:providerId/stats', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;

    const stats = await paymentService.getProviderCommitmentStats(providerId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get provider stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get provider statistics',
      },
    });
  }
});

/**
 * GET /api/payments/commitment-fee/:id/transactions
 * Get commitment fee transaction history
 */
router.get('/commitment-fee/:id/transactions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transactions = await paymentService.getCommitmentTransactions(id);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    logger.error('Failed to get commitment transactions', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get transaction history',
      },
    });
  }
});

export default router;
