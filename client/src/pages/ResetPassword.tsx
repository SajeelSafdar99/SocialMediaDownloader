import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function useQueryParam(name: string): string | null {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return useMemo(() => {
    const sp = new URLSearchParams(search);
    return sp.get(name);
  }, [search, name]);
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const token = useQueryParam("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) {
      toast({ title: "Invalid link", description: "Missing reset token.", variant: "destructive" });
      return;
    }
    if (!password || password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please retype your password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Reset failed");

      toast({ title: "Password updated", description: "You can now login with your new password." });
      setLocation("/auth");
    } catch (e: any) {
      toast({ title: "Reset failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Reset Password - VidGrabber"
        description="Reset your VidGrabber account password securely."
        canonicalUrl="/reset-password"
        noindex
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 py-16 sm:py-24">
          <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="shadow-xl border border-border">
              <CardContent className="p-8 space-y-4">
                <h1 className="text-2xl font-bold">Reset your password</h1>
                <p className="text-muted-foreground text-sm">
                  Choose a new password for your account.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">New password</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirm password</label>
                    <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                </div>

                <Button className="w-full" onClick={submit} disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
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
