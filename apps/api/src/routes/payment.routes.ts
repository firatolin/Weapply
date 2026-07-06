import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { StripeService } from '../services/stripe.service.js';
import { FXService } from '../services/fx.service.js';
import { AppError } from '../middleware/error.js';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';

const router: Router = Router();

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
    // Get current ETB rate for display
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

    // Create Stripe checkout session
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

    // Get ETB rate for display
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

    // Cancel in Stripe if it's a Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await StripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    // Update in database
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
// POST: Webhook handler
router.post('/webhook/stripe', async (req: Request, res: Response) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = config.STRIPE_WEBHOOK_SECRET;
      
      // Get the raw body from the request
      const rawBody = (req as any).rawBody;
      
      if (!rawBody) {
        console.error('❌ No raw body available for webhook verification');
        return res.status(400).send('Webhook Error: No raw body');
      }
  
      let event;
  
      try {
        // Import Stripe dynamically
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
          apiVersion: '2026-06-24.dahlia',
        });
        
        // Use the raw body for signature verification
        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          webhookSecret
        );
        
        console.log(`✅ Webhook verified: ${event.type}`);
      } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err}`);
      }
  
      // Handle the event
      await StripeService.handleWebhook(event);
  
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

export { router as paymentRouter };