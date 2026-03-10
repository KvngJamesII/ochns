import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Terminal, LogOut, LayoutDashboard, Settings, ChevronDown } from "lucide-react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const isLanding = location === "/";

  return (
    <header
      data-testid="header"
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors ${
        isLanding
          ? "bg-background/60 backdrop-blur-xl border-border/40"
          : "bg-background/95 backdrop-blur-sm border-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Terminal className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                VPush
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {isLanding && (
              <>
                <a href="#how-it-works" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md" data-testid="link-how-it-works">
                  How It Works
                </a>
                <a href="#cli" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md" data-testid="link-cli">
                  CLI
                </a>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:inline">{user?.username}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer" data-testid="link-dashboard">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 cursor-pointer text-destructive"
                    onClick={() => logout.mutate()}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth?mode=login">
                  <Button variant="ghost" size="sm" data-testid="link-login">
                    Sign in
                  </Button>
                </Link>
                <Link href="/auth?mode=register">
                  <Button size="sm" data-testid="link-register">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
