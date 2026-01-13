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

export interface CreateCommitmentFeeRequest {
  clientId: string;
  providerId: string;
  serviceType: string;
  serviceDescription?: string;
  totalServiceAmount: number;
  commitmentPercentage?: number;
}

export interface InitiateCommitmentPaymentRequest {
  commitmentFeeId: string;
  email: string;
  phone: string;
  operator: 'mtn' | 'airtel' | 'zamtel';
}

export interface AcceptCommitmentFeeRequest {
  commitmentFeeId: string;
  providerId: string;
  notes?: string;
}

export interface RejectCommitmentFeeRequest {
  commitmentFeeId: string;
  providerId: string;
  reason: string;
}

export interface CompleteCommitmentFeeRequest {
  commitmentFeeId: string;
  providerId: string;
}

export type CommitmentFeeStatus = 
  | 'pending_payment'
  | 'pending_provider_review'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'refunded'
  | 'expired';

export interface CommitmentFee {
  id: string;
  client_id: string;
  provider_id: string;
  service_type: string;
  service_description?: string;
  total_service_amount: number;
  commitment_amount: number;
  commitment_percentage: number;
  status: CommitmentFeeStatus;
  payment_reference?: string;
  lencopay_transaction_id?: string;
  provider_notes?: string;
  rejection_reason?: string;
  accepted_at?: string;
  rejected_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  paid_at?: string;
  metadata?: any;
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

  /**
   * Create a commitment fee
   */
  async createCommitmentFee(request: CreateCommitmentFeeRequest): Promise<CommitmentFee> {
    try {
      const commitmentPercentage = request.commitmentPercentage || 35;
      const commitmentAmount = Number((request.totalServiceAmount * commitmentPercentage / 100).toFixed(2));

      // Set expiration time (48 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { data: commitmentFee, error } = await supabase
        .from('commitment_fees')
        .insert({
          client_id: request.clientId,
          provider_id: request.providerId,
          service_type: request.serviceType,
          service_description: request.serviceDescription,
          total_service_amount: request.totalServiceAmount,
          commitment_amount: commitmentAmount,
          commitment_percentage: commitmentPercentage,
          status: 'pending_payment',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create commitment fee', { error, request });
        throw new Error('Failed to create commitment fee');
      }

      logger.info('Commitment fee created', {
        commitmentFeeId: commitmentFee.id,
        clientId: request.clientId,
        providerId: request.providerId,
        amount: commitmentAmount,
      });

      return commitmentFee;
    } catch (error: any) {
      logger.error('Failed to create commitment fee', {
        error: error.message,
        request,
      });
      throw error;
    }
  }

  /**
   * Initiate commitment fee payment directly (without creating commitment fee first)
   */
  async initiateDirectCommitmentPayment(
    request: CreateCommitmentFeeRequest & { phone: string; operator: 'mtn' | 'airtel' | 'zamtel' }
  ): Promise<{ reference: string; paymentId: string; status: string }> {
    try {
      const commitmentPercentage = request.commitmentPercentage || 35;
      const commitmentAmount = Number((request.totalServiceAmount * commitmentPercentage / 100).toFixed(2));

      const reference = lencoPayService.generateReference('COMMIT');

      // Get provider_profiles.id from user_id (payments table references provider_profiles.id)
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', request.providerId)
        .single();

      // Create payment record with metadata about the commitment fee details
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: request.clientId,
          amount: commitmentAmount,
          payment_type: 'commitment_fee',
          payment_method: 'mobile_money',
          status: 'pending',
          provider_id: providerProfile?.id || null,
          transaction_reference: reference,
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Failed to create payment record', { error: paymentError });
        throw new Error('Failed to create payment record');
      }

      // Store pending commitment fee details for webhook to create actual commitment fee
      await supabase
        .from('pending_commitment_fees')
        .insert({
          payment_reference: reference,
          client_id: request.clientId,
          provider_id: request.providerId,
          service_type: request.serviceType,
          service_description: request.serviceDescription,
          total_service_amount: request.totalServiceAmount,
          commitment_amount: commitmentAmount,
          commitment_percentage: commitmentPercentage,
        });
      
      // Initiate Lencopay payment (use default email since it's not required from user)
      const paymentResult = await lencoPayService.initiateMobileMoneyPayment({
        amount: commitmentAmount,
        currency: config.payment.defaultCurrency,
        reference,
        email: 'payment@vibeslinx.com', // Default email for payment processing
        phone: request.phone,
        country: 'ZM',
        operator: request.operator,
        bearer: 'customer',
      });

      logger.info('Direct commitment payment initiated', {
        reference,
        clientId: request.clientId,
        providerId: request.providerId,
        amount: commitmentAmount,
        lencoStatus: paymentResult.data.status,
      });

      return {
        reference,
        paymentId: payment.id,
        status: paymentResult.data.status,
      };
    } catch (error: any) {
      logger.error('Failed to initiate direct commitment payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Initiate commitment fee payment
   */
  async initiateCommitmentPayment(
    request: InitiateCommitmentPaymentRequest
  ): Promise<{ reference: string; paymentId: string; status: string }> {
    try {
      // Get commitment fee
      const { data: commitmentFee, error: fetchError } = await supabase
        .from('commitment_fees')
        .select('*')
        .eq('id', request.commitmentFeeId)
        .single();

      if (fetchError || !commitmentFee) {
        throw new Error('Commitment fee not found');
      }

      if (commitmentFee.status !== 'pending_payment') {
        throw new Error('Commitment fee is not in pending payment status');
      }

      // Check if expired
      if (commitmentFee.expires_at && new Date(commitmentFee.expires_at) < new Date()) {
        await supabase
          .from('commitment_fees')
          .update({ status: 'expired' })
          .eq('id', request.commitmentFeeId);
        throw new Error('Commitment fee has expired');
      }

      const reference = lencoPayService.generateReference('COMMIT');

      // Get provider_profiles.id from user_id (payments table references provider_profiles.id)
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', commitmentFee.provider_id)
        .single();

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: commitmentFee.client_id,
          amount: commitmentFee.commitment_amount,
          payment_type: 'commitment_fee',
          payment_method: 'mobile_money',
          status: 'pending',
          provider_id: providerProfile?.id || null,
          transaction_reference: reference,
          commitment_fee_id: request.commitmentFeeId,
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Failed to create payment record', { error: paymentError });
        throw new Error('Failed to create payment record');
      }

      // Update commitment fee with payment reference
      await supabase
        .from('commitment_fees')
        .update({ payment_reference: reference })
        .eq('id', request.commitmentFeeId);

      // Initiate payment with Lencopay
      const paymentData: MobileMoneyPaymentRequest = {
        amount: commitmentFee.commitment_amount,
        currency: config.payment.defaultCurrency,
        reference,
        email: request.email,
        phone: request.phone,
        country: 'zm',
        operator: request.operator,
        bearer: 'customer',
      };

      const lencoResponse = await lencoPayService.initiateMobileMoneyPayment(paymentData);

      logger.info('Commitment fee payment initiated', {
        commitmentFeeId: request.commitmentFeeId,
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
      logger.error('Failed to initiate commitment payment', {
        error: error.message,
        commitmentFeeId: request.commitmentFeeId,
      });
      throw error;
    }
  }

  /**
   * Complete commitment fee payment (called by webhook)
   */
  async completeCommitmentPayment(reference: string): Promise<void> {
    try {
      // Get payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_reference', reference)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment record not found');
      }

      // Check if this is a direct payment (no commitment_fee_id yet)
      if (!payment.commitment_fee_id) {
        // Get pending commitment fee details
        const { data: pendingFee, error: pendingError } = await supabase
          .from('pending_commitment_fees')
          .select('*')
          .eq('payment_reference', reference)
          .single();

        if (pendingError || !pendingFee) {
          throw new Error('Pending commitment fee details not found');
        }

        // Create the actual commitment fee record now that payment is successful
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const { data: newCommitmentFee, error: createError } = await supabase
          .from('commitment_fees')
          .insert({
            client_id: pendingFee.client_id,
            provider_id: pendingFee.provider_id,
            service_type: pendingFee.service_type,
            service_description: pendingFee.service_description,
            total_service_amount: pendingFee.total_service_amount,
            commitment_amount: pendingFee.commitment_amount,
            commitment_percentage: pendingFee.commitment_percentage,
            status: 'pending_provider_review',
            payment_reference: reference,
            lencopay_transaction_id: reference,
            paid_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (createError) {
          logger.error('Failed to create commitment fee from pending', { error: createError });
          throw new Error('Failed to create commitment fee');
        }

        // Update payment record with commitment_fee_id
        await supabase
          .from('payments')
          .update({ 
            commitment_fee_id: newCommitmentFee.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Delete pending commitment fee
        await supabase
          .from('pending_commitment_fees')
          .delete()
          .eq('payment_reference', reference);

        // Record transaction
        await supabase
          .from('commitment_transactions')
          .insert({
            commitment_fee_id: newCommitmentFee.id,
            transaction_type: 'payment_completed',
            amount: pendingFee.commitment_amount,
            actor_id: pendingFee.client_id,
            actor_role: 'client',
            description: 'Commitment fee payment completed',
          });

        logger.info('Commitment fee created from successful payment', {
          commitmentFeeId: newCommitmentFee.id,
          reference,
          clientId: pendingFee.client_id,
          providerId: pendingFee.provider_id,
        });

        return;
      }

      // Legacy flow: commitment fee already exists, just update status
      const commitmentFeeId = payment.commitment_fee_id;

      // Update commitment fee status
      const { error: updateError } = await supabase
        .from('commitment_fees')
        .update({
          status: 'pending_provider_review',
          paid_at: new Date().toISOString(),
          lencopay_transaction_id: reference,
        })
        .eq('id', commitmentFeeId);

      if (updateError) {
        throw new Error('Failed to update commitment fee status');
      }

      // Log transaction
      await supabase
        .from('commitment_transactions')
        .insert({
          commitment_fee_id: commitmentFeeId,
          transaction_type: 'payment_completed',
          amount: payment.amount,
          actor_id: payment.user_id,
          actor_role: 'client',
          description: 'Commitment fee payment completed',
        });

      logger.info('Commitment fee payment completed', {
        commitmentFeeId,
        reference,
      });
    } catch (error: any) {
      logger.error('Failed to complete commitment payment', {
        error: error.message,
        reference,
      });
      throw error;
    }
  }

  /**
   * Provider accepts commitment fee
   */
  async acceptCommitmentFee(request: AcceptCommitmentFeeRequest): Promise<CommitmentFee> {
    try {
      // Get commitment fee
      const { data: commitmentFee, error: fetchError } = await supabase
        .from('commitment_fees')
        .select('*')
        .eq('id', request.commitmentFeeId)
        .eq('provider_id', request.providerId)
        .single();

      if (fetchError || !commitmentFee) {
        throw new Error('Commitment fee not found or unauthorized');
      }

      if (commitmentFee.status !== 'pending_provider_review') {
        throw new Error('Commitment fee is not pending provider review');
      }

      // Update commitment fee
      const { data: updatedFee, error: updateError } = await supabase
        .from('commitment_fees')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          provider_notes: request.notes,
        })
        .eq('id', request.commitmentFeeId)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to accept commitment fee');
      }

      // Log transaction
      await supabase
        .from('commitment_transactions')
        .insert({
          commitment_fee_id: request.commitmentFeeId,
          transaction_type: 'provider_accepted',
          amount: commitmentFee.commitment_amount,
          actor_id: request.providerId,
          actor_role: 'provider',
          description: 'Provider accepted commitment fee',
          metadata: { notes: request.notes },
        });

      logger.info('Commitment fee accepted', {
        commitmentFeeId: request.commitmentFeeId,
        providerId: request.providerId,
      });

      return updatedFee;
    } catch (error: any) {
      logger.error('Failed to accept commitment fee', {
        error: error.message,
        request,
      });
      throw error;
    }
  }

  /**
   * Provider rejects commitment fee
   */
  async rejectCommitmentFee(request: RejectCommitmentFeeRequest): Promise<CommitmentFee> {
    try {
      // Get commitment fee
      const { data: commitmentFee, error: fetchError } = await supabase
        .from('commitment_fees')
        .select('*')
        .eq('id', request.commitmentFeeId)
        .eq('provider_id', request.providerId)
        .single();

      if (fetchError || !commitmentFee) {
        throw new Error('Commitment fee not found or unauthorized');
      }

      if (commitmentFee.status !== 'pending_provider_review') {
        throw new Error('Commitment fee is not pending provider review');
      }

      // Update commitment fee
      const { data: updatedFee, error: updateError } = await supabase
        .from('commitment_fees')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: request.reason,
        })
        .eq('id', request.commitmentFeeId)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to reject commitment fee');
      }

      // Log transaction
      await supabase
        .from('commitment_transactions')
        .insert({
          commitment_fee_id: request.commitmentFeeId,
          transaction_type: 'provider_rejected',
          amount: commitmentFee.commitment_amount,
          actor_id: request.providerId,
          actor_role: 'provider',
          description: 'Provider rejected commitment fee',
          metadata: { reason: request.reason },
        });

      logger.info('Commitment fee rejected', {
        commitmentFeeId: request.commitmentFeeId,
        providerId: request.providerId,
        reason: request.reason,
      });

      return updatedFee;
    } catch (error: any) {
      logger.error('Failed to reject commitment fee', {
        error: error.message,
        request,
      });
      throw error;
    }
  }

  /**
   * Complete commitment fee and release funds to provider
   */
  async completeCommitmentFee(request: CompleteCommitmentFeeRequest): Promise<CommitmentFee> {
    try {
      // Get commitment fee
      const { data: commitmentFee, error: fetchError } = await supabase
        .from('commitment_fees')
        .select('*')
        .eq('id', request.commitmentFeeId)
        .eq('provider_id', request.providerId)
        .single();

      if (fetchError || !commitmentFee) {
        throw new Error('Commitment fee not found or unauthorized');
      }

      if (commitmentFee.status !== 'accepted') {
        throw new Error('Commitment fee must be accepted before completion');
      }

      // Update commitment fee
      const { data: updatedFee, error: updateError } = await supabase
        .from('commitment_fees')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', request.commitmentFeeId)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to complete commitment fee');
      }

      // Record earnings
      await supabase
        .from('commitment_fee_earnings')
        .insert({
          provider_id: request.providerId,
          commitment_fee_id: request.commitmentFeeId,
          amount: commitmentFee.commitment_amount,
          released_at: new Date().toISOString(),
        });

      // Log transaction
      await supabase
        .from('commitment_transactions')
        .insert({
          commitment_fee_id: request.commitmentFeeId,
          transaction_type: 'funds_released',
          amount: commitmentFee.commitment_amount,
          actor_id: request.providerId,
          actor_role: 'provider',
          description: 'Service completed, funds released to provider',
        });

      logger.info('Commitment fee completed', {
        commitmentFeeId: request.commitmentFeeId,
        providerId: request.providerId,
        amount: commitmentFee.commitment_amount,
      });

      return updatedFee;
    } catch (error: any) {
      logger.error('Failed to complete commitment fee', {
        error: error.message,
        request,
      });
      throw error;
    }
  }

  /**
   * Get provider's commitment fees (for dashboard)
   */
  async getProviderCommitmentFees(
    providerId: string,
    status?: CommitmentFeeStatus
  ): Promise<CommitmentFee[]> {
    try {
      let query = supabase
        .from('commitment_fees')
        .select('*, profiles!commitment_fees_client_id_fkey(full_name, email, phone)')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get provider commitment fees', { error, providerId });
        throw new Error('Failed to get provider commitment fees');
      }

      return data || [];
    } catch (error: any) {
      logger.error('Failed to get provider commitment fees', {
        error: error.message,
        providerId,
      });
      throw error;
    }
  }

  /**
   * Get client's commitment fees
   */
  async getClientCommitmentFees(
    clientId: string,
    status?: CommitmentFeeStatus
  ): Promise<CommitmentFee[]> {
    try {
      let query = supabase
        .from('commitment_fees')
        .select('*, profiles!commitment_fees_provider_id_fkey(full_name, email, phone)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get client commitment fees', { error, clientId });
        throw new Error('Failed to get client commitment fees');
      }

      return data || [];
    } catch (error: any) {
      logger.error('Failed to get client commitment fees', {
        error: error.message,
        clientId,
      });
      throw error;
    }
  }

  /**
   * Get commitment fee by ID
   */
  async getCommitmentFeeById(commitmentFeeId: string): Promise<CommitmentFee | null> {
    try {
      const { data, error } = await supabase
        .from('commitment_fees')
        .select('*')
        .eq('id', commitmentFeeId)
        .single();

      if (error) {
        logger.error('Failed to get commitment fee', { error, commitmentFeeId });
        return null;
      }

      return data;
    } catch (error: any) {
      logger.error('Failed to get commitment fee', {
        error: error.message,
        commitmentFeeId,
      });
      return null;
    }
  }

  /**
   * Get provider dashboard statistics
   */
  async getProviderCommitmentStats(providerId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('provider_commitment_stats')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error) {
        logger.error('Failed to get provider stats', { error, providerId });
        return {
          pending_review_count: 0,
          accepted_count: 0,
          completed_count: 0,
          rejected_count: 0,
          pending_amount: 0,
          accepted_amount: 0,
          total_earnings: 0,
        };
      }

      return data;
    } catch (error: any) {
      logger.error('Failed to get provider stats', {
        error: error.message,
        providerId,
      });
      throw error;
    }
  }

  /**
   * Get commitment fee transactions (audit trail)
   */
  async getCommitmentTransactions(commitmentFeeId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('commitment_transactions')
        .select('*')
        .eq('commitment_fee_id', commitmentFeeId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to get commitment transactions', { error, commitmentFeeId });
        return [];
      }

      return data || [];
    } catch (error: any) {
      logger.error('Failed to get commitment transactions', {
        error: error.message,
        commitmentFeeId,
      });
      return [];
    }
  }
}

export const paymentService = new PaymentService();
