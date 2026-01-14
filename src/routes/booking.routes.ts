import { Router, Request, Response, type Router as ExpressRouter } from 'express';
import { bookingService } from '../services/booking.service';
import {
  bookingIdValidation,
  clientBookingCancelValidation,
  createBookingValidation,
  initiateBookingPaymentValidation,
  providerBookingActionValidation,
  providerBookingCancelValidation,
  providerBookingRejectValidation,
} from '../middleware/validation';
import { logger } from '../utils/logger';

const router: ExpressRouter = Router();

/**
 * POST /api/bookings
 * Create a booking in PENDING_PAYMENT and soft-lock the slot.
 */
router.post('/', createBookingValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    logger.error('Failed to create booking', { error: error.message });
    res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to create booking' },
    });
  }
});

/**
 * POST /api/bookings/:id/pay
 * Initiate commitment fee payment for booking.
 */
router.post('/:id/pay', initiateBookingPaymentValidation, async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const result = await bookingService.initiateCommitmentPayment({
      bookingId,
      email: req.body.email,
      phone: req.body.phone,
      operator: req.body.operator,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Commitment fee payment initiated. Please complete payment on your phone.',
    });
  } catch (error: any) {
    logger.error('Failed to initiate booking payment', { error: error.message });
    res.status(400).json({
      success: false,
      error: { message: error.message || 'Failed to initiate payment' },
    });
  }
});

/**
 * POST /api/bookings/:id/provider/confirm
 */
router.post('/:id/provider/confirm', providerBookingActionValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.confirmByProvider(req.params.id, req.body.providerProfileId);
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/bookings/:id/provider/reject
 */
router.post('/:id/provider/reject', providerBookingRejectValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.rejectByProvider(req.params.id, req.body.providerProfileId, req.body.reason);
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/bookings/:id/client/cancel
 */
router.post('/:id/client/cancel', clientBookingCancelValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.cancelByClient(req.params.id, req.body.clientId, req.body.reason);
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/bookings/:id/provider/cancel
 */
router.post('/:id/provider/cancel', providerBookingCancelValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.cancelByProvider(req.params.id, req.body.providerProfileId, req.body.reason);
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/bookings/:id/no-show
 */
router.post('/:id/no-show', bookingIdValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.markNoShow(req.params.id);
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/bookings/:id/complete
 */
router.post('/:id/complete', bookingIdValidation, async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.complete(req.params.id);
    res.status(200).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
