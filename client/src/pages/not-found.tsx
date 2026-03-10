import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 pt-32 text-center">
        <div className="text-7xl font-bold text-muted-foreground/30 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          404
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-404-title">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="outline" className="gap-2" data-testid="button-go-home">
              <Home className="w-4 h-4" />
              Go home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
