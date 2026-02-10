import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SiInstagram, SiTiktok, SiYoutube, SiGoogle, SiFacebook, SiGithub } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/lib/config";

export default function AuthPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (user) {
            setLocation("/");
        }
    }, [user, setLocation]);

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex flex-col justify-center p-8 bg-background">
                <div className="mx-auto w-full max-w-md space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tighter">Welcome Back</h1>
                        <p className="text-muted-foreground">
                            Sign in to manage your downloads and subscriptions
                        </p>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <LoginForm />
                        </TabsContent>

                        <TabsContent value="register">
                            <RegisterForm />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <div className="hidden lg:flex flex-col justify-center p-12 bg-muted text-muted-foreground">
                <div className="mx-auto max-w-lg space-y-6">
                    <div className="grid grid-cols-3 gap-8 mb-8">
                        <SiInstagram className="w-12 h-12" />
                        <SiTiktok className="w-12 h-12" />
                        <SiYoutube className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">
                        Download your favorite content in seconds
                    </h2>
                    <p className="text-lg">
                        Join thousands of users who trust our platform for high-quality social media downloads.
                        Save videos, stories, and reels from all major platforms.
                    </p>
                </div>
            </div>
        </div>
    );
}

function LoginForm() {
    const { loginMutation } = useAuth();
    const { toast } = useToast();
    const form = useForm({
        defaultValues: { username: "", password: "" },
    });

    // Check which OAuth providers are configured via env
    const hasGoogleOAuth = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID);
    const hasFacebookOAuth = !!(import.meta.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID);
    const hasGitHubOAuth = !!(import.meta.env.VITE_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID);

    const startSocial = (provider: 'google' | 'facebook' | 'github') => {
        // Check if provider is configured
        const providerConfigured =
            (provider === 'google' && hasGoogleOAuth) ||
            (provider === 'facebook' && hasFacebookOAuth) ||
            (provider === 'github' && hasGitHubOAuth);

        if (!providerConfigured) {
            toast({
                title: 'Coming Soon',
                description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login will be available soon!`,
                variant: 'default'
            });
            return;
        }

        // OAuth flows require a full-page redirect.
        // Use the configured API base URL so this works in dev (5173 -> 5000/5001) and production.
        const base = (config.apiBaseUrl || '').replace(/\/$/, '');
        const next = encodeURIComponent(window.location.pathname || '/');
        const url = `${base}/api/auth/${provider}?next=${next}`;
        window.location.href = url;

        setTimeout(() => {
            toast({ title: 'Redirecting…', description: `Opening ${provider} login.` });
        }, 150);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex items-center justify-between">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                </Button>

                <div className="pt-2 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 touch-manipulation relative"
                    onClick={() => startSocial('google')}
                  >
                    <SiGoogle className="h-4 w-4" />
                    Continue with Google
                    {!hasGoogleOAuth && (
                      <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 touch-manipulation relative"
                    onClick={() => startSocial('facebook')}
                  >
                    <SiFacebook className="h-4 w-4" />
                    Continue with Facebook
                    {!hasFacebookOAuth && (
                      <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2 touch-manipulation relative"
                    onClick={() => startSocial('github')}
                  >
                    <SiGithub className="h-4 w-4" />
                    Continue with GitHub
                    {!hasGitHubOAuth && (
                      <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
                    )}
                  </Button>
                </div>
            </form>
        </Form>
    );
}

function RegisterForm() {
    const { registerMutation } = useAuth();
    const form = useForm({
        resolver: zodResolver(insertUserSchema),
        defaultValues: { username: "", password: "", email: "" },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4 pt-4">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "Creating Account..." : "Register"}
                </Button>
            </form>
        </Form>
    );
}