import { supabase, Payment, Subscription, ContactUnlock } from '../config/supabase';
import { lencoPayService, MobileMoneyPaymentRequest } from './lencopay.service';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface InitiateSubscriptionPaymentRequest {
  userId: string;
  email: string;
  phone: string;
  operator: 'mtn' | 'airtel' | 'zamtel';
  plan?: string;
}

export interface InitiateContactUnlockPaymentRequest {
  clientId: string;
  providerId: string;
  email: string;
  phone: string;
  operator: 'mtn' | 'airtel' | 'zamtel';
}

export interface InitiateReferralAccessPaymentRequest {
  userId: string;
  email: string;
  phone: string;
  operator: 'mtn' | 'airtel' | 'zamtel';
}

export class PaymentService {
  /**
   * Initiate a subscription payment
   */
  async initiateSubscriptionPayment(
    request: InitiateSubscriptionPaymentRequest
  ): Promise<{ reference: string; paymentId: string; status: string }> {
    try {
      const reference = lencoPayService.generateReference('SUB');
      const amount = config.payment.subscriptionAmount;

      // Create payment record in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: request.userId,
          amount,
          payment_type: 'subscription',
          payment_method: 'mobile_money',
          status: 'pending',
          transaction_reference: reference,
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Failed to create payment record', { error: paymentError });
        throw new Error('Failed to create payment record');
      }

      // Initiate payment with Lencopay
      const paymentData: MobileMoneyPaymentRequest = {
        amount,
        currency: config.payment.defaultCurrency,
        reference,
        email: request.email,
        phone: request.phone,
        country: 'zm',
        operator: request.operator,
        bearer: 'customer',
      };

      const lencoResponse = await lencoPayService.initiateMobileMoneyPayment(paymentData);

      logger.info('Subscription payment initiated', {
        userId: request.userId,
        reference,
        paymentId: payment.id,
        lencoStatus: lencoResponse.data.status,
      });

      return {
        reference,
        paymentId: payment.id,
        status: lencoResponse.data.status,
      };
    } catch (error: any) {
      logger.error('Failed to initiate subscription payment', {
        error: error.message,
        userId: request.userId,
      });
      throw error;
    }
  }

  /**
   * Initiate a referral access payment
   */
  async initiateReferralAccessPayment(
    request: InitiateReferralAccessPaymentRequest
  ): Promise<{ reference: string; paymentId: string; status: string }> {
    try {
      const reference = lencoPayService.generateReference('REFACCESS');
      const amount = config.payment.referralAccessAmount;

      // Create payment record in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: request.userId,
          amount,
          payment_type: 'referral_access',
          payment_method: 'mobile_money',
          status: 'pending',
          transaction_reference: reference,
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Failed to create payment record', { error: paymentError });
        throw new Error('Failed to create payment record');
      }

      // Initiate payment with Lencopay
      const paymentData: MobileMoneyPaymentRequest = {
        amount,
        currency: config.payment.defaultCurrency,
        reference,
        email: request.email,
        phone: request.phone,
        country: 'zm',
        operator: request.operator,
        bearer: 'customer',
      };

      const lencoResponse = await lencoPayService.initiateMobileMoneyPayment(paymentData);

      logger.info('Referral access payment initiated', {
        userId: request.userId,
        reference,
        paymentId: payment.id,
        lencoStatus: lencoResponse.data.status,
      });

      return {
        reference,
        paymentId: payment.id,
        status: lencoResponse.data.status,
      };
    } catch (error: any) {
      logger.error('Failed to initiate referral access payment', {
        error: error.message,
        userId: request.userId,
      });
      throw error;
    }
  }

  /**
   * Initiate a contact unlock payment
   */
  async initiateContactUnlockPayment(
    request: InitiateContactUnlockPaymentRequest
  ): Promise<{ reference: string; paymentId: string; status: string }> {
    try {
      // Check if contact is already unlocked
      const { data: existingUnlock } = await supabase
        .from('contact_unlocks')
        .select('*')
        .eq('client_id', request.clientId)
        .eq('provider_id', request.providerId)
        .single();

      if (existingUnlock) {
        throw new Error('Contact already unlocked');
      }

      const reference = lencoPayService.generateReference('UNLOCK');
      const amount = config.payment.contactUnlockAmount;

      // Create payment record in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: request.clientId,
          amount,
          payment_type: 'contact_unlock',
          payment_method: 'mobile_money',
          status: 'pending',
          provider_id: request.providerId,
          transaction_reference: reference,
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Failed to create payment record', { error: paymentError });
        throw new Error('Failed to create payment record');
      }

      // Initiate payment with Lencopay
      const paymentData: MobileMoneyPaymentRequest = {
        amount,
        currency: config.payment.defaultCurrency,
        reference,
        email: request.email,
        phone: request.phone,
        country: 'zm',
        operator: request.operator,
        bearer: 'customer',
      };

      const lencoResponse = await lencoPayService.initiateMobileMoneyPayment(paymentData);

      logger.info('Contact unlock payment initiated', {
        clientId: request.clientId,
        providerId: request.providerId,
        reference,
        paymentId: payment.id,
        lencoStatus: lencoResponse.data.status,
      });

      return {
        reference,
        paymentId: payment.id,
        status: lencoResponse.data.status,
      };
    } catch (error: any) {
      logger.error('Failed to initiate contact unlock payment', {
        error: error.message,
        clientId: request.clientId,
        providerId: request.providerId,
      });
      throw error;
    }
  }

  /**
   * Verify and complete a payment
   */
  async verifyAndCompletePayment(reference: string): Promise<Payment> {
    try {
      // Verify payment with Lencopay
      const lencoResponse = await lencoPayService.verifyPayment(reference);
      const paymentData = lencoResponse.data;

      // Get payment record from database
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_reference', reference)
        .single();

      if (fetchError || !payment) {
        throw new Error('Payment record not found');
      }

      // Update payment status based on Lenco response
      let status: 'pending' | 'completed' | 'failed' = 'pending';
      if (paymentData.status === 'successful') {
        status = 'completed';
      } else if (paymentData.status === 'failed') {
        status = 'failed';
      }

      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          status,
          completed_at: paymentData.completedAt || new Date().toISOString(),
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update payment status');
      }

      // If payment is successful, complete the transaction
      if (status === 'completed') {
        if (payment.payment_type === 'subscription') {
          await this.activateSubscription(payment.user_id);
        } else if (payment.payment_type === 'contact_unlock') {
          await this.unlockContact(payment.user_id, payment.provider_id!);
        } else if (payment.payment_type === 'referral_access') {
          await this.grantReferralAccess(payment.user_id);
        }
      }

      logger.info('Payment verified and completed', {
        reference,
        status,
        paymentType: payment.payment_type,
      });

      return updatedPayment;
    } catch (error: any) {
      logger.error('Failed to verify and complete payment', {
        error: error.message,
        reference,
      });
      throw error;
    }
  }

  /**
   * Activate subscription for a user
   */
  private async activateSubscription(userId: string): Promise<void> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        active: true,
        plan: 'monthly',
        amount: config.payment.subscriptionAmount,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('Failed to activate subscription', { error, userId });
      throw new Error('Failed to activate subscription');
    }

    logger.info('Subscription activated', { userId, endDate });
  }

  /**
   * Unlock contact for a client
   */
  private async unlockContact(clientId: string, providerId: string): Promise<void> {
    const { error } = await supabase
      .from('contact_unlocks')
      .insert({
        client_id: clientId,
        provider_id: providerId,
        amount: config.payment.contactUnlockAmount,
      });

    if (error) {
      logger.error('Failed to unlock contact', { error, clientId, providerId });
      throw new Error('Failed to unlock contact');
    }

    logger.info('Contact unlocked', { clientId, providerId });
  }

  /**
   * Grant referral access to a provider
   */
  private async grantReferralAccess(userId: string): Promise<void> {
    // Call the Supabase RPC function to grant referral access
    const { error } = await supabase.rpc('grant_provider_referral_access', {
      p_user_id: userId,
      p_payment_method: 'mobile_money',
      p_payment_reference: 'COMPLETED',
    });

    if (error) {
      logger.error('Failed to grant referral access', { error, userId });
      throw new Error('Failed to grant referral access');
    }

    logger.info('Referral access granted', { userId });
  }

  /**
   * Get payment by reference
   */
  async getPaymentByReference(reference: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_reference', reference)
      .single();

    if (error) {
      logger.error('Failed to get payment', { error, reference });
      return null;
    }

    return data;
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get user payments', { error, userId });
      return [];
    }

    return data || [];
  }
}

export const paymentService = new PaymentService();
