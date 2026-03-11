import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Save,
  Trash2,
  Key,
  Globe,
  Lock,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Shield,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProjectSettings() {
  const [, params] = useRoute("/:username/:projectId/settings");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const projectId = params?.projectId || "";
  const username = params?.username || "";

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  const { data: project, isLoading } = useQuery<any>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}?owner=${encodeURIComponent(username)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const [formData, setFormData] = useState<any>(null);

  if (project && !formData) {
    setFormData({
      name: project.name,
      description: project.description || "",
      visibility: project.visibility,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}?owner=${encodeURIComponent(username)}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save settings", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${projectId}?owner=${encodeURIComponent(username)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setLocation("/dashboard");
      toast({ title: "Project deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't delete project", description: err.message, variant: "destructive" });
    },
  });

  const generatePinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/generate-pin?owner=${encodeURIComponent(username)}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Auth PIN generated", description: `PIN: ${data.pin}` });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't generate PIN", description: err.message, variant: "destructive" });
    },
  });

  const copyPin = () => {
    if (project?.authPin) {
      navigator.clipboard.writeText(project.authPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!project?.isOwner) {
    window.location.href = `/${username}/${projectId}`;
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <Link href={`/${username}/${projectId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-4" data-testid="button-back-to-project">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to project
            </Button>
          </Link>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-settings-title"
          >
            Project Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your project configuration
          </p>
        </div>

        <div className="space-y-8">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">General</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="settings-name" className="text-sm font-medium">Project Name</Label>
                <Input
                  id="settings-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-settings-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="settings-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  data-testid="input-settings-description"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => setFormData({ ...formData, visibility: v })}
                >
                  <SelectTrigger data-testid="select-settings-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Public
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Private
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="gap-2" disabled={updateMutation.isPending} data-testid="button-save-settings">
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Auth PIN</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Generate an Auth PIN for private project access. Share this PIN with trusted users who need CLI or web access.
            </p>

            {project.authPin ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 mb-4">
                <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <code className="text-sm font-mono flex-1">{project.authPin}</code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyPin} data-testid="button-copy-pin">
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4 italic">No Auth PIN generated yet</p>
            )}

            <Button
              variant="outline"
              onClick={() => generatePinMutation.mutate()}
              className="gap-2"
              disabled={generatePinMutation.isPending}
              data-testid="button-generate-pin"
            >
              {generatePinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {project.authPin ? "Regenerate PIN" : "Generate PIN"}
            </Button>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-card p-6">
            <h2 className="text-base font-semibold text-destructive mb-2">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting a project is permanent. All files, versions, and settings will be lost.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDelete(true)}
              className="gap-2"
              data-testid="button-delete-project"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </Button>
          </div>
        </div>

        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{project.name}" and all its files. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-project"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
