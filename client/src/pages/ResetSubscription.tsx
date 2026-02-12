import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Reset Subscription Data - Development/Testing Utility
 *
 * This page allows you to quickly reset all subscription-related data
 * for the current user. Useful for testing the subscription flow repeatedly.
 *
 * Clears:
 * - SafePay customer ID
 * - SafePay merchant key
 * - SafePay subscription token
 * - Premium status
 * - All payment records
 */
export default function ResetSubscription() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleReset = async () => {
    if (!user) {
      setMessage({ type: "error", text: "You must be logged in to reset subscription data" });
      return;
    }

    if (!confirm("Are you sure you want to reset all subscription data? This will:\n\n" +
      "- Clear SafePay customer ID\n" +
      "- Clear SafePay merchant key\n" +
      "- Clear SafePay subscription token\n" +
      "- Remove premium status\n" +
      "- Delete all payment records\n\n" +
      "This action cannot be undone!")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/dev/reset-subscription", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset subscription data");
      }

      const result = await response.json();

      setMessage({
        type: "success",
        text: `Successfully reset subscription data!\n\n` +
          `- Cleared SafePay customer data\n` +
          `- Removed premium status\n` +
          `- Deleted ${result.deletedPayments || 0} payment record(s)\n\n` +
          `You can now test the subscription flow again.`
      });

      // Reload the page after 2 seconds to refresh user data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Reset error:", error);
      setMessage({
        type: "error",
        text: error.message || "An error occurred while resetting subscription data"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Reset Subscription Data
          </CardTitle>
          <CardDescription>
            Development/Testing utility to clear all subscription-related data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="space-y-2">
            <h3 className="font-semibold">Current Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Premium Status:</span>
                <span className={user.isPremium ? "text-green-600 font-medium" : "text-gray-600"}>
                  {user.isPremium ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SafePay Customer:</span>
                <span className={user.safepayCustomerId ? "text-blue-600 font-mono text-xs" : "text-gray-400"}>
                  {user.safepayCustomerId || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subscription Token:</span>
                <span className={user.safepaySubscriptionToken ? "text-blue-600 font-mono text-xs" : "text-gray-400"}>
                  {user.safepaySubscriptionToken || "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will permanently delete all subscription and payment data.
              This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* What will be cleared */}
          <div className="space-y-2">
            <h3 className="font-semibold">What will be cleared:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>SafePay customer ID and merchant key</li>
              <li>SafePay subscription token</li>
              <li>Premium status and expiration date</li>
              <li>All payment records</li>
            </ul>
          </div>

          {/* Reset Button */}
          <Button
            onClick={handleReset}
            disabled={loading}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Subscription Data"
            )}
          </Button>

          {/* Result Message */}
          {message && (
            <Alert variant={message.type === "success" ? "default" : "destructive"}>
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className="whitespace-pre-line">
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Help Text */}
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This is a development utility. After resetting, you can test the
            subscription flow again from scratch. The page will automatically reload after reset.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

