import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Loader2, Shield, Zap, Crown, TrendingUp, DollarSign, Coins } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  priceETB: number | null;
  features: string[];
  rate: number;
}

export function PricingPage() {
  const { user } = useAuth();
  const { currency, formatPrice, convertPrice, rate, loading: currencyLoading } = useCurrency();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('FREE');

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log('📡 Fetching plans...');
        const response = await apiClient.get('/payment/plans');
        console.log('📊 Plans response:', response.data);
        setPlans(response.data.data || []);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching plans:', error);
        toast.error('Failed to load pricing plans');
        setLoading(false);
      }
    };

    // Fetch current subscription
    const fetchCurrentPlan = async () => {
      if (!user) return;
      try {
        const response = await apiClient.get('/payment/current');
        setCurrentPlan(response.data.data.currentPlan || 'FREE');
      } catch (error) {
        console.error('❌ Error fetching current plan:', error);
      }
    };

    fetchPlans();
    fetchCurrentPlan();
  }, [user]);

  // Get displayed price based on currency preference
  const getDisplayPrice = (plan: Plan) => {
    if (currency === 'ETB' && plan.priceETB !== null) {
      return `${plan.priceETB.toLocaleString()} ETB`;
    }
    return `$${plan.price.toFixed(2)}`;
  };

  // Get secondary price (the other currency)
  const getSecondaryPrice = (plan: Plan) => {
    if (currency === 'ETB') {
      return `$${plan.price.toFixed(2)} USD`;
    }
    if (plan.priceETB !== null) {
      return `${plan.priceETB.toLocaleString()} ETB`;
    }
    return '';
  };

  const handleStripeSubscribe = async (planId: string) => {
    if (!user) {
      toast.info('Please sign in to subscribe');
      navigate('/login');
      return;
    }

    if (currentPlan === planId && planId !== 'FREE') {
      toast.info(`You're already on the ${planId} plan`);
      return;
    }

    if (planId === 'FREE') {
      toast.info('You are already on the Free plan');
      return;
    }

    setProcessing(planId);

    try {
      const successUrl = `${window.location.origin}/dashboard?checkout=success`;
      const cancelUrl = `${window.location.origin}/pricing?checkout=cancel`;

      const response = await apiClient.post('/payment/create-checkout', {
        planType: planId,
        successUrl,
        cancelUrl,
      });

      window.location.href = response.data.data.url;
    } catch (error: any) {
      console.error('❌ Error creating checkout:', error);
      toast.error(error.response?.data?.error || 'Failed to start checkout process');
    } finally {
      setProcessing(null);
    }
  };

  const handleChapaSubscribe = async (planId: string) => {
    if (!user) {
      toast.info('Please sign in to subscribe');
      navigate('/login');
      return;
    }

    if (currentPlan === planId && planId !== 'FREE') {
      toast.info(`You're already on the ${planId} plan`);
      return;
    }

    if (planId === 'FREE') {
      toast.info('You are already on the Free plan');
      return;
    }

    setProcessing(planId);

    try {
      const successUrl = `${window.location.origin}/dashboard?checkout=chapa-success`;
      const cancelUrl = `${window.location.origin}/pricing?checkout=chapa-cancel`;

      const response = await apiClient.post('/payment/chapa/initialize', {
        planType: planId,
        successUrl,
        cancelUrl,
      });

      window.location.href = response.data.data.checkoutUrl;
    } catch (error: any) {
      console.error('❌ Error initializing Chapa payment:', error);
      toast.error(error.response?.data?.error || 'Failed to start Chapa checkout');
    } finally {
      setProcessing(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'FREE':
        return <Shield className="h-8 w-8 text-gray-400" />;
      case 'PRO':
        return <Zap className="h-8 w-8 text-blue-500" />;
      case 'PREMIUM':
        return <Crown className="h-8 w-8 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getPlanBadge = (planId: string) => {
    if (currentPlan === planId && planId !== 'FREE') {
      return <Badge className="bg-green-100 text-green-800">Current Plan</Badge>;
    }
    if (planId === 'FREE' && currentPlan === 'FREE') {
      return <Badge variant="outline">Current Plan</Badge>;
    }
    if (planId === 'PREMIUM') {
      return <Badge className="bg-yellow-100 text-yellow-800">Best Value</Badge>;
    }
    return null;
  };

  if (loading || currencyLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get the most out of Weapply. Upgrade to unlock unlimited matches, AI document generation, and premium features.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-sm text-muted-foreground">
            💰 Showing prices in <strong>{currency}</strong>
          </span>
          <span className="text-xs text-muted-foreground">
            (1 USD = {rate.toFixed(2)} ETB)
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id && plan.id !== 'FREE';
          const isFreePlan = plan.id === 'FREE';
          const isStripeProcessing = processing === `stripe-${plan.id}`;
          const isChapaProcessing = processing === `chapa-${plan.id}`;
          const isProcessing = isStripeProcessing || isChapaProcessing;
          const displayPrice = getDisplayPrice(plan);
          const secondaryPrice = getSecondaryPrice(plan);

          return (
            <Card
              key={plan.id}
              className={`flex flex-col hover:shadow-xl transition-shadow ${
                plan.id === 'PREMIUM' ? 'border-yellow-400 shadow-lg' : ''
              }`}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">{getPlanIcon(plan.id)}</div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Free' : displayPrice}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">/month</span>
                  )}
                </div>
                {plan.price > 0 && secondaryPrice && (
                  <p className="text-sm text-muted-foreground">
                    ≈ {secondaryPrice}
                  </p>
                )}
                <div className="mt-2">{getPlanBadge(plan.id)}</div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                {isFreePlan ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={currentPlan === 'FREE'}
                    onClick={() => navigate('/scholarships')}
                  >
                    {currentPlan === 'FREE' ? 'Current Plan' : 'Get Started'}
                  </Button>
                ) : (
                  <>
                    {/* Stripe Button - Show USD price */}
                    <Button
                      className={`w-full ${
                        plan.id === 'PREMIUM'
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      disabled={isCurrentPlan || isProcessing}
                      onClick={() => {
                        setProcessing(`stripe-${plan.id}`);
                        handleStripeSubscribe(plan.id);
                      }}
                    >
                      {isStripeProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : currentPlan === 'FREE' ? (
                        `Pay $${plan.price.toFixed(2)} with Card`
                      ) : (
                        'Switch Plan'
                      )}
                    </Button>

                    {/* Chapa Button - Show ETB price if available */}
                    {!isCurrentPlan && plan.priceETB !== null && (
                      <Button
                        variant="outline"
                        className="w-full border-green-500 text-green-600 hover:bg-green-50"
                        disabled={isProcessing}
                        onClick={() => {
                          setProcessing(`chapa-${plan.id}`);
                          handleChapaSubscribe(plan.id);
                        }}
                      >
                        {isChapaProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          `Pay ${plan.priceETB.toLocaleString()} ETB with Chapa`
                        )}
                      </Button>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Trust Badges */}
      <div className="mt-16 text-center">
        <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Secure payments via Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>ETH payments via Chapa</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>USD & ETB support</span>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Can I cancel anytime?</p>
            <p>Yes, you can cancel your subscription at any time from your account settings.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">What payment methods are accepted?</p>
            <p>We accept credit/debit cards via Stripe (USD) and Chapa (ETB) in Ethiopia.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">What happens when I upgrade?</p>
            <p>Your account is instantly upgraded. You'll be charged the prorated difference.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Can I switch between USD and ETB payments?</p>
            <p>Yes, you can choose either payment method at checkout. Both currencies are supported.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">How are ETB prices calculated?</p>
            <p>ETB prices are calculated using real-time exchange rates from multiple reliable sources.</p>
          </div>
        </div>
      </div>

      {/* Back to Dashboard */}
      <div className="mt-8 text-center">
        <Link to="/dashboard">
          <Button variant="ghost">← Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}