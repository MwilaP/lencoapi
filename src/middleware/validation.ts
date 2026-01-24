import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

export const subscriptionPaymentValidation = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^(09|07)\d{8}$/).withMessage('Valid Zambian phone number is required (e.g., 0977123456)'),
  body('operator').isIn(['mtn', 'airtel', 'zamtel']).withMessage('Valid operator is required (mtn, airtel, or zamtel)'),
  body('plan').optional().isString(),
  validateRequest,
];

export const contactUnlockPaymentValidation = [
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('providerId').isUUID().withMessage('Valid provider ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^(09|07)\d{8}$/).withMessage('Valid Zambian phone number is required (e.g., 0977123456)'),
  body('operator').isIn(['mtn', 'airtel', 'zamtel']).withMessage('Valid operator is required (mtn, airtel, or zamtel)'),
  validateRequest,
];

export const verifyPaymentValidation = [
  body('reference').isString().notEmpty().withMessage('Payment reference is required'),
  validateRequest,
];

export const referralAccessPaymentValidation = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^(09|07)\d{8}$/).withMessage('Valid Zambian phone number is required (e.g., 0977123456)'),
  body('operator').isIn(['mtn', 'airtel', 'zamtel']).withMessage('Valid operator is required (mtn, airtel, or zamtel)'),
  validateRequest,
];

export const createBookingValidation = [
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('providerProfileId').isUUID().withMessage('Valid provider profile ID is required'),
  body('providerServiceId').optional().isUUID().withMessage('Valid provider service ID is required'),
  body('startsAt').isISO8601().withMessage('Valid startsAt (ISO8601) is required'),
  body('endsAt').isISO8601().withMessage('Valid endsAt (ISO8601) is required'),
  body('totalAmount').isFloat({ min: 1, max: 999999 }).withMessage('Total amount must be between 1 and 999,999'),
  body('commitmentPercentage').optional().isFloat({ min: 1, max: 100 }).withMessage('Commitment percentage must be between 1 and 100'),
  body('confirmationMode').optional().isIn(['manual', 'auto']).withMessage('Confirmation mode must be manual or auto'),
  body('cancellationDeadlineAt').optional().isISO8601().withMessage('Valid cancellationDeadlineAt (ISO8601) is required'),
  validateRequest,
];

export const initiateBookingPaymentValidation = [
  param('id').isUUID().withMessage('Valid booking ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^(09|07)\d{8}$/).withMessage('Valid Zambian phone number is required (e.g., 0977123456)'),
  body('operator').isIn(['mtn', 'airtel', 'zamtel']).withMessage('Valid operator is required (mtn, airtel, or zamtel)'),
  validateRequest,
];

export const providerBookingActionValidation = [
  param('id').isUUID().withMessage('Valid booking ID is required'),
  body('providerProfileId').isUUID().withMessage('Valid provider profile ID is required'),
  validateRequest,
];

export const providerBookingRejectValidation = [
  param('id').isUUID().withMessage('Valid booking ID is required'),
  body('providerProfileId').isUUID().withMessage('Valid provider profile ID is required'),
  body('reason').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Reason must be between 3 and 500 characters'),
  validateRequest,
];

export const clientBookingCancelValidation = [
  param('id').isUUID().withMessage('Valid booking ID is required'),
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('reason').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Reason must be between 3 and 500 characters'),
  validateRequest,
];

export const providerBookingCancelValidation = [
  param('id').isUUID().withMessage('Valid booking ID is required'),
  body('providerProfileId').isUUID().withMessage('Valid provider profile ID is required'),
  body('reason').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Reason must be between 3 and 500 characters'),
  validateRequest,
];

export const bookingIdValidation = [
  param('id').isUUID().withMessage('Valid booking ID is required'),
  validateRequest,
];
