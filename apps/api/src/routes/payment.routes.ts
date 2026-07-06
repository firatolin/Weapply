import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { StripeService } from '../services/stripe.service.js';
import { FXService } from '../services/fx.service.js';
import { AppError } from '../middleware/error.js';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';

const router: Router = Router();

// Test route
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Payment route is working!' });
});

// Plan definitions
const PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    price: 0,
    currency: 'USD',
    features: [
      '5 scholarship matches per month',
      'Basic search',
      'Save favorites',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    price: 9.99,
    currency: 'USD',
    features: [
      'Unlimited scholarship matches',
      '10 document generations per month',
      'Advanced filters',
      'Deadline reminders',
      'Export to PDF',
    ],
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Premium',
    price: 19.99,
    currency: 'USD',
    features: [
      'Unlimited everything',
      'Unlimited document generations',
      'Priority support',
      'AI application review',
      'B2B outreach access',
      'Early access to new features',
    ],
  },
};

/**
 * GET /api/v1/payment/plans
 * Get available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const rate = await FXService.getUSDtoETB();
    
    const plansWithETB = Object.values(PLANS).map((plan) => ({
      ...plan,
      priceETB: plan.price > 0 ? Math.round(plan.price * rate) : 0,
      rate,
    }));

    res.json({
      success: true,
      data: plansWithETB,
    });
  } catch (error) {
    console.error('❌ Error fetching plans:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch plans');
  }
});

/**
 * POST /api/v1/payment/create-checkout
 * Create a Stripe checkout session
 */
router.post('/create-checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { planType, successUrl, cancelUrl } = req.body;

    if (!planType || !['PRO', 'PREMIUM'].includes(planType)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid plan type');
    }

    if (!successUrl || !cancelUrl) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Success and cancel URLs are required');
    }

    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const sessionUrl = await StripeService.createCheckoutSession(
      userId,
      email,
      planType as 'PRO' | 'PREMIUM',
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        url: sessionUrl,
      },
    });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create checkout session');
  }
});

/**
 * GET /api/v1/payment/current
 * Get current user's subscription
 */
router.get('/current', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    const rate = await FXService.getUSDtoETB();

    res.json({
      success: true,
      data: {
        subscription,
        currentPlan: subscription?.planType || 'FREE',
        isActive: subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL',
        rate,
        plans: PLANS,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch subscription');
  }
});

/**
 * POST /api/v1/payment/cancel
 * Cancel current subscription
 */
router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new AppError(404, 'NOT_FOUND', 'No active subscription found');
    }

    if (subscription.stripeSubscriptionId) {
      await StripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Subscription canceled successfully',
    });
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to cancel subscription');
  }
});

/**
 * POST /api/v1/payment/webhook/stripe
 * Stripe webhook handler
 */
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  console.log('📥 Webhook received');
  
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = config.STRIPE_WEBHOOK_SECRET;
    
    // Raw body is already in req.body as a Buffer
    const rawBody = req.body;
    
    console.log('📦 Raw body length:', rawBody?.length || 0);
    
    if (!rawBody || rawBody.length === 0) {
      console.error('❌ No raw body');
      return res.status(400).send('Webhook Error: No raw body');
    }

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
    
    console.log(`✅ Webhook verified: ${event.type}`);
    
    await StripeService.handleWebhook(event);
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err}`);
  }
});

export { router as paymentRouter };