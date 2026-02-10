import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-5xl"></i>
          </div>
          <h1 className="text-2xl font-bold mb-2">404 Page Not Found</h1>
          <p className="mt-4 text-sm text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button>
              <i className="fas fa-home mr-2"></i>
              Go Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
