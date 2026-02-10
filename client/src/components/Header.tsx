import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAppConfig } from "@/lib/config";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { appName } = getAppConfig();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePricingClick = (e: React.MouseEvent) => {
    // If we're on the home/landing page, scroll to pricing
    if (location === '/') {
      e.preventDefault();
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to home page with pricing hash
      e.preventDefault();
      setLocation('/#pricing');
      // After navigation, scroll to pricing
      setTimeout(() => {
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleFeaturesClick = (e: React.MouseEvent) => {
    // If we're on the home/landing page, scroll to features
    if (location === '/') {
      e.preventDefault();
      const featuresSection = document.getElementById('features');
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to home page with features hash
      e.preventDefault();
      setLocation('/#features');
      // After navigation, scroll to features
      setTimeout(() => {
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <i className="fas fa-download text-white text-lg"></i>
              </div>
              <span className="text-xl font-bold gradient-text">{appName}</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className={`transition-colors font-medium cursor-pointer ${
                  isActive('/') ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Home
              </Link>
              <a
                href="#features"
                onClick={handleFeaturesClick}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={handlePricingClick}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Pricing
              </a>
              <Link
                href="/blog"
                className={`transition-colors cursor-pointer ${
                  isActive('/blog') || location.startsWith('/blog/') ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Blog
              </Link>
              <Link
                href="/contact"
                className={`transition-colors cursor-pointer ${
                  isActive('/contact') ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Contact Us
              </Link>
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-muted-foreground`}></i>
              </Button>

              {/* Auth Button - Desktop */}
              {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="hidden md:flex relative h-10 w-10 rounded-full">
                        <Avatar className="w-10 h-10 border-2 border-border cursor-pointer">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.username}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                          {user.isPremium && (
                            <div className="flex items-center space-x-1 mt-2">
                              <i className="fas fa-crown text-yellow-500 text-xs"></i>
                              <span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">Premium Member</span>
                            </div>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <i className="fas fa-user mr-2"></i>
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      {!user.isPremium && (
                        <DropdownMenuItem asChild>
                          <Link href="/subscribe" className="cursor-pointer text-primary">
                            <i className="fas fa-crown mr-2"></i>
                            Upgrade to Premium
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <i className="fas fa-sign-out-alt mr-2"></i>
                        {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              ) : (
                  <Button asChild className="hidden md:inline-flex">
                    <Link href="/auth">
                      <i className="fas fa-user mr-2"></i>
                      Sign In
                    </Link>
                  </Button>
              )}

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <i className="fas fa-bars text-foreground text-xl"></i>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      {user ? `Welcome, ${user.username}!` : 'Menu'}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-4 mt-6">
                    {/* User Info on Mobile */}
                    {user && (
                      <div className="flex items-center space-x-3 pb-4 border-b border-border">
                        <Avatar className="w-12 h-12 border-2 border-border">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          {user.isPremium && (
                            <div className="flex items-center space-x-1 mt-1">
                              <i className="fas fa-crown text-yellow-500 text-xs"></i>
                              <span className="text-xs text-yellow-600 dark:text-yellow-500">Premium</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Navigation Links */}
                    <Link
                      href="/"
                      className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className="fas fa-home w-5"></i>
                      <span>Home</span>
                    </Link>

                    <button
                      onClick={(e) => {
                        handleFeaturesClick(e);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors text-left w-full"
                    >
                      <i className="fas fa-star w-5"></i>
                      <span>Features</span>
                    </button>

                    <button
                      onClick={(e) => {
                        handlePricingClick(e);
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors text-left w-full"
                    >
                      <i className="fas fa-tag w-5"></i>
                      <span>Pricing</span>
                    </button>

                    <Link
                      href="/blog"
                      className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className="fas fa-blog w-5"></i>
                      <span>Blog</span>
                    </Link>

                    <Link
                      href="/contact"
                      className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className="fas fa-envelope w-5"></i>
                      <span>Contact Us</span>
                    </Link>

                    {user && (
                      <>
                        <div className="border-t border-border pt-4" />
                        <Link
                          href="/profile"
                          className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <i className="fas fa-user w-5"></i>
                          <span>Profile</span>
                        </Link>
                        {!user.isPremium && (
                          <Link
                            href="/subscribe"
                            className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted transition-colors text-primary"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <i className="fas fa-crown w-5"></i>
                            <span>Upgrade to Premium</span>
                          </Link>
                        )}
                      </>
                    )}

                    {/* Auth Actions */}
                    <div className="border-t border-border pt-4" />
                    {user ? (
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={() => {
                          logoutMutation.mutate();
                          setMobileMenuOpen(false);
                        }}
                        disabled={logoutMutation.isPending}
                      >
                        <i className="fas fa-sign-out-alt mr-2"></i>
                        {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className="w-full justify-start"
                      >
                        <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                          <i className="fas fa-user mr-2"></i>
                          Sign In
                        </Link>
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
  );
}