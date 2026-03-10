import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Terminal,
  User,
  Shield,
  LogOut,
  Loader2,
  EyeOff,
  Clock,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApiTokenInfo {
  id: string;
  name: string;
  tokenPreview: string;
  lastUsed: string | null;
  createdAt: string;
}

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const [showNewToken, setShowNewToken] = useState(false);
  const [tokenName, setTokenName] = useState("CLI Token");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  const { data: tokens, isLoading: tokensLoading } = useQuery<ApiTokenInfo[]>({
    queryKey: ["/api/auth/tokens"],
    enabled: isAuthenticated,
  });

  const generateTokenMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/auth/token", { name });
      return res.json();
    },
    onSuccess: (data: any) => {
      setGeneratedToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/tokens"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/auth/tokens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/tokens"] });
      setDeletingTokenId(null);
      toast({ title: "Token revoked" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-settings-title"
          >
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and CLI access</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Profile</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Username</Label>
                <p className="text-sm font-medium mt-0.5" data-testid="text-username">{user?.username}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
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
                <Key className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>API Tokens</h2>
              </div>
              <Button
                size="sm"
                onClick={() => { setShowNewToken(true); setGeneratedToken(null); setTokenName("CLI Token"); }}
                className="gap-1.5"
                data-testid="button-new-token"
              >
                <Plus className="w-3.5 h-3.5" />
                New Token
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              API tokens authenticate the CLI without needing to enter your password. Generate a token here, then paste it on your server.
            </p>

            {tokensLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : tokens?.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground" data-testid="text-no-tokens">
                <Key className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                No tokens yet. Generate one to get started.
              </div>
            ) : (
              <div className="space-y-2" data-testid="list-tokens">
                {tokens?.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                    data-testid={`token-${token.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{token.name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-muted-foreground font-mono">{token.tokenPreview}</code>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {token.lastUsed
                            ? `Used ${new Date(token.lastUsed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : "Never used"}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => setDeletingTokenId(token.id)}
                      data-testid={`button-delete-token-${token.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-destructive/30 bg-card p-6">
            <h2 className="text-base font-semibold text-destructive mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Danger Zone
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
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

        <Dialog open={showNewToken} onOpenChange={(open) => { setShowNewToken(open); if (!open) setGeneratedToken(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {generatedToken ? "Token Generated" : "Generate API Token"}
              </DialogTitle>
              <DialogDescription>
                {generatedToken
                  ? "Copy this token now — you won't be able to see it again."
                  : "Create a new token for CLI authentication."}
              </DialogDescription>
            </DialogHeader>

            {!generatedToken ? (
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="token-name" className="text-sm">Token Name</Label>
                  <Input
                    id="token-name"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. My VPS, Production Server"
                    data-testid="input-token-name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewToken(false)}>Cancel</Button>
                  <Button
                    onClick={() => generateTokenMutation.mutate(tokenName)}
                    disabled={generateTokenMutation.isPending || !tokenName.trim()}
                    className="gap-2"
                    data-testid="button-generate-token"
                  >
                    {generateTokenMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Generate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-sm">Your setup command</Label>
                  <div className="relative">
                    <pre className="bg-muted/50 border border-border rounded-lg p-3 pr-10 text-xs font-mono overflow-x-auto break-all whitespace-pre-wrap" data-testid="text-generated-token-cmd">
                      node vpush.js server https://vpush.tech && node vpush.js token {generatedToken}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1.5 right-1.5 h-7 w-7"
                      onClick={() => copyToClipboard(`node vpush.js server https://vpush.tech && node vpush.js token ${generatedToken}`)}
                      data-testid="button-copy-generated-token"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    Copy this command now — the token won't be shown again.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => { setShowNewToken(false); setGeneratedToken(null); }} data-testid="button-done-token">
                    Done
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingTokenId} onOpenChange={(open) => { if (!open) setDeletingTokenId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Token</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently revoke this token. Any CLI instances using it will lose access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingTokenId && deleteTokenMutation.mutate(deletingTokenId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-token"
              >
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
