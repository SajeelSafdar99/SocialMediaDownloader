import { useState, useEffect } from 'react';
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

export default function RequestRefund() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();
  const [formData, setFormData] = useState({
    transactionId: '',
    amount: '',
    reason: '',
    additionalDetails: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if fields are pre-filled (should be read-only)
  const [isPreFilled, setIsPreFilled] = useState(false);

  // Pre-fill form from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('transactionId');
    const amount = params.get('amount');

    if (transactionId || amount) {
      setFormData(prev => ({
        ...prev,
        transactionId: transactionId || prev.transactionId,
        amount: amount || prev.amount,
      }));
      setIsPreFilled(true); // Mark as pre-filled
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to request a refund",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/refund-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          transactionId: formData.transactionId,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          additionalDetails: formData.additionalDetails,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast({
          title: "Refund Request Submitted!",
          description: "We've received your refund request. Our team will review it within 2-3 business days.",
        });

        setFormData({
          paymentId: '',
          transactionId: '',
          amount: '',
          reason: '',
          additionalDetails: '',
        });
      } else {
        throw new Error(data.error || 'Failed to submit refund request');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit refund request. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const refundReasons = [
    "Service not working as expected",
    "Charged incorrectly",
    "Duplicate charge",
    "Changed my mind within 7 days",
    "Technical issues",
    "Other",
  ];

  return (
    <>
      <SEOHead
        title="Request Refund - VidGrabber"
        description="Request a refund for your VidGrabber purchase. We offer a 7-day money-back guarantee and fair refund policy."
      />
      <Helmet>
        <title>Request Refund - VidGrabber</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="hero-gradient py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-undo text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                  Request a Refund
                </h1>
                <p className="text-xl text-muted-foreground">
                  We're sorry to see you go. Submit your refund request below and we'll process it within 2-3 business days.
                </p>
              </div>
            </div>
          </section>

          {/* Refund Policy Summary */}
          <section className="py-12 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check text-green-600 dark:text-green-400 text-xl"></i>
                    </div>
                    <h3 className="font-semibold mb-2">7-Day Guarantee</h3>
                    <p className="text-sm text-muted-foreground">Full refund within 7 days</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-clock text-blue-600 dark:text-blue-400 text-xl"></i>
                    </div>
                    <h3 className="font-semibold mb-2">Fast Processing</h3>
                    <p className="text-sm text-muted-foreground">5-10 business days</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-shield-alt text-purple-600 dark:text-purple-400 text-xl"></i>
                    </div>
                    <h3 className="font-semibold mb-2">Fair Policy</h3>
                    <p className="text-sm text-muted-foreground">Clear terms & conditions</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-headset text-orange-600 dark:text-orange-400 text-xl"></i>
                    </div>
                    <h3 className="font-semibold mb-2">Support Ready</h3>
                    <p className="text-sm text-muted-foreground">Here to help anytime</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Refund Request Form */}
          <section className="py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              {!user ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <i className="fas fa-lock text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-xl font-semibold mb-2">Login Required</h3>
                    <p className="text-muted-foreground mb-6">
                      Please login to submit a refund request
                    </p>
                    <Button asChild>
                      <Link href="/auth">
                        <i className="fas fa-sign-in-alt mr-2"></i>
                        Login
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6">Refund Request Form</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <Label htmlFor="transactionId">Transaction ID *</Label>
                        <Input
                          id="transactionId"
                          type="text"
                          placeholder="e.g., PREMIUM_4_1770786697172"
                          value={formData.transactionId}
                          onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                          required
                          readOnly={isPreFilled}
                          className={isPreFilled ? 'bg-gray-50 cursor-not-allowed' : ''}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {isPreFilled
                            ? 'Pre-filled from your payment history'
                            : 'Find this in your payment history (Profile → Payment History)'
                          }
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="amount">Amount (USD) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 9.99"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                          readOnly={isPreFilled}
                          className={isPreFilled ? 'bg-gray-50 cursor-not-allowed' : ''}
                        />
                        {isPreFilled && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Pre-filled from your payment history
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="reason">Reason for Refund *</Label>
                        <select
                          id="reason"
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        >
                          <option value="">Select a reason...</option>
                          {refundReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="additionalDetails">Additional Details</Label>
                        <Textarea
                          id="additionalDetails"
                          rows={5}
                          placeholder="Please provide any additional information that might help us process your refund..."
                          value={formData.additionalDetails}
                          onChange={(e) => setFormData({ ...formData, additionalDetails: e.target.value })}
                        />
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <i className="fas fa-info-circle text-primary mr-2"></i>
                          What happens next?
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Our team will review your request within 2-3 business days</li>
                          <li>• You'll receive an email confirmation of your request</li>
                          <li>• If approved, refund will be processed within 5-10 business days</li>
                          <li>• Refund will be sent to your original payment method</li>
                        </ul>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane mr-2"></i>
                            Submit Refund Request
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              <div className="mt-8 space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">Need Help?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      If you have questions about our refund policy or need assistance with your request:
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <i className="fas fa-envelope text-primary mr-2"></i>
                        Email: <a href="mailto:support@vidgrabber.online" className="text-primary hover:underline">support@vidgrabber.online</a>
                      </p>
                      <p className="text-sm">
                        <i className="fas fa-book text-primary mr-2"></i>
                        <Link href="/terms" className="text-primary hover:underline">View Full Refund Policy</Link>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
