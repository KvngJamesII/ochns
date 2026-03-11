import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Copy,
  User,
  Shield,
  LogOut,
  Loader2,
  Smartphone,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();

  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [totpQrCode, setTotpQrCode] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [showDisableTotp, setShowDisableTotp] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  const setupTotpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/totp/setup", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setTotpQrCode(data.qrCode);
      setTotpSecret(data.secret);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const verifyTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/totp/verify", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Two-factor authentication enabled" });
      setShowTotpSetup(false);
      setTotpQrCode(null);
      setTotpSecret(null);
      setTotpCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Invalid code", description: "Please try again with a fresh code from your authenticator app.", variant: "destructive" });
    },
  });

  const disableTotpMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/totp/disable", { code });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Two-factor authentication disabled" });
      setShowDisableTotp(false);
      setDisableCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Invalid code", description: "Please enter a valid authenticator code.", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleStartTotpSetup = () => {
    setShowTotpSetup(true);
    setTotpCode("");
    setupTotpMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-3">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </Link>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-settings-title"
          >
            Settings
          </h1>
          <p className="text-base text-muted-foreground mt-1">Manage your account</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Profile</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm text-muted-foreground">Username</Label>
                <p className="text-base font-medium mt-0.5" data-testid="text-username">{user?.username}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Role</Label>
                <div className="mt-0.5">
                  <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs" data-testid="text-role">
                    {user?.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Two-Factor Authentication</h2>
              </div>
              {user?.totpEnabled ? (
                <Badge variant="default" className="text-xs gap-1 bg-green-600 hover:bg-green-700" data-testid="badge-2fa-enabled">
                  <ShieldCheck className="w-3 h-3" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="badge-2fa-disabled">
                  <ShieldOff className="w-3 h-3" />
                  Disabled
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Secure your account with an authenticator app (Google Authenticator, Authy, etc.). This also enables password reset via your authenticator.
            </p>

            {user?.totpEnabled ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => { setShowDisableTotp(true); setDisableCode(""); }}
                data-testid="button-disable-2fa"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Disable 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleStartTotpSetup}
                data-testid="button-enable-2fa"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Enable 2FA
              </Button>
            )}
          </section>

          <section className="rounded-xl border border-destructive/30 bg-card p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sign out of your account on this device.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => logout.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </section>
        </div>

        <Dialog open={showTotpSetup} onOpenChange={(open) => { if (!open) { setShowTotpSetup(false); setTotpQrCode(null); setTotpSecret(null); setTotpCode(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app, then enter the 6-digit code to verify.
              </DialogDescription>
            </DialogHeader>

            {setupTotpMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : totpQrCode ? (
              <div className="space-y-4 mt-2">
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <img src={totpQrCode} alt="TOTP QR Code" className="w-48 h-48" data-testid="img-totp-qr" />
                  </div>
                </div>

                {totpSecret && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded" data-testid="text-totp-secret">{totpSecret}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(totpSecret)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="totp-code" className="text-sm">Verification Code</Label>
                  <Input
                    id="totp-code"
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTotpCode(val);
                      if (val.length === 6 && !verifyTotpMutation.isPending) {
                        verifyTotpMutation.mutate(val);
                      }
                    }}
                    placeholder="Enter 6-digit code"
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                    autoComplete="one-time-code"
                    data-testid="input-totp-verify"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowTotpSetup(false)}>Cancel</Button>
                  <Button
                    onClick={() => verifyTotpMutation.mutate(totpCode)}
                    disabled={totpCode.length !== 6 || verifyTotpMutation.isPending}
                    className="gap-2"
                    data-testid="button-verify-totp"
                  >
                    {verifyTotpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Enable 2FA
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={showDisableTotp} onOpenChange={(open) => { if (!open) { setShowDisableTotp(false); setDisableCode(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Disable Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Enter your authenticator code to confirm disabling 2FA. This will also remove the ability to reset your password via authenticator.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="disable-code" className="text-sm">Authenticator Code</Label>
                <Input
                  id="disable-code"
                  value={disableCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setDisableCode(val);
                    if (val.length === 6 && !disableTotpMutation.isPending) {
                      disableTotpMutation.mutate(val);
                    }
                  }}
                  placeholder="Enter 6-digit code"
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                  autoComplete="one-time-code"
                  data-testid="input-disable-totp"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDisableTotp(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => disableTotpMutation.mutate(disableCode)}
                  disabled={disableCode.length !== 6 || disableTotpMutation.isPending}
                  className="gap-2"
                  data-testid="button-confirm-disable-totp"
                >
                  {disableTotpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  Disable 2FA
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
