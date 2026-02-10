import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter your account email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => ({}));

      toast({
        title: "Check your email",
        description: "If an account exists for that email, we sent a reset link.",
      });
      setLocation("/auth");
    } catch {
      toast({
        title: "Request failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Forgot Password - VidGrabber"
        description="Request a password reset link for your VidGrabber account."
        canonicalUrl="/forgot-password"
        noindex
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 sm:py-24">
          <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="shadow-xl border border-border">
              <CardContent className="p-8 space-y-4">
                <h1 className="text-2xl font-bold">Forgot password</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email and we’ll send a password reset link.
                </p>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <Button className="w-full" onClick={submit} disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>

                <Button variant="outline" className="w-full" onClick={() => setLocation("/auth")}
                >
                  Back to login
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

