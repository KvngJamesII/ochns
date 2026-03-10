import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Terminal, ArrowRight, Loader2, Check, X, User, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function UsernameInput({
  value,
  onChange,
  onStatusChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onStatusChange: (status: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [reason, setReason] = useState("");

  const updateStatus = (newStatus: typeof status, newReason: string = "") => {
    setStatus(newStatus);
    setReason(newReason);
    onStatusChange(newStatus);
  };

  useEffect(() => {
    if (value.length < 3) {
      updateStatus(value.length > 0 ? "invalid" : "idle", value.length > 0 ? "At least 3 characters" : "");
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(value)) {
      updateStatus("invalid", "Only lowercase letters, numbers, hyphens, underscores");
      return;
    }

    updateStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username/${value}`);
        const data = await res.json();
        if (data.available) {
          updateStatus("available");
        } else {
          updateStatus("taken", data.reason || "Not available");
        }
      } catch {
        updateStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor="username" className="text-sm font-medium flex items-center gap-1.5">
        <User className="w-3.5 h-3.5 text-muted-foreground" />
        Username
      </Label>
      <div className="relative">
        <Input
          id="username"
          data-testid="input-username"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
          className="pr-9 font-mono text-sm"
          placeholder="your-name"
          required
          minLength={3}
          maxLength={30}
          autoComplete="username"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {status === "available" && <Check className="w-4 h-4 text-green-500" />}
          {(status === "taken" || status === "invalid") && <X className="w-4 h-4 text-destructive" />}
        </div>
      </div>
      {reason && (
        <p className={`text-xs ${status === "available" ? "text-green-500" : "text-destructive"}`} data-testid="text-username-status">
          {reason}
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const search = useSearch();
  const urlMode = new URLSearchParams(search).get("mode");
  const [mode, setMode] = useState<"login" | "register">(urlMode === "login" ? "login" : "register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const { login, register, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (urlMode === "login" || urlMode === "register") {
      setMode(urlMode);
    }
  }, [urlMode]);

  if (isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", variant: "destructive" });
        return;
      }
      if (!agreedToTerms) {
        toast({ title: "Please agree to the Terms of Service", variant: "destructive" });
        return;
      }
    }
    try {
      if (mode === "login") {
        await login.mutateAsync({ username, password });
      } else {
        await register.mutateAsync({ username, email, password });
      }
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex min-h-screen pt-16">
        <div className="hidden lg:flex flex-1 items-center justify-center border-r border-border/40 p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.06]" />
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-20 left-20 w-56 h-56 rounded-full bg-primary/3 blur-3xl" />

          <div className="max-w-md relative z-10">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-8">
              <Terminal className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2
              className="text-3xl font-bold tracking-tight mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-auth-promo-title"
            >
              {mode === "register" ? "Start deploying in seconds" : "Welcome back to VPush"}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-10">
              {mode === "register"
                ? "Join thousands of developers who use VPush to manage and deploy files to their servers without the complexity of Git."
                : "Sign in to manage your projects and deploy files to your servers."}
            </p>

            <div className="rounded-xl border border-border/60 bg-[#0d1117] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
              </div>
              <div className="p-4 font-mono text-xs leading-relaxed">
                <div>
                  <span className="text-[#f0f6fc]">$ </span>
                  <span className="text-[#79c0ff]">vpush</span>
                  <span className="text-[#f0f6fc]"> push</span>
                </div>
                <div className="text-[#8b949e] mt-1 ml-2">Scanning 47 files...</div>
                <div className="text-[#3fb950] ml-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Deployed in 0.8s
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="lg:hidden w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
                <Terminal className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-auth-title">
                {mode === "login" ? "Sign in" : "Create account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === "login"
                  ? "Enter your credentials to continue"
                  : "Free forever during beta"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" ? (
                <>
                  <UsernameInput value={username} onChange={setUsername} onStatusChange={setUsernameStatus} />

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      data-testid="input-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      Password
                    </Label>
                    <Input
                      id="password"
                      data-testid="input-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-sm font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      Confirm Password
                    </Label>
                    <Input
                      id="confirm-password"
                      data-testid="input-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords don't match</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(v) => setAgreedToTerms(v === true)}
                      data-testid="checkbox-terms"
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="login-username"
                      data-testid="input-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      minLength={3}
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="login-password"
                      data-testid="input-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      minLength={6}
                      autoComplete="current-password"
                    />
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isPending || (mode === "register" && (password !== confirmPassword || usernameStatus !== "available"))}

                data-testid="button-submit-auth"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign in" : "Create account"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-auth-mode"
              >
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <span className="text-primary font-medium">Sign up</span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span className="text-primary font-medium">Sign in</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
