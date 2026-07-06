import Stripe from 'stripe';
import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';
import { FXService } from './fx.service.js';

/**
 * Define SubscriptionStatus type
 */
type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL' | 'PAUSED';

const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

export class StripeService {
  /**
   * Create or get Stripe customer
   */
  static async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      // Check if user already has a Stripe customer ID
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (subscription?.stripeCustomerId) {
        return subscription.stripeCustomerId;
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name: name || email,
        metadata: {
          userId,
        },
      });

      // Update or create subscription with customer ID
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            stripeCustomerId: customer.id,
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: customer.id,
            planType: 'FREE',
            status: 'ACTIVE',
          },
        });
      }

      return customer.id;
    } catch (error) {
      console.error('❌ Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(
    userId: string,
    email: string,
    planType: 'PRO' | 'PREMIUM',
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const customerId = await this.getOrCreateCustomer(userId, email);

      // Price mapping - get from environment variables
      const priceIds = {
        PRO: process.env.STRIPE_PRO_PRICE_ID,
        PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID,
      };

      const priceId = priceIds[planType];
      if (!priceId) {
        throw new Error(`Price ID for ${planType} not configured. Please set STRIPE_${planType}_PRICE_ID in environment variables.`);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          planType,
        },
        subscription_data: {
          metadata: {
            userId,
            planType,
          },
        },
      });

      return session.url!;
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Cancel a Stripe subscription (at period end)
   */
  static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      console.log(`✅ Stripe subscription ${subscriptionId} set to cancel at period end`);
    } catch (error) {
      console.error(`❌ Failed to cancel subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Immediately cancel a Stripe subscription (effective immediately)
   */
  static async cancelSubscriptionImmediately(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      console.log(`✅ Stripe subscription ${subscriptionId} canceled immediately`);
    } catch (error) {
      console.error(`❌ Failed to immediately cancel subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a canceled subscription
   */
  static async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      console.log(`✅ Stripe subscription ${subscriptionId} resumed`);
    } catch (error) {
      console.error(`❌ Failed to resume subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Get subscription details from Stripe
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error(`❌ Failed to retrieve subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentSucceeded(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailed(invoice);
          break;
        }

        case 'customer.subscription.trial_will_end': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleTrialWillEnd(subscription);
          break;
        }

        default:
          console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handle checkout completed
   */
  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, planType } = session.metadata || {};

    if (!userId || !planType) {
      console.error('❌ Missing userId or planType in session metadata');
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    if (!stripeSubscriptionId) {
      console.error('❌ No subscription ID in session');
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Update or create subscription in database
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: {
        planType: planType as any,
        status: 'ACTIVE',
        stripeSubscriptionId,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        amount: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
        currency: stripeSubscription.items.data[0]?.price?.currency || 'usd',
        interval: stripeSubscription.items.data[0]?.price?.recurring?.interval || 'month',
      },
      create: {
        userId,
        planType: planType as any,
        status: 'ACTIVE',
        stripeSubscriptionId,
        stripeCustomerId: session.customer as string,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        amount: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
        currency: stripeSubscription.items.data[0]?.price?.currency || 'usd',
        interval: stripeSubscription.items.data[0]?.price?.recurring?.interval || 'month',
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        amountUSD: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
        provider: 'STRIPE',
        providerTransactionId: session.id,
        providerStatus: 'SUCCEEDED',
        type: 'SUBSCRIPTION_CREATE',
        status: 'SUCCEEDED',
        idempotencyKey: session.id,
        metadata: {
          sessionId: session.id,
          subscriptionId: stripeSubscriptionId,
        },
      },
    });

    console.log(`✅ Stripe checkout completed for user ${userId} (${planType})`);
  }

  /**
   * Handle subscription updated
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('❌ No userId in subscription metadata');
      return;
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    console.log(`🔄 Stripe subscription updated for user ${userId}`);
  }

  /**
   * Handle subscription deleted
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('❌ No userId in subscription metadata');
      return;
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    console.log(`❌ Stripe subscription canceled for user ${userId}`);
  }

  /**
   * Handle payment succeeded
   */
  static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;

    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      console.warn(`⚠️ Subscription not found: ${subscriptionId}`);
      return;
    }

    // Get ETB rate at time of payment
    const rate = await FXService.getUSDtoETB();
    const amountETB = invoice.amount_paid ? Math.round(invoice.amount_paid / 100 * rate) : 0;

    await prisma.transaction.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amountUSD: invoice.amount_paid || 0,
        amountETB: amountETB,
        exchangeRate: rate,
        provider: 'STRIPE',
        providerTransactionId: invoice.id,
        providerStatus: 'SUCCEEDED',
        type: 'SUBSCRIPTION_RENEW',
        status: 'SUCCEEDED',
        idempotencyKey: invoice.id,
        metadata: {
          invoiceId: invoice.id,
          subscriptionId,
        },
      },
    });

    console.log(`💳 Stripe payment succeeded for user ${subscription.userId}`);
  }

  /**
   * Handle payment failed
   */
  static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;

    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      console.warn(`⚠️ Subscription not found: ${subscriptionId}`);
      return;
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAST_DUE',
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amountUSD: invoice.amount_due || 0,
        provider: 'STRIPE',
        providerTransactionId: invoice.id,
        providerStatus: 'FAILED',
        type: 'PAYMENT_FAILURE',
        status: 'FAILED',
        idempotencyKey: invoice.id,
        failureReason: invoice.attempt_count > 3 ? 'MAX_ATTEMPTS_EXCEEDED' : 'PAYMENT_DECLINED',
        metadata: {
          invoiceId: invoice.id,
          subscriptionId,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt,
        },
      },
    });

    console.log(`❌ Stripe payment failed for user ${subscription.userId}`);
  }

  /**
   * Handle trial ending soon
   */
  static async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    if (!userId) {
      console.error('❌ No userId in subscription metadata');
      return;
    }

    console.log(`⏰ Trial will end for user ${userId} on ${new Date(subscription.trial_end! * 1000).toISOString()}`);
    
    // Could send email notification here
    // await EmailService.sendTrialEndingEmail(userId, subscription.trial_end);
  }

  /**
   * Map Stripe status to internal status
   */
  static mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'PAST_DUE',
      incomplete_expired: 'CANCELED',
      trialing: 'TRIAL',
      unpaid: 'PAST_DUE',
      paused: 'PAUSED', // Added the missing 'paused' property
    };
    return map[status] || 'PAST_DUE';
  }
}