import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';
import { FXService } from './fx.service.js';

interface ChapaResponse {
  status: string;
  message: string;
  data: {
    checkout_url: string;
    transaction_id: string;
    payment_id?: string;
  };
}

export class ChapaService {
  private static readonly API_URL = 'https://api.chapa.co/v1';
  private static readonly SECRET_KEY = config.CHAPA_SECRET_KEY;
  private static readonly ENCRYPTION_KEY = config.CHAPA_SECRET_KEY;

  /**
   * Initialize a payment
   */
  static async initializePayment(
    userId: string,
    email: string,
    planType: 'PRO' | 'PREMIUM',
    amountUSD: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string; transactionId: string }> {
    try {
      // Get ETB amount
      const amountETB = await FXService.usdToETB(amountUSD);
      const rate = await FXService.getUSDtoETB();

      console.log(`💰 Chapa payment: ${amountUSD} USD = ${amountETB} ETB`);
      console.log(`📧 User: ${email}, Plan: ${planType}`);

      // Shorten the tx_ref to avoid exceeding 50 characters
      const shortUserId = userId.substring(0, 8);
      const timestamp = Date.now().toString().slice(-8);
      const tx_ref = `wep_${planType}_${shortUserId}_${timestamp}`;

      console.log(`📝 tx_ref: ${tx_ref} (${tx_ref.length} chars)`);

      const payload = {
        amount: amountETB,
        currency: 'ETB',
        email: email,
        first_name: 'Weapply',
        last_name: 'User',
        tx_ref: tx_ref,
        callback_url: successUrl,
        return_url: successUrl,
        customization: {
            title: `Weapply ${planType}`,
            description: `${planType} plan subscription`,
          },
        meta: {
          userId,
          planType,
        },
      };

      console.log('📤 Chapa payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post<ChapaResponse>(
        `${this.API_URL}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Chapa response:', JSON.stringify(response.data, null, 2));

      if (response.data.status === 'success') {
        console.log(`✅ Chapa payment initialized: ${response.data.data.transaction_id}`);
        
        // Save checkout URL to subscription
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            chapaCheckoutUrl: response.data.data.checkout_url,
            chapaTransactionId: response.data.data.transaction_id,
          },
          create: {
            userId,
            planType: 'FREE',
            status: 'ACTIVE',
            chapaCheckoutUrl: response.data.data.checkout_url,
            chapaTransactionId: response.data.data.transaction_id,
          },
        });

        return {
          checkoutUrl: response.data.data.checkout_url,
          transactionId: response.data.data.transaction_id,
        };
      } else {
        throw new Error(response.data.message || 'Chapa payment initialization failed');
      }
    } catch (error: any) {
      console.error('❌ Chapa payment initialization error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  static async verifyPayment(transactionId: string): Promise<{ status: string; amount: number }> {
    try {
      const response = await axios.get(
        `${this.API_URL}/transaction/verify/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.SECRET_KEY}`,
          },
        }
      );

      if (response.data.status === 'success') {
        return {
          status: response.data.data.status,
          amount: response.data.data.amount,
        };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('❌ Chapa verification error:', error);
      throw error;
    }
  }

  /**
 * Handle webhook from Chapa
 */
static async handleWebhook(rawBody: string, payload: any): Promise<void> {
    try {
      console.log('📥 Chapa webhook received');
      console.log('📦 Raw body length:', rawBody?.length || 0);
      console.log('📋 Parsed payload:', JSON.stringify(payload, null, 2));
  
      // If no payload, try to parse from raw body
      let parsedPayload = payload;
      if (!payload || Object.keys(payload).length === 0) {
        if (rawBody) {
          try {
            parsedPayload = JSON.parse(rawBody);
            console.log('📋 Parsed payload from raw body:', JSON.stringify(parsedPayload, null, 2));
          } catch (e) {
            console.error('❌ Failed to parse raw body:', e);
            return;
          }
        } else {
          console.error('❌ No payload or raw body available');
          return;
        }
      }
  
      const { tx_ref, status, amount, reference, event, meta } = parsedPayload;
  
      if (!tx_ref) {
        console.error('❌ No tx_ref in payload');
        return;
      }
  
      console.log(`📋 Event: ${event}, Status: ${status}, tx_ref: ${tx_ref}`);
  
      // Handle different event types
      if (event === 'charge.failed' || event === 'charge.cancelled' || 
          status === 'failed' || status === 'cancelled') {
        console.log('❌ Chapa payment failed or cancelled');
        await this.recordFailedPayment(parsedPayload);
        return;
      }
  
      // Check for successful payment
      if (status === 'success' || event === 'charge.success') {
        console.log('✅ Chapa payment successful!');
        
        // Extract userId and planType from meta or tx_ref
        let userId = meta?.userId;
        let planType = meta?.planType;
        
        // If not in meta, try to extract from tx_ref
        if (!userId || !planType) {
          const parts = tx_ref.split('_');
          console.log('📋 tx_ref parts:', parts);
          
          // Try to find planType
          if (!planType && parts.length >= 2) {
            const possiblePlan = parts[1].toUpperCase();
            if (possiblePlan === 'PRO' || possiblePlan === 'PREMIUM') {
              planType = possiblePlan;
            }
          }
          
          // Try to find userId
          if (!userId && parts.length >= 3) {
            const shortUserId = parts[2];
            console.log('🔍 Looking for user with short ID:', shortUserId);
            
            // Find user by uid containing the shortUserId
            const users = await prisma.user.findMany({
              where: {
                uid: {
                  contains: shortUserId,
                },
              },
              take: 1,
            });
            
            if (users.length > 0) {
              userId = users[0].id;
              console.log('👤 Found user:', userId);
            }
          }
        }
  
        if (!userId) {
          console.error('❌ User not found for tx_ref:', tx_ref);
          return;
        }
  
        if (!planType) {
          console.error('❌ Plan type not found for tx_ref:', tx_ref);
          planType = 'PRO'; // Default to PRO if not found
        }
  
        console.log(`👤 User ID: ${userId}, Plan: ${planType}, Amount: ${amount}`);
        
        // Upgrade the user
        await this.upgradeUser(userId, planType, reference || 'unknown');
        
        // Create success transaction
        await this.recordSuccessfulPayment(parsedPayload, userId, planType);
        
        console.log(`✅ User ${userId} successfully upgraded to ${planType} via Chapa`);
      } else {
        console.log(`❌ Chapa payment unknown status: ${status}`);
      }
    } catch (error) {
      console.error('❌ Chapa webhook error:', error);
      throw error;
    }
  }
  
  /**
   * Record failed payment
   */
  static async recordFailedPayment(payload: any): Promise<void> {
    try {
      const { tx_ref, amount, reference, meta } = payload;
      const userId = meta?.userId;
      
      if (!userId) return;
      
      await prisma.transaction.create({
        data: {
          userId,
          amountETB: parseInt(amount) || 0,
          provider: 'CHAPA',
          providerTransactionId: reference || 'unknown',
          providerStatus: 'FAILED',
          type: 'PAYMENT_FAILURE',
          status: 'FAILED',
          idempotencyKey: reference || tx_ref,
          metadata: {
            tx_ref,
            ...meta,
          },
        },
      });
      console.log(`✅ Failed transaction recorded for user ${userId}`);
    } catch (error) {
      console.error('❌ Error recording failed payment:', error);
    }
  }
  
  /**
   * Record successful payment
   */
  static async recordSuccessfulPayment(payload: any, userId: string, planType: string): Promise<void> {
    try {
      const { amount, reference, tx_ref } = payload;
      const rate = await FXService.getUSDtoETB();
      const amountUSD = parseInt(amount) / rate;
  
      await prisma.transaction.create({
        data: {
          userId,
          amountUSD: Math.round(amountUSD),
          amountETB: parseInt(amount),
          exchangeRate: rate,
          provider: 'CHAPA',
          providerTransactionId: reference || 'unknown',
          providerStatus: 'SUCCEEDED',
          type: 'SUBSCRIPTION_CREATE',
          status: 'SUCCEEDED',
          idempotencyKey: reference || tx_ref,
          metadata: {
            tx_ref,
            planType,
          },
        },
      });
      console.log(`✅ Success transaction recorded for user ${userId}`);
    } catch (error) {
      console.error('❌ Error recording successful payment:', error);
    }
  }

  /**
   * Upgrade user after successful payment
   */
  static async upgradeUser(userId: string, planType: string, transactionId: string): Promise<void> {
    try {
      // Calculate price in cents USD
      const planPrices = {
        PRO: 999,
        PREMIUM: 1999,
        FREE: 0,
      };
      const amount = planPrices[planType as keyof typeof planPrices] || 999;

      // Get the current subscription to preserve chapa fields
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      // Normalize planType
      let normalizedPlanType = 'FREE';
      if (planType.toUpperCase() === 'PRO') normalizedPlanType = 'PRO';
      else if (planType.toUpperCase() === 'PREMIUM') normalizedPlanType = 'PREMIUM';

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          planType: normalizedPlanType as any,
          status: 'ACTIVE',
          chapaTransactionId: transactionId,
          chapaPaymentId: transactionId,
          amount: amount,
          currency: 'ETB',
          interval: 'month',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          chapaCheckoutUrl: existingSubscription?.chapaCheckoutUrl || null,
        },
        create: {
          userId,
          planType: normalizedPlanType as any,
          status: 'ACTIVE',
          chapaTransactionId: transactionId,
          chapaPaymentId: transactionId,
          amount: amount,
          currency: 'ETB',
          interval: 'month',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          chapaCheckoutUrl: null,
        },
      });

      console.log(`✅ User ${userId} upgraded to ${normalizedPlanType} via Chapa`);
    } catch (error) {
      console.error('❌ Error upgrading user via Chapa:', error);
      throw error;
    }
  }
}