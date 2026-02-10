import { useEffect, useState } from 'react';
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";

interface SafePayPlan {
  token: string;
  name: string;
  amount: string;
  currency: string;
  interval_count: number;
  interval: string;
  product: string;
  trial_period_days: number;
  description: string;
  active: boolean;
}

interface UserSubscription {
  token: string;
  plan_id: string;
  status: string;
  current_period_end_date: string;
  plan: SafePayPlan;
}

export default function Subscribe() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plans, setPlans] = useState<SafePayPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        // Fetch public plans via a public endpoint that proxies to admin API
        const response = await fetch('/api/payment/safepay/available-plans');
        const data = await response.json();

        if (data.ok && data.plans) {
          // Filter only active plans
          const activePlans = data.plans.filter((p: SafePayPlan) => p.active);
          setPlans(activePlans);

          // Auto-select first plan if available
          if (activePlans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(activePlans[0].token);
          }
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive",
        });
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Fetch user's active subscription
  useEffect(() => {
    const fetchUserSubscription = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch('/api/payment/safepay/my-subscription');
        const data = await response.json();

        if (data.ok && data.subscription) {
          setUserSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch user subscription:', error);
      }
    };

    fetchUserSubscription();
  }, [isAuthenticated]);

  // Check URL params for payment status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your Premium subscription is now active. Enjoy unlimited downloads!",
      });
      // Clean URL
      window.history.replaceState({}, '', '/subscribe');
      // Refresh user data
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else if (status === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/subscribe');
    } else if (status === 'error') {
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/subscribe');
    }
  }, [toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe to Premium",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handlePayment = async (planId?: string) => {
    if (!isAuthenticated) return;

    const planToUse = planId || selectedPlanId;
    if (!planToUse) {
      toast({
        title: "Error",
        description: "Please select a plan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Find the selected plan
      const plan = plans.find(p => p.token === planToUse);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // SafePay plan amount is already in smallest unit (cents/paisa)
      // Send it directly without conversion
      const amount = parseInt(plan.amount);

      const res = await apiRequest("POST", `/api/payment/safepay`, {
        amount,
        currency: plan.currency,
        planId: plan.token,
      });

      const data = await res.json();
      console.log("📦 Payment API Response:", data);

      if (data.paymentUrl) {
        console.log("🔗 Redirecting to:", data.paymentUrl);
        // Redirect to SafePay payment page
        window.location.href = data.paymentUrl;
      } else {
        console.error("❌ No paymentUrl in response:", data);
        throw new Error(data.message || 'Payment creation failed');
      }
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Subscribe to Premium - VidGrabber</title>
        <meta name="description" content="Upgrade to VidGrabber Premium for unlimited downloads, 4K quality, and ad-free experience." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <section className="py-16 sm:py-24">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-crown text-white text-2xl"></i>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">Upgrade to Premium</h1>
              <p className="text-lg text-muted-foreground">
                Unlock unlimited downloads and advanced features
              </p>
            </div>

            <Card className="shadow-2xl border border-border mb-8" id="pricing-plans">
              <CardContent className="p-8">
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-6">Premium Features Included:</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-infinity text-primary text-xl mt-1"></i>
                      <div>
                        <h4 className="font-semibold">Unlimited Downloads</h4>
                        <p className="text-sm text-muted-foreground">No daily limits</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-hd-video text-primary text-xl mt-1"></i>
                      <div>
                        <h4 className="font-semibold">4K Quality</h4>
                        <p className="text-sm text-muted-foreground">Highest resolution</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-ad text-primary text-xl mt-1"></i>
                      <div>
                        <h4 className="font-semibold">Ad-Free Experience</h4>
                        <p className="text-sm text-muted-foreground">No interruptions</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-layer-group text-primary text-xl mt-1"></i>
                      <div>
                        <h4 className="font-semibold">Batch Downloads</h4>
                        <p className="text-sm text-muted-foreground">Multiple at once</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User's Premium Status (if not via SafePay subscription) */}
                {user?.isPremium && !userSubscription && user.premiumExpiresAt && (
                  <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-2 border-orange-500/30">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <i className="fas fa-crown text-orange-500 text-xl"></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">You Already Have Premium!</h4>
                          <p className="text-sm text-muted-foreground">
                            Active subscription
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <i className="fas fa-calendar-check text-green-600"></i>
                        <span>Expires: <strong>{new Date(user.premiumExpiresAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</strong></span>
                      </div>
                      {user.subscriptionProvider && (
                        <div className="flex items-center gap-2 text-sm">
                          <i className="fas fa-building text-blue-600"></i>
                          <span>Provider: <strong>{user.subscriptionProvider.toUpperCase()}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                      <div className="flex items-start gap-2">
                        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                        <div className="text-sm">
                          <p className="font-semibold mb-1">Want to extend your subscription?</p>
                          <p className="text-muted-foreground">
                            If you purchase another subscription, it will <strong>add time to your existing subscription</strong>, not replace it.
                            For example, buying 30 more days will extend your expiry date by 30 days!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button asChild variant="outline" className="flex-1">
                        <a href="/profile">
                          <i className="fas fa-user mr-2"></i>
                          View Subscription
                        </a>
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                        onClick={() => {
                          // Scroll to plans
                          document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <i className="fas fa-plus-circle mr-2"></i>
                        Renew Early (Add More Time)
                      </Button>
                    </div>
                  </div>
                )}

                {/* User's Current Subscription */}
                {userSubscription && (
                  <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fas fa-check-circle text-green-500"></i>
                      <h4 className="font-bold">Active Subscription</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Plan: {userSubscription.plan.name || userSubscription.plan.product}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: <Badge variant="default">{userSubscription.status}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Next billing: {new Date(userSubscription.current_period_end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Available Plans */}
                {plansLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-4">Loading plans...</p>
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-exclamation-circle text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground">No subscription plans available at the moment.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    <h4 className="font-bold">Choose Your Plan:</h4>
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan.token;
                      const price = parseFloat(plan.amount) / 100;
                      const intervalText = `${plan.interval_count} ${plan.interval.toLowerCase()}${plan.interval_count > 1 ? 's' : ''}`;

                      return (
                        <div
                          key={plan.token}
                          onClick={() => setSelectedPlanId(plan.token)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-xl font-bold">{plan.name || plan.product}</h4>
                                {plan.trial_period_days > 0 && (
                                  <Badge variant="secondary">{plan.trial_period_days} days trial</Badge>
                                )}
                              </div>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                              )}
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">
                                  {plan.currency === 'PKR' ? 'PKR' : '$'}{price.toFixed(2)}
                                </span>
                                <span className="text-muted-foreground">per {intervalText}</span>
                              </div>
                            </div>
                            <div>
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <i className="fas fa-check text-white text-sm"></i>
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-border"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Secure Payment</h3>

                  {/* SafePay */}
                  <Button
                    onClick={() => handlePayment()}
                    disabled={loading || !selectedPlanId || plansLoading || !!userSubscription}
                    className="w-full h-auto py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50"
                    data-testid="button-pay-safepay"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : userSubscription ? 'fa-check-circle' : 'fa-shield-check'} text-2xl`}></i>
                      <div className="text-left">
                        <div className="font-semibold">
                          {loading ? 'Processing...' : userSubscription ? 'Already Subscribed' : selectedPlanId && plans.length > 0 ? `Pay ${plans.find(p => p.token === selectedPlanId)?.currency === 'PKR' ? 'PKR' : '$'}${(parseFloat(plans.find(p => p.token === selectedPlanId)?.amount || '0') / 100).toFixed(2)}` : 'Select a Plan'}
                        </div>
                        <div className="text-sm opacity-90">Cards, JazzCash, EasyPaisa & More</div>
                      </div>
                    </div>
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <i className="fab fa-cc-visa"></i>
                      <span>Visa</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fab fa-cc-mastercard"></i>
                      <span>Mastercard</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <i className="fas fa-mobile-alt"></i>
                      <span>Mobile Wallets</span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  <i className="fas fa-shield-alt mr-1"></i>
                  Secure payment processing. Cancel anytime.
                </p>

                <div className="mt-4 pt-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    7-day money-back guarantee • Full refund policy
                  </p>
                  <div className="flex justify-center gap-4 text-xs">
                    <a href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </a>
                    <span className="text-muted-foreground">•</span>
                    <a href="/request-refund" className="text-primary hover:underline">
                      Request Refund
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
