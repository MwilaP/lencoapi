import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/notifications/welcome-airtime
 * Send welcome airtime to a new provider
 */
router.post('/welcome-airtime', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, providerName } = req.body;

    if (!phoneNumber || !providerName) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and provider name are required',
      });
    }

    logger.info('Welcome airtime request received', {
      phoneNumber,
      providerName,
    });

    const success = await notificationService.sendWelcomeAirtime(phoneNumber, providerName);

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Welcome airtime sent successfully',
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send welcome airtime',
      });
    }
  } catch (error) {
    logger.error('Error in welcome airtime endpoint', {
      error: error instanceof Error ? error.message : error,
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
