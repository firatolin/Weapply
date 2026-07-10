import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { StripeService } from '../services/stripe.service.js';
import { ChapaService } from '../services/chapa.service.js';
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
 * GET /api/v1/payment/rate
 * Get current exchange rate
 */
router.get('/rate', async (req: Request, res: Response) => {
  try {
    const rate = await FXService.getUSDtoETB();
    res.json({
      success: true,
      data: {
        rate,
        timestamp: new Date().toISOString(),
        usdToETB: `1 USD = ${rate} ETB`,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching rate:', error);
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to fetch exchange rate');
  }
});

/**
 * GET /api/v1/payment/plans
 * Get available subscription plans with real-time exchange rate
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    // Get real-time exchange rate
    const rate = await FXService.getUSDtoETB();
    
    const plansWithETB = Object.values(PLANS).map((plan) => ({
      ...plan,
      priceETB: plan.price > 0 ? Math.round(plan.price * rate) : 0,
      rate, // Send the rate to frontend
      currency: 'USD',
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
 * POST /api/v1/payment/chapa/initialize
 * Initialize a Chapa payment
 */
router.post('/chapa/initialize', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    // Get plan price in USD
    const planPrices = {
      PRO: 9.99,
      PREMIUM: 19.99,
    };
    const amountUSD = planPrices[planType as keyof typeof planPrices];

    // Initialize Chapa payment
    const result = await ChapaService.initializePayment(
      userId,
      email,
      planType as 'PRO' | 'PREMIUM',
      amountUSD,
      successUrl,
      cancelUrl
    );

    // Log the checkout URL for debugging
    console.log(`🔗 Chapa checkout URL: ${result.checkoutUrl}`);
    console.log(`📝 Transaction ID: ${result.transactionId}`);

    res.json({
      success: true,
      data: {
        checkoutUrl: result.checkoutUrl,
        transactionId: result.transactionId,
      },
    });
  } catch (error) {
    console.error('❌ Error initializing Chapa payment:', error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'INTERNAL_ERROR', 'Failed to initialize Chapa payment');
  }
});

/**
 * POST /api/v1/payment/chapa/test-webhook
 * Test Chapa webhook manually
 */
router.post('/chapa/test-webhook', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Test Chapa webhook received');
    
    // Create a test payload that mimics a successful Chapa webhook
    const testPayload = {
      event: 'charge.success',
      status: 'success',
      tx_ref: 'wep_PRO_cmr0j05j_12345678',
      amount: '1601',
      reference: 'TEST_REF_123',
      meta: {
        userId: 'cmr0j05jn0000cqe0vd8dbh1w',
        planType: 'PRO',
      },
    };
    
    console.log('📤 Test payload:', JSON.stringify(testPayload, null, 2));
    
    // Process the test webhook
    await ChapaService.handleWebhook(JSON.stringify(testPayload), testPayload);
    
    res.status(200).json({ 
      status: 'success', 
      message: 'Test webhook processed successfully',
      userId: testPayload.meta.userId,
      planType: testPayload.meta.planType,
    });
  } catch (error: any) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({ status: 'error', message: error.message });
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
  console.log('📥 Stripe webhook received');
  
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
    console.error('❌ Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err}`);
  }
});

/**
 * POST /api/v1/payment/webhook/chapa
 * Chapa webhook handler
 */
router.post('/webhook/chapa', async (req: Request, res: Response) => {
  try {
    console.log('📥 Chapa webhook received');
    console.log('📋 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    console.log('📦 Raw body exists?', !!(req as any).rawBody);
    
    // Get raw body from the request (set in index.ts middleware)
    const rawBody = (req as any).rawBody;
    
    if (!rawBody) {
      console.error('❌ No raw body available');
      // Try to use the parsed body as fallback
      console.log('📦 Using parsed body as fallback');
    }
    
    // Log the raw body if it exists
    if (rawBody) {
      console.log('📦 Raw body preview:', rawBody.substring(0, 200) + '...');
    }
    
    // Handle the webhook with proper error catching
    try {
      await ChapaService.handleWebhook(rawBody, req.body);
      console.log('✅ Webhook processed successfully');
    } catch (handlerError) {
      console.error('❌ Webhook handler error:', handlerError);
      // Still return 200 to prevent retries
      res.status(200).json({ status: 'error', message: 'Handler error but acknowledged' });
      return;
    }
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: 'success' });
  } catch (error: any) {
    console.error('❌ Chapa webhook route error:', error);
    // Always return 200 to prevent retries
    res.status(200).json({ status: 'error', message: error.message || 'Unknown error' });
  }
});

export { router as paymentRouter };