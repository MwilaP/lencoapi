import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

/**
 * POST /api/webhooks/lencopay
 * Handle Lencopay webhook notifications
 */
router.post('/lencopay', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;

    logger.info('Received Lencopay webhook', { data: webhookData });

    // Verify webhook signature if provided
    const signature = req.headers['x-lenco-signature'] as string;
    if (config.webhook.secret && signature) {
      // TODO: Implement signature verification
      // For now, we'll log it
      logger.debug('Webhook signature', { signature });
    }

    // Handle different webhook events
    if (webhookData.event === 'collection.successful') {
      const reference = webhookData.data?.reference;

      if (!reference) {
        logger.error('Webhook missing reference', { data: webhookData });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing payment reference',
          },
        });
      }

      // Check if this is a commitment fee payment
      if (reference.startsWith('COMMIT-')) {
        await paymentService.completeCommitmentPayment(reference);
        logger.info('Commitment fee payment completed via webhook', { reference });
      } else {
        // Verify and complete regular payment
        await paymentService.verifyAndCompletePayment(reference);
        logger.info('Payment completed via webhook', { reference });
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    }

    // Handle other webhook events
    logger.info('Unhandled webhook event', { event: webhookData.event });

    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: any) {
    logger.error('Failed to process webhook', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process webhook',
      },
    });
  }
});

export default router;
