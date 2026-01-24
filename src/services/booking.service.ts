import { supabase } from '../config/supabase';
import { lencoPayService, MobileMoneyPaymentRequest } from './lencopay.service';
import { config } from '../config';
import { logger } from '../utils/logger';

export type BookingStatus =
  | 'AVAILABLE'
  | 'PENDING_PAYMENT'
  | 'RESERVED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELED_BY_CLIENT'
  | 'CANCELED_BY_PROVIDER'
  | 'NO_SHOW'
  | 'EXPIRED';

export type BookingConfirmationMode = 'manual' | 'auto';

export interface Booking {
  id: string;
  client_id: string;
  provider_profile_id: string;
  provider_service_id: string | null;
  status: BookingStatus;
  confirmation_mode: BookingConfirmationMode;
  currency: string;
  total_amount: number;
  commitment_fee_amount: number;
  commitment_percentage: number;
  expires_at: string;
  cancellation_deadline_at: string | null;
  payment_reference: string | null;
  reserved_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingRequest {
  clientId: string;
  providerProfileId: string;
  providerServiceId?: string;
  startsAt: string;
  endsAt: string;
  totalAmount: number;
  commitmentPercentage?: number;
  confirmationMode?: BookingConfirmationMode;
  cancellationDeadlineAt?: string;
}

export interface InitiateBookingPaymentRequest {
  bookingId: string;
  email: string;
  phone: string;
  operator: 'mtn' | 'airtel' | 'zamtel';
}

export class BookingService {
  async createBooking(request: CreateBookingRequest): Promise<Booking> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.booking.paymentExpiryMinutes * 60 * 1000);

    const startsAt = new Date(request.startsAt);

    const cancellationDeadlineAt = request.cancellationDeadlineAt
      ? new Date(request.cancellationDeadlineAt)
      : new Date(startsAt.getTime() - config.booking.defaultCancellationDeadlineHours * 60 * 60 * 1000);

    const { data, error } = await supabase.rpc('create_booking_with_lock', {
      p_client_id: request.clientId,
      p_provider_profile_id: request.providerProfileId,
      p_provider_service_id: request.providerServiceId || null,
      p_starts_at: request.startsAt,
      p_ends_at: request.endsAt,
      p_total_amount: request.totalAmount,
      p_commitment_percentage: request.commitmentPercentage ?? config.booking.defaultCommitmentPercentage,
      p_confirmation_mode: request.confirmationMode ?? 'manual',
      p_expires_at: expiresAt.toISOString(),
      p_cancellation_deadline_at: cancellationDeadlineAt.toISOString(),
    });

    if (error || !data) {
      logger.error('Failed to create booking', { error, request });
      throw new Error(error?.message || 'Failed to create booking');
    }

    return data as Booking;
  }

  async initiateCommitmentPayment(
    request: InitiateBookingPaymentRequest
  ): Promise<{ reference: string; paymentId: string; status: string }> {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', request.bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      throw new Error('Booking is not pending payment');
    }

    if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
      await supabase.rpc('expire_pending_bookings');
      throw new Error('Booking has expired');
    }

    if (booking.payment_reference) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_reference', booking.payment_reference)
        .single();

      if (existingPayment?.status === 'pending') {
        return {
          reference: existingPayment.transaction_reference,
          paymentId: existingPayment.id,
          status: 'pending',
        };
      }
    }

    const reference = lencoPayService.generateReference('BOOK');

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: booking.client_id,
        amount: booking.commitment_fee_amount,
        payment_type: 'booking_commitment_fee',
        payment_method: 'mobile_money',
        status: 'pending',
        transaction_reference: reference,
        booking_id: booking.id,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      logger.error('Failed to create booking payment record', { error: paymentError });
      throw new Error('Failed to create payment record');
    }

    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({ payment_reference: reference })
      .eq('id', booking.id)
      .eq('status', 'PENDING_PAYMENT');

    if (bookingUpdateError) {
      logger.error('Failed to attach payment reference to booking', { error: bookingUpdateError });
      throw new Error('Failed to attach payment reference to booking');
    }

    const paymentData: MobileMoneyPaymentRequest = {
      amount: booking.commitment_fee_amount,
      currency: booking.currency || config.payment.defaultCurrency,
      reference,
      email: request.email,
      phone: request.phone,
      country: 'zm',
      operator: request.operator,
      bearer: 'customer',
    };

    const lencoResponse = await lencoPayService.initiateMobileMoneyPayment(paymentData);

    return {
      reference,
      paymentId: payment.id,
      status: lencoResponse.data.status,
    };
  }

  async handleSuccessfulCommitmentPayment(reference: string): Promise<void> {
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_reference', reference)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    if (!payment.booking_id) {
      throw new Error('Payment is not linked to a booking');
    }

    if (payment.status !== 'completed') {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    const { error: rpcError } = await supabase.rpc('reserve_booking_after_payment', {
      p_booking_id: payment.booking_id,
      p_payment_id: payment.id,
      p_payment_reference: reference,
    });

    if (rpcError) {
      logger.error('Failed to reserve booking after payment', { error: rpcError, reference });
      throw new Error(rpcError.message || 'Failed to reserve booking');
    }
  }

  async confirmByProvider(bookingId: string, providerProfileId: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('confirm_booking_by_provider', {
      p_booking_id: bookingId,
      p_provider_profile_id: providerProfileId,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to confirm booking');
    }

    return data as Booking;
  }

  async rejectByProvider(bookingId: string, providerProfileId: string, reason: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('reject_booking_by_provider', {
      p_booking_id: bookingId,
      p_provider_profile_id: providerProfileId,
      p_reason: reason,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to reject booking');
    }

    return data as Booking;
  }

  async cancelByClient(bookingId: string, clientId: string, reason: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('cancel_booking_by_client', {
      p_booking_id: bookingId,
      p_client_id: clientId,
      p_reason: reason,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to cancel booking');
    }

    return data as Booking;
  }

  async cancelByProvider(bookingId: string, providerProfileId: string, reason: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('cancel_booking_by_provider', {
      p_booking_id: bookingId,
      p_provider_profile_id: providerProfileId,
      p_reason: reason,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to cancel booking');
    }

    return data as Booking;
  }

  async markNoShow(bookingId: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('mark_booking_no_show', {
      p_booking_id: bookingId,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to mark no-show');
    }

    return data as Booking;
  }

  async complete(bookingId: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('complete_booking_release_commitment', {
      p_booking_id: bookingId,
      p_platform_commission_percentage: config.booking.platformCommissionPercentage,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to complete booking');
    }

    return data as Booking;
  }
}

export const bookingService = new BookingService();
