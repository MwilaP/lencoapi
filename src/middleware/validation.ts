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
