import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { isUnauthorizedError } from '@/lib/authUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Subscription {
  token?: string; // SafePay subscription token (sub_xxx)
  id?: number; // Fallback local ID
  provider: string;
  status: string;
  price_amount?: string; // SafePay uses string for amounts
  amount?: number; // Fallback local amount
  price_currency?: string; // SafePay field
  currency?: string; // Fallback local field
  plan_id?: string; // SafePay field
  planId?: string | null; // Fallback local field
  current_period_end_date?: string; // SafePay field
  expiresAt?: string | null; // Fallback local field
  cancel_at_period_end?: boolean; // SafePay field
  canceled_at?: string; // SafePay field
  created_at?: string; // SafePay field
  createdAt?: string; // Fallback local field
}

interface Payment {
  id: number;
  transactionId: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);

  // Profile update form
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }

    setFormData({
      username: user.username || '',
      email: user.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    loadUserData();
  }, [user, setLocation]);

  const loadUserData = async () => {
    try {
      setLoadingData(true);

      let loadedPayments: Payment[] = [];

      // Load payment history first
      try {
        const paymentsResponse = await apiRequest(
          'GET',
          '/api/payment/history'
        );
        const paymentsData = await paymentsResponse.json();
        if (paymentsData.ok) {
          loadedPayments = paymentsData.payments || [];
          setPayments(loadedPayments);
        }
      } catch (payError) {
        // Silently fail payment history loading
      }

      // Load subscription data from SafePay API
      try {
        const subResponse = await apiRequest(
          'GET',
          '/api/payment/safepay/my-subscription'
        );
        const subData = await subResponse.json();

        // Only set subscription if SafePay API returns an active subscription
        // If null, user may have cancelled or subscription doesn't exist in SafePay
        if (subData.ok && subData.subscription) {
          setSubscription(subData.subscription);
        } else {
          // No active subscription in SafePay
          setSubscription(null);
        }
      } catch (subError) {
        console.error('Error loading subscription:', subError);
        // On error, don't create fake subscription
        setSubscription(null);
      }
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        setLocation('/auth');
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setCancelingSubscription(true);
    try {
      // Check if this is a SafePay subscription with a token
      const subscriptionToken = subscription.token || subscription.plan_id;

      if (subscriptionToken && subscriptionToken.startsWith('sub_')) {
        // Real SafePay subscription - cancel via API
        const response = await apiRequest(
          'POST',
          '/api/payment/safepay/cancel-subscription',
          { subscriptionId: subscriptionToken }
        );
        const data = await response.json();

        if (data.ok) {
          toast({
            title: 'Subscription Cancelled',
            description: 'Your subscription has been cancelled. You will retain access until the end of your billing period.',
          });
          await loadUserData();
        } else {
          throw new Error(data.error || 'Failed to cancel subscription');
        }
      } else {
        // Local DB subscription - cannot cancel via SafePay API
        toast({
          title: 'Subscription Information',
          description: 'Your premium access will expire on ' + (subscription.expiresAt || subscription.current_period_end_date ? formatDate(subscription.expiresAt || subscription.current_period_end_date!) : 'the scheduled date') + '. Contact support if you need assistance.',
          variant: 'default',
        });
      }
      setShowCancelDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setCancelingSubscription(false);
    }
  };

  const isEligibleForRefund = (payment: Payment) => {
    if (payment.status !== 'completed') return false;

    const paymentDate = new Date(payment.createdAt);
    const daysSincePurchase = Math.floor((Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

    // 7-day money-back guarantee
    return daysSincePurchase <= 7;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {};

      if (formData.email !== user?.email) {
        updates.email = formData.email;
      }

      if (formData.username !== user?.username) {
        updates.username = formData.username;
      }

      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          toast({
            title: 'Error',
            description: 'New passwords do not match',
            variant: 'destructive',
          });
          return;
        }
        if (!formData.currentPassword) {
          toast({
            title: 'Error',
            description: 'Current password is required to change password',
            variant: 'destructive',
          });
          return;
        }
        updates.currentPassword = formData.currentPassword;
        updates.newPassword = formData.newPassword;
      }

      const response = await apiRequest(
        'PUT',
        '/api/user/profile',
        updates
      );

      const data = await response.json();

      if (data.ok) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });

        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));

        // Reload user data
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>My Profile - VidGrabber</title>
        <meta name="description" content="Manage your VidGrabber profile and subscriptions" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">My Profile</h1>
              <p className="text-muted-foreground">Manage your account settings and subscriptions</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList>
                <TabsTrigger value="profile">Profile Settings</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="payments">Payment History</TabsTrigger>
              </TabsList>

              {/* Profile Settings Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your account details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={formData.currentPassword}
                              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                              placeholder="Enter current password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={formData.newPassword}
                              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                              placeholder="Enter new password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Updating...' : 'Update Profile'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subscription Tab */}
              <TabsContent value="subscription">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Status</CardTitle>
                    <CardDescription>Manage your premium subscription</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingData ? (
                      <div className="text-center py-8">
                        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
                        <p className="mt-2 text-muted-foreground">Loading subscription data...</p>
                      </div>
                    ) : subscription ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <i className="fas fa-crown text-primary text-xl"></i>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">Premium Member</h3>
                              <p className="text-sm text-muted-foreground">
                                {subscription.status === 'active' ? 'Active subscription' : `Status: ${subscription.status}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusBadgeVariant(subscription.status)}>
                            {subscription.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Provider</p>
                            <p className="font-medium">{subscription.provider?.toUpperCase() || 'SAFEPAY'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="font-medium">
                              {subscription.price_currency || subscription.currency || 'USD'}{' '}
                              {subscription.price_amount
                                ? (parseInt(subscription.price_amount) / 100).toFixed(2)
                                : subscription.amount
                                  ? (subscription.amount / 100).toFixed(2)
                                  : '0.00'}
                            </p>
                          </div>
                          {(subscription.current_period_end_date || subscription.expiresAt) && (
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                {subscription.cancel_at_period_end ? 'Access Until' : 'Next Billing'}
                              </p>
                              <p className="font-medium">
                                {formatDate(subscription.current_period_end_date || subscription.expiresAt!)}
                              </p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Started On</p>
                            <p className="font-medium">{formatDate(subscription.created_at || subscription.createdAt!)}</p>
                          </div>
                          {subscription.cancel_at_period_end && subscription.canceled_at && (
                            <div className="space-y-1 md:col-span-2">
                              <p className="text-sm text-muted-foreground">Cancelled On</p>
                              <p className="font-medium text-destructive">{formatDate(subscription.canceled_at)}</p>
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          {/* Cancel Subscription */}
                          {subscription.cancel_at_period_end ? (
                            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                              <div className="flex items-start gap-3">
                                <i className="fas fa-info-circle text-orange-600 mt-1"></i>
                                <div>
                                  <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                                    Subscription Cancelled
                                  </h4>
                                  <p className="text-sm text-orange-700 dark:text-orange-300">
                                    Your subscription has been cancelled. You'll retain access until{' '}
                                    {formatDate(subscription.current_period_end_date || subscription.expiresAt!)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
                              <div>
                                <h4 className="font-semibold mb-1">Cancel Subscription</h4>
                                <p className="text-sm text-muted-foreground">
                                  You'll retain access until{' '}
                                  {formatDate(subscription.current_period_end_date || subscription.expiresAt || new Date().toISOString())}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => setShowCancelDialog(true)}
                                disabled={subscription.status === 'CANCELED'}
                              >
                                <i className="fas fa-times-circle mr-2"></i>
                                Cancel
                              </Button>
                            </div>
                          )}

                          {/* Request Refund */}
                          {payments.some(p => isEligibleForRefund(p)) && (
                            <div className="flex justify-between items-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                              <div>
                                <h4 className="font-semibold mb-1 text-green-600 dark:text-green-400">
                                  <i className="fas fa-shield-alt mr-2"></i>
                                  7-Day Money-Back Guarantee
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Not satisfied? Request a full refund within 7 days of purchase
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                asChild
                                className="border-green-500 text-green-600 hover:bg-green-500/10"
                              >
                                <a href="/request-refund">
                                  <i className="fas fa-undo mr-2"></i>
                                  Request Refund
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold mb-1">Need help?</h4>
                            <p className="text-sm text-muted-foreground">Contact our support team for assistance</p>
                          </div>
                          <Button variant="outline" asChild>
                            <a href="/contact">Contact Support</a>
                          </Button>
                        </div>
                      </div>
                    ) : user.isPremium ? (
                      <div className="space-y-6">
                        {/* User has premium access but subscription is cancelled */}
                        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start gap-3">
                            <i className="fas fa-info-circle text-orange-600 mt-1 text-xl"></i>
                            <div className="flex-1">
                              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                                Subscription Cancelled
                              </h4>
                              <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">
                                Your subscription has been cancelled. You'll retain premium access until:
                              </p>
                              <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                                {user.premiumExpiresAt ? formatDate(user.premiumExpiresAt) : 'Not set'}
                              </p>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                After this date, you'll need to purchase a new subscription to regain premium access.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Refund option if eligible */}
                        {payments.some(p => isEligibleForRefund(p)) && (
                          <div className="flex justify-between items-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div>
                              <h4 className="font-semibold mb-1 text-green-600 dark:text-green-400">
                                <i className="fas fa-shield-alt mr-2"></i>
                                7-Day Money-Back Guarantee
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Not satisfied? Request a full refund within 7 days of purchase
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              asChild
                              className="border-green-500 text-green-600 hover:bg-green-500/10"
                            >
                              <a href="/request-refund">
                                <i className="fas fa-undo mr-2"></i>
                                Request Refund
                              </a>
                            </Button>
                          </div>
                        )}

                        <Separator />

                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold mb-1">Want to renew?</h4>
                            <p className="text-sm text-muted-foreground">Subscribe again to continue enjoying premium features</p>
                          </div>
                          <Button asChild>
                            <a href="/subscribe">
                              <i className="fas fa-crown mr-2"></i>
                              Renew Subscription
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-crown text-muted-foreground text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                        <p className="text-muted-foreground mb-6">
                          Upgrade to Premium to unlock unlimited downloads and exclusive features
                        </p>
                        <Button asChild>
                          <a href="/subscribe">Upgrade to Premium</a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment History Tab */}
              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>View all your past transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingData ? (
                      <div className="text-center py-8">
                        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
                        <p className="mt-2 text-muted-foreground">Loading payment history...</p>
                      </div>
                    ) : payments.length > 0 ? (
                      <div className="space-y-4">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <i className="fas fa-credit-card text-primary"></i>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{payment.provider.toUpperCase()}</p>
                                    {isEligibleForRefund(payment) && (
                                      <Badge variant="outline" className="text-green-600 border-green-600">
                                        <i className="fas fa-shield-alt mr-1"></i>
                                        Refund Eligible
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    Payment ID: #{payment.id}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(payment.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {payment.currency} {(payment.amount / 100).toFixed(2)}
                                </p>
                                <Badge variant={getStatusBadgeVariant(payment.status)} className="mt-1">
                                  {payment.status}
                                </Badge>
                              </div>
                            </div>
                            {isEligibleForRefund(payment) && (
                              <div className="mt-3 pt-3 border-t flex justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                  className="border-green-500 text-green-600 hover:bg-green-500/10"
                                >
                                  <a href={`/request-refund?paymentId=${payment.id}&amount=${(payment.amount / 100).toFixed(2)}`}>
                                    <i className="fas fa-undo mr-2"></i>
                                    Request Refund
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <i className="fas fa-receipt text-muted-foreground text-2xl"></i>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Payments Yet</h3>
                        <p className="text-muted-foreground">
                          Your payment transactions will appear here
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription?
              {(subscription?.current_period_end_date || subscription?.expiresAt) && (
                <> You will retain access to Premium features until{' '}
                <strong>{formatDate(subscription.current_period_end_date || subscription.expiresAt!)}</strong>.</>
              )}
              <br /><br />
              <strong>Important:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your subscription will be cancelled immediately</li>
                <li>You keep premium access until the end of your current billing period</li>
                <li>You can request a refund within 7 days of purchase if needed</li>
                <li>Once cancelled, you'll need to create a new subscription to reactivate</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelingSubscription}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelingSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelingSubscription ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Canceling...
                </>
              ) : (
                <>
                  <i className="fas fa-times-circle mr-2"></i>
                  Yes, Cancel Subscription
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
