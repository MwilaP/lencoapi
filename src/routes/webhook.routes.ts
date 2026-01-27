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
 * 3a7e10ad853e2d6a77cfcae0af23b5fef8613699a2a01346c3448a44aca3109d
 */
router.post('/lencopay', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;

    logger.info('Received Lencopay webhook', { data: webhookData });

    // Verify webhook signature if provided
    // TODO: Re-enable signature verification once webhook secret is configured
    // const signature = req.headers['x-lenco-signature'] as string;
    // console.log('Lencopay webhook signature', { signature });
    // if (config.webhook.secret && signature) {
    //   // Hash the secret key first with SHA-256
    //   const webhookHashKey = crypto
    //     .createHash('sha256')
    //     .update(config.webhook.secret)
    //     .digest('hex');

    //   // Create HMAC SHA-512 with the hashed secret and stringified body
    //   const expected = crypto
    //     .createHmac('sha512', webhookHashKey)
    //     .update(JSON.stringify(webhookData))
    //     .digest('hex');

    //   if (expected !== signature) {
    //     logger.warn('Invalid webhook signature', { 
    //       expected,
    //       provided: signature 
    //     });
    //     return res.status(401).json({
    //       success: false,
    //       error: { message: 'Invalid signature' },
    //     });
    //   }
    // }

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
      if (reference.startsWith('BOOK-')) {
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
