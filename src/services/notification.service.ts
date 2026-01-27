import AfricasTalking from 'africastalking';
import { config } from '../config';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

export interface SMSNotification {
  to: string;
  message: string;
}

export interface BookingNotificationData {
  bookingId: string;
  providerName: string;
  clientName: string;
  serviceName?: string;
  startsAt: string;
  endsAt: string;
  totalAmount: number;
  commitmentFee: number;
  currency: string;
}

export class NotificationService {
  private client: any;
  private sms: any;
  private airtime: any;

  private formatPhoneNumber(phone: string): string | null {
    if (!phone) {
      logger.debug('formatPhoneNumber: No phone number provided');
      return null;
    }

    logger.debug('formatPhoneNumber: Input', { originalPhone: phone });

    let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    logger.debug('formatPhoneNumber: After cleaning', { cleaned });

    let formatted: string | null = null;

    if (cleaned.startsWith('+260')) {
      formatted = cleaned;
      logger.debug('formatPhoneNumber: Already in international format', { formatted });
      return formatted;
    }

    if (cleaned.startsWith('260')) {
      formatted = '+' + cleaned;
      logger.debug('formatPhoneNumber: Added + prefix', { formatted });
      return formatted;
    }

    if (cleaned.startsWith('0')) {
      formatted = '+260' + cleaned.substring(1);
      logger.debug('formatPhoneNumber: Converted from local format', { formatted });
      return formatted;
    }

    if (cleaned.length === 9 && /^[79]/.test(cleaned)) {
      formatted = '+260' + cleaned;
      logger.debug('formatPhoneNumber: Added country code to 9-digit number', { formatted });
      return formatted;
    }

    logger.warn('formatPhoneNumber: Unable to format phone number', { 
      originalPhone: phone, 
      cleaned,
      cleanedLength: cleaned.length 
    });
    return null;
  }

  constructor() {
    logger.info('NotificationService: Initializing...', {
      hasUsername: !!config.africastalking.username,
      hasApiKey: !!config.africastalking.apiKey,
      hasSenderId: !!config.africastalking.senderId,
      usernameLength: config.africastalking.username?.length || 0,
      apiKeyLength: config.africastalking.apiKey?.length || 0,
    });

    if (config.africastalking.username && config.africastalking.apiKey) {
      try {
        this.client = AfricasTalking({
          apiKey: config.africastalking.apiKey,
          username: config.africastalking.username,
        });
        this.sms = this.client.SMS;
        this.airtime = this.client.AIRTIME;
        logger.info('Africa\'s Talking SMS and Airtime services initialized successfully', {
          username: config.africastalking.username,
          senderId: config.africastalking.senderId || 'none',
        });
      } catch (error) {
        logger.error('Failed to initialize Africa\'s Talking client', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      logger.warn('Africa\'s Talking credentials not configured - SMS notifications disabled', {
        missingUsername: !config.africastalking.username,
        missingApiKey: !config.africastalking.apiKey,
      });
    }
  }

  async sendSMS(notification: SMSNotification): Promise<boolean> {
    logger.info('sendSMS: Starting SMS send', {
      to: notification.to,
      messageLength: notification.message.length,
      messagePreview: notification.message.substring(0, 50) + '...',
    });

    if (!this.sms) {
      logger.warn('sendSMS: SMS service not initialized - skipping notification', { 
        to: notification.to,
        hasClient: !!this.client,
        hasSms: !!this.sms,
      });
      return false;
    }

    try {
      const options = {
        to: [notification.to],
        message: notification.message,
        from: config.africastalking.senderId || undefined,
      };

      logger.info('sendSMS: Calling Africa\'s Talking API', {
        to: options.to,
        messageLength: options.message.length,
        from: options.from || 'default',
      });

      const response = await this.sms.send(options);
      
      logger.info('sendSMS: SMS sent successfully', {
        to: notification.to,
        response: JSON.stringify(response),
        recipients: response.SMSMessageData?.Recipients || [],
        message: response.SMSMessageData?.Message || 'N/A',
      });

      if (response.SMSMessageData?.Recipients) {
        response.SMSMessageData.Recipients.forEach((recipient: any, index: number) => {
          logger.info(`sendSMS: Recipient ${index + 1} status`, {
            number: recipient.number,
            status: recipient.status,
            statusCode: recipient.statusCode,
            messageId: recipient.messageId,
            cost: recipient.cost,
          });
        });
      }

      return true;
    } catch (error) {
      logger.error('sendSMS: Failed to send SMS', {
        to: notification.to,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        errorDetails: JSON.stringify(error),
      });
      return false;
    }
  }

  async notifyProviderOfReservation(bookingId: string): Promise<void> {
    logger.info('notifyProviderOfReservation: Starting', { bookingId });

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          provider_profiles!provider_profile_id(id, user_id, name, contact_number),
          provider_services!provider_service_id(service_name, price)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        logger.error('notifyProviderOfReservation: Failed to fetch booking', { 
          bookingId, 
          error: bookingError,
          hasData: !!booking,
        });
        return;
      }

      logger.debug('notifyProviderOfReservation: Booking fetched', {
        bookingId,
        hasProvider: !!booking.provider_profiles,
        hasService: !!booking.provider_services,
      });

      const provider = booking.provider_profiles as any;
      const service = booking.provider_services as any;

      logger.debug('notifyProviderOfReservation: Provider details', {
        providerId: provider?.id,
        providerName: provider?.name,
        rawContactNumber: provider?.contact_number,
      });

      const formattedPhone = this.formatPhoneNumber(provider?.contact_number);
      if (!formattedPhone) {
        logger.warn('notifyProviderOfReservation: Provider contact number not available or invalid', { 
          bookingId, 
          providerId: provider?.id,
          rawPhone: provider?.contact_number,
        });
        return;
      }

      logger.info('notifyProviderOfReservation: Phone formatted successfully', {
        bookingId,
        formattedPhone,
      });

      const startsAt = new Date(booking.starts_at);
      const formattedDate = startsAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const formattedTime = startsAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const message = `Vibeslinks Booking Alert!\n\n` +
        `You have a new booking request${service?.service_name ? ` for ${service.service_name}` : ''}.\n` +
        `Date: ${formattedDate} at ${formattedTime}\n` +
        `Please confirm or reject this booking in your dashboard.`;

      logger.info('notifyProviderOfReservation: Sending SMS', {
        bookingId,
        to: formattedPhone,
        messageLength: message.length,
      });

      const success = await this.sendSMS({
        to: formattedPhone,
        message,
      });

      if (success) {
        logger.info('notifyProviderOfReservation: Provider notification sent successfully', { 
          bookingId, 
          providerId: provider.id,
          phone: formattedPhone,
        });
      } else {
        logger.error('notifyProviderOfReservation: Provider notification failed', { 
          bookingId, 
          providerId: provider.id,
          phone: formattedPhone,
        });
      }
    } catch (error) {
      logger.error('notifyProviderOfReservation: Unexpected error', {
        bookingId,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  async notifyClientOfConfirmation(bookingId: string): Promise<void> {
    logger.info('notifyClientOfConfirmation: Starting', { bookingId });

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          provider_profiles!provider_profile_id(id, user_id, name, contact_number),
          provider_services!provider_service_id(service_name, price)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        logger.error('notifyClientOfConfirmation: Failed to fetch booking', { bookingId, error: bookingError });
        return;
      }

      const provider = booking.provider_profiles as any;
      const service = booking.provider_services as any;

      const { data: clientProfile, error: profileError } = await supabase
        .from('client_profiles')
        .select('mobile_number')
        .eq('user_id', booking.client_id)
        .single();

      const formattedPhone = this.formatPhoneNumber(clientProfile?.mobile_number);
      if (!formattedPhone) {
        logger.warn('notifyClientOfConfirmation: Client phone number not available or invalid', { 
          bookingId, 
          clientId: booking.client_id,
          rawPhone: clientProfile?.mobile_number 
        });
        return;
      }

      const startsAt = new Date(booking.starts_at);
      const formattedDate = startsAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const formattedTime = startsAt.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const providerContact = provider.contact_number ? `\nPlease contact ${provider.name} : ${provider.contact_number}` : '';
      
      const message = `VibesLinx Booking Confirmed!\n` +
        `${provider.name} has confirmed your booking${service?.service_name ? ` for ${service.service_name}` : ''}.\n` +
        `Date: ${formattedDate} at ${formattedTime}` +
        providerContact 

      await this.sendSMS({
        to: formattedPhone,
        message,
      });

      logger.info('Client confirmation notification sent', { bookingId, clientId: booking.client_id });
    } catch (error) {
      logger.error('Error sending client confirmation notification', {
        bookingId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async notifyClientOfRejection(bookingId: string, reason?: string): Promise<void> {
    logger.info('notifyClientOfRejection: Starting', { bookingId, reason });

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          provider_profiles!provider_profile_id(id, user_id, name, contact_number),
          provider_services!provider_service_id(service_name, price)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        logger.error('notifyClientOfRejection: Failed to fetch booking', { bookingId, error: bookingError });
        return;
      }

      const provider = booking.provider_profiles as any;
      const service = booking.provider_services as any;

      const { data: clientProfile, error: profileError } = await supabase
        .from('client_profiles')
        .select('mobile_number')
        .eq('user_id', booking.client_id)
        .single();

      const formattedPhone = this.formatPhoneNumber(clientProfile?.mobile_number);
      if (!formattedPhone) {
        logger.warn('notifyClientOfRejection: Client phone number not available or invalid', { 
          bookingId, 
          clientId: booking.client_id,
          rawPhone: clientProfile?.mobile_number 
        });
        return;
      }

      const message = `Booking Update\n\n` +
        `Unfortunately, ${provider.name} cannot accommodate your booking${service?.service_name ? ` for ${service.service_name}` : ''}.\n` +
        `Your commitment fee of ${booking.currency} ${booking.commitment_fee_amount.toFixed(2)} will be refunded.\n` +
        (reason ? `\nReason: ${reason}` : '');

      await this.sendSMS({
        to: formattedPhone,
        message,
      });

      logger.info('Client rejection notification sent', { bookingId, clientId: booking.client_id });
    } catch (error) {
      logger.error('Error sending client rejection notification', {
        bookingId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async sendWelcomeAirtime(phoneNumber: string, providerName: string): Promise<boolean> {
    logger.info('sendWelcomeAirtime: Starting airtime send', {
      phoneNumber,
      providerName,
    });

    if (!this.airtime) {
      logger.warn('sendWelcomeAirtime: Airtime service not initialized', {
        hasClient: !!this.client,
        hasAirtime: !!this.airtime,
      });
      return false;
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      logger.warn('sendWelcomeAirtime: Invalid phone number', {
        rawPhone: phoneNumber,
      });
      return false;
    }

    try {
      const options = {
        recipients: [
          {
            phoneNumber: formattedPhone,
            currencyCode: 'ZMW',
            amount: 10,
          },
        ],
      };

      logger.info('sendWelcomeAirtime: Calling Africa\'s Talking Airtime API', {
        phoneNumber: formattedPhone,
        amount: 10,
        currency: 'ZMW',
      });

      const response = await this.airtime.send(options);

      logger.info('sendWelcomeAirtime: Airtime sent successfully', {
        phoneNumber: formattedPhone,
        response: JSON.stringify(response),
      });

      // Send SMS notification about the airtime
      const smsMessage = `Welcome to VibesLinx, ${providerName}!\n\n` +
        `Thank you for completing your provider registration. ` +
        `You've received K10 airtime as a welcome bonus.\n\n` +
        `Start adding your services and availability to receive bookings!`;

      await this.sendSMS({
        to: formattedPhone,
        message: smsMessage,
      });

      return true;
    } catch (error) {
      logger.error('sendWelcomeAirtime: Failed to send airtime', {
        phoneNumber: formattedPhone,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        errorDetails: JSON.stringify(error),
      });
      return false;
    }
  }
}

export const notificationService = new NotificationService();
