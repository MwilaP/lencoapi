import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

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

export const createCommitmentFeeValidation = [
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('providerId').isUUID().withMessage('Valid provider ID is required'),
  body('serviceType').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Service type must be between 2 and 100 characters'),
  body('serviceDescription').optional().isString().trim().isLength({ max: 500 }).withMessage('Service description must not exceed 500 characters'),
  body('totalServiceAmount').isFloat({ min: 1, max: 999999 }).withMessage('Total service amount must be between ZMW 1 and ZMW 999,999'),
  body('commitmentPercentage').optional().isFloat({ min: 10, max: 50 }).withMessage('Commitment percentage must be between 10% and 50%'),
  validateRequest,
];

export const initiateCommitmentPaymentValidation = [
  body('commitmentFeeId').isUUID().withMessage('Valid commitment fee ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^(09|07)\d{8}$/).withMessage('Valid Zambian phone number is required (e.g., 0977123456)'),
  body('operator').isIn(['mtn', 'airtel', 'zamtel']).withMessage('Valid operator is required (mtn, airtel, or zamtel)'),
  validateRequest,
];

export const acceptCommitmentFeeValidation = [
  body('commitmentFeeId').isUUID().withMessage('Valid commitment fee ID is required'),
  body('providerId').isUUID().withMessage('Valid provider ID is required'),
  body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  validateRequest,
];

export const rejectCommitmentFeeValidation = [
  body('commitmentFeeId').isUUID().withMessage('Valid commitment fee ID is required'),
  body('providerId').isUUID().withMessage('Valid provider ID is required'),
  body('reason').isString().trim().isLength({ min: 5, max: 500 }).withMessage('Rejection reason must be between 5 and 500 characters'),
  validateRequest,
];

export const completeCommitmentFeeValidation = [
  body('commitmentFeeId').isUUID().withMessage('Valid commitment fee ID is required'),
  body('providerId').isUUID().withMessage('Valid provider ID is required'),
  validateRequest,
];
