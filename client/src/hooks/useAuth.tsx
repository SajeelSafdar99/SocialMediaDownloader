import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/lib/config";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  function getFullApiUrl(url: string): string {
    // If URL is already absolute, return it
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    
    const base = (config.apiBaseUrl || "").replace(/\/$/, "");
    
    // If base is empty (development), use relative URL to leverage Vite proxy
    if (!base) {
      return url.startsWith("/") ? url : `/${url}`;
    }
    
    // If base is set (production), construct full URL
    return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
  }

  // 1. Fetch current user
  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const apiUrl = getFullApiUrl("/api/auth/user");
      
      try {
        const res = await fetch(apiUrl, {
          credentials: "include",
        });
        
        if (res.status === 401) {
          return null;
        }
        if (!res.ok) {
          // Don't throw for network errors - just return null (user is not logged in)
          if (res.status >= 500 || res.status === 0) {
            return null;
          }
          throw new Error("Failed to fetch user");
        }
        return res.json();
      } catch (err: any) {
        // Handle network errors gracefully (connection refused, etc.)
        if (err?.message?.includes("Failed to fetch") || 
            err?.message?.includes("ERR_CONNECTION_REFUSED") ||
            err?.message?.includes("NetworkError")) {
          return null; // Return null instead of throwing - allows app to render
        }
        throw err; // Re-throw other errors
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry on connection errors
      if (error?.message?.includes("Failed to fetch") || 
          error?.message?.includes("ERR_CONNECTION_REFUSED")) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: 1000,
    // Don't show error toasts for connection errors
    onError: (err: any) => {
      // Silently handle connection errors
    },
  });

  // 2. Login Mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: Pick<InsertUser, "username" | "password">) => {
      const res = await fetch(getFullApiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Login failed");
      }
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.username}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 3. Register Mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch(getFullApiUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error((await res.text()) || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Account created",
        description: "Welcome to Social Media Downloader!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 4. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(getFullApiUrl("/api/logout"), {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error as Error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}