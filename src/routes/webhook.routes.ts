import { Router, Request, Response, type Router as ExpressRouter } from 'express';
import { paymentService } from '../services/payment.service';
import { bookingService } from '../services/booking.service';
import { lencoPayService } from '../services/lencopay.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import crypto from 'crypto';

const router: ExpressRouter = Router();

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
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        logger.error('Missing raw body for webhook signature verification');
        return res.status(400).json({
          success: false,
          error: { message: 'Missing raw body' },
        });
      }

      const normalizedSignature = signature.startsWith('sha256=')
        ? signature.substring('sha256='.length)
        : signature;

      const expected = crypto
        .createHmac('sha256', config.webhook.secret)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expected, 'utf8');
      const providedBuf = Buffer.from(normalizedSignature, 'utf8');

      if (expectedBuf.length !== providedBuf.length) {
        logger.warn('Invalid webhook signature length', {
          expectedLength: expectedBuf.length,
          providedLength: providedBuf.length,
        });
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid signature' },
        });
      }

      const isValid = crypto.timingSafeEqual(
        expectedBuf,
        providedBuf
      );

      if (!isValid) {
        logger.warn('Invalid webhook signature', { signature });
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid signature' },
        });
      }
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

      // Verify payment with Lenco before mutating state
      const verification = await lencoPayService.verifyPayment(reference);
      if (verification.data.status !== 'successful') {
        logger.info('Ignoring non-successful webhook verification', {
          reference,
          status: verification.data.status,
        });
        return res.status(200).json({
          success: true,
          message: 'Webhook ignored (not successful)',
        });
      }

      // Route based on reference prefix
      if (reference.startsWith('COMMIT-')) {
        await paymentService.completeCommitmentPayment(reference);
        logger.info('Commitment fee payment completed via webhook', { reference });
      } else if (reference.startsWith('BOOK-')) {
        await bookingService.handleSuccessfulCommitmentPayment(reference);
        logger.info('Booking commitment payment completed via webhook', { reference });
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
