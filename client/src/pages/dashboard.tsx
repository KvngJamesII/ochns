import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FolderOpen,
  Globe,
  Lock,
  Calendar,
  ArrowRight,
  Loader2,
  Search,
  Terminal,
  Copy,
  Key,
  Trash2,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProject, setNewProject] = useState({ name: "", description: "", visibility: "public" });
  const [showTokenSetup, setShowTokenSetup] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  if (!authLoading && !isAuthenticated) {
    window.location.href = "/auth";
    return null;
  }

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; visibility: string }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreate(false);
      setNewProject({ name: "", description: "", visibility: "public" });
      toast({ title: "Project created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/token", { name: "CLI Token" });
      return res.json();
    },
    onSuccess: (data: any) => {
      setGeneratedToken(data.token);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const filteredProjects = projects?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1" data-testid="text-greeting">
                Welcome back, <span className="text-foreground font-medium">{user?.username}</span>
              </p>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-dashboard-title"
              >
                Your Projects
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowTokenSetup(true); setGeneratedToken(null); }}
                className="gap-2"
                data-testid="button-cli-setup"
              >
                <Terminal className="w-4 h-4" />
                CLI Setup
              </Button>
              <Button onClick={() => setShowCreate(true)} className="gap-2" data-testid="button-new-project">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4" data-testid="stat-total-projects">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Projects</span>
              </div>
              <div className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {projects?.length ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4" data-testid="stat-public-projects">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-medium">Public</span>
              </div>
              <div className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {projects?.filter((p) => p.visibility === "public").length ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 col-span-2 sm:col-span-1" data-testid="stat-private-projects">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground font-medium">Private</span>
              </div>
              <div className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {projects?.filter((p) => p.visibility === "private").length ?? 0}
              </div>
            </div>
          </div>
        </div>

        {(projects?.length ?? 0) > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
              data-testid="input-search-projects"
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProjects?.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-projects">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "No matching projects" : "No projects yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {searchQuery
                ? "Try a different search term"
                : "Create your first project to start pushing and pulling files"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreate(true)} className="gap-2" data-testid="button-create-first">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects?.map((project) => (
              <Link
                key={project.id}
                href={`/${user?.username}/${project.projectId}`}
              >
                <div
                  className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all duration-200 p-5 cursor-pointer h-full"
                  data-testid={`card-project-${project.projectId}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4.5 h-4.5 text-primary" />
                      <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                    </div>
                    <Badge
                      variant={project.visibility === "public" ? "secondary" : "outline"}
                      className="text-xs flex-shrink-0"
                    >
                      {project.visibility === "public" ? (
                        <Globe className="w-3 h-3 mr-1" />
                      ) : (
                        <Lock className="w-3 h-3 mr-1" />
                      )}
                      {project.visibility}
                    </Badge>
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Create New Project
              </DialogTitle>
              <DialogDescription>
                Set up a new file repository for your deployment workflow.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newProject);
              }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-sm font-medium">Project Name</Label>
                <Input
                  id="project-name"
                  data-testid="input-project-name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="my-api-server"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="project-description"
                  data-testid="input-project-description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of your project"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Visibility</Label>
                <Select
                  value={newProject.visibility}
                  onValueChange={(v) => setNewProject({ ...newProject, visibility: v })}
                >
                  <SelectTrigger data-testid="select-visibility">
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="gap-2" data-testid="button-create-project">
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showTokenSetup} onOpenChange={(open) => { setShowTokenSetup(open); if (!open) setGeneratedToken(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                CLI Setup
              </DialogTitle>
              <DialogDescription>
                Get started with VPush CLI on your server in 3 steps. No terminal login required.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  Download the CLI
                </div>
                <div className="relative">
                  <pre className="bg-muted/50 border border-border rounded-lg p-3 pr-10 text-xs font-mono overflow-x-auto" data-testid="text-cli-download-cmd">
                    curl -o vpush.js {window.location.origin}/cli/index.js
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1.5 right-1.5 h-7 w-7"
                    onClick={() => copyToClipboard(`curl -o vpush.js ${window.location.origin}/cli/index.js`, "download")}
                    data-testid="button-copy-download"
                  >
                    {copied === "download" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  Generate & set your token
                </div>
                {!generatedToken ? (
                  <Button
                    onClick={() => generateTokenMutation.mutate()}
                    disabled={generateTokenMutation.isPending}
                    variant="outline"
                    className="gap-2 w-full"
                    data-testid="button-generate-token"
                  >
                    {generateTokenMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Generate API Token
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <pre className="bg-muted/50 border border-border rounded-lg p-3 pr-10 text-xs font-mono overflow-x-auto break-all whitespace-pre-wrap" data-testid="text-cli-token-cmd">
                        node vpush.js server {window.location.origin} && node vpush.js token {generatedToken}
                      </pre>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-1.5 right-1.5 h-7 w-7"
                        onClick={() => copyToClipboard(`node vpush.js server ${window.location.origin} && node vpush.js token ${generatedToken}`, "token")}
                        data-testid="button-copy-token"
                      >
                        {copied === "token" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />
                      Copy this now — you won't see this token again.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  Init & pull your project
                </div>
                <div className="relative">
                  <pre className="bg-muted/50 border border-border rounded-lg p-3 pr-10 text-xs font-mono overflow-x-auto" data-testid="text-cli-init-cmd">
                    node vpush.js init{"\n"}node vpush.js pull
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-1.5 right-1.5 h-7 w-7"
                    onClick={() => copyToClipboard("node vpush.js init && node vpush.js pull", "init")}
                    data-testid="button-copy-init"
                  >
                    {copied === "init" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  That's it — no terminal login needed. The token stays saved at <code className="text-foreground">~/.vpush/config.json</code> so you're always authenticated.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
