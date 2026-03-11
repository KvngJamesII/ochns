import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Folder,
  File,
  Plus,
  Upload,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  Eye,
  ArrowLeft,
  Globe,
  Lock,
  Settings,
  Home,
  Loader2,
  FileText,
  History,
  Save,
  Copy,
  Check,
  FileCode2,
  FileJson,
  FileType,
  Image,
  FileSpreadsheet,
  Braces,
  Terminal,
} from "lucide-react";
import {
  SiPython,
  SiJavascript,
  SiTypescript,
  SiHtml5,
  SiCss3,
  SiReact,
  SiMarkdown,
  SiRust,
  SiGo,
  SiPhp,
  SiRuby,
  SiSwift,
  SiCplusplus,
  SiGnubash,
} from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FileRecord, FileVersion } from "@shared/schema";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(name: string, isDirectory: boolean) {
  if (isDirectory) return <Folder className="w-4 h-4 text-primary" />;
  const ext = name.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, { icon: any; color: string }> = {
    py: { icon: SiPython, color: "text-[#3776AB]" },
    js: { icon: SiJavascript, color: "text-[#F7DF1E]" },
    mjs: { icon: SiJavascript, color: "text-[#F7DF1E]" },
    cjs: { icon: SiJavascript, color: "text-[#F7DF1E]" },
    ts: { icon: SiTypescript, color: "text-[#3178C6]" },
    jsx: { icon: SiReact, color: "text-[#61DAFB]" },
    tsx: { icon: SiReact, color: "text-[#61DAFB]" },
    html: { icon: SiHtml5, color: "text-[#E34F26]" },
    htm: { icon: SiHtml5, color: "text-[#E34F26]" },
    css: { icon: SiCss3, color: "text-[#1572B6]" },
    scss: { icon: SiCss3, color: "text-[#CD6799]" },
    md: { icon: SiMarkdown, color: "text-muted-foreground" },
    mdx: { icon: SiMarkdown, color: "text-muted-foreground" },
    rs: { icon: SiRust, color: "text-[#DEA584]" },
    go: { icon: SiGo, color: "text-[#00ADD8]" },
    php: { icon: SiPhp, color: "text-[#777BB4]" },
    rb: { icon: SiRuby, color: "text-[#CC342D]" },
    swift: { icon: SiSwift, color: "text-[#F05138]" },
    cpp: { icon: SiCplusplus, color: "text-[#00599C]" },
    c: { icon: SiCplusplus, color: "text-[#A8B9CC]" },
    h: { icon: SiCplusplus, color: "text-[#A8B9CC]" },
    sh: { icon: SiGnubash, color: "text-[#4EAA25]" },
    bash: { icon: SiGnubash, color: "text-[#4EAA25]" },
    zsh: { icon: SiGnubash, color: "text-[#4EAA25]" },
    json: { icon: Braces, color: "text-[#F7DF1E]" },
    yaml: { icon: FileCode2, color: "text-[#CB171E]" },
    yml: { icon: FileCode2, color: "text-[#CB171E]" },
    toml: { icon: FileCode2, color: "text-[#9C4121]" },
    xml: { icon: FileCode2, color: "text-orange-500" },
    sql: { icon: FileSpreadsheet, color: "text-[#336791]" },
    csv: { icon: FileSpreadsheet, color: "text-green-600" },
    png: { icon: Image, color: "text-purple-500" },
    jpg: { icon: Image, color: "text-purple-500" },
    jpeg: { icon: Image, color: "text-purple-500" },
    gif: { icon: Image, color: "text-purple-500" },
    svg: { icon: Image, color: "text-orange-500" },
    webp: { icon: Image, color: "text-purple-500" },
    txt: { icon: FileText, color: "text-muted-foreground" },
    log: { icon: FileText, color: "text-muted-foreground" },
    env: { icon: FileCode2, color: "text-yellow-600" },
  };

  const match = iconMap[ext || ""];
  if (match) {
    const Icon = match.icon;
    return <Icon className={`w-4 h-4 ${match.color}`} />;
  }

  const codeExts = ["java", "kt", "dart", "lua", "r", "pl", "ex", "exs", "elm", "hs", "scala", "clj", "vue", "svelte", "astro", "ini", "cfg", "conf", "dockerfile", "makefile"];
  if (codeExts.includes(ext || "") || name.toLowerCase() === "dockerfile" || name.toLowerCase() === "makefile") {
    return <FileCode2 className="w-4 h-4 text-orange-500" />;
  }

  return <File className="w-4 h-4 text-muted-foreground" />;
}

function getLanguageLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    py: "Python", js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
    ts: "TypeScript", jsx: "React JSX", tsx: "React TSX",
    html: "HTML", htm: "HTML", css: "CSS", scss: "SCSS", sass: "Sass",
    json: "JSON", yaml: "YAML", yml: "YAML", toml: "TOML", xml: "XML",
    md: "Markdown", mdx: "MDX",
    rs: "Rust", go: "Go", php: "PHP", rb: "Ruby", swift: "Swift",
    cpp: "C++", c: "C", h: "C Header", cs: "C#",
    java: "Java", kt: "Kotlin", dart: "Dart",
    sh: "Shell", bash: "Bash", zsh: "Zsh", bat: "Batch", ps1: "PowerShell",
    sql: "SQL", r: "R", lua: "Lua", pl: "Perl",
    ex: "Elixir", exs: "Elixir", elm: "Elm", hs: "Haskell",
    scala: "Scala", clj: "Clojure",
    vue: "Vue", svelte: "Svelte", astro: "Astro",
    txt: "Plain Text", log: "Log", csv: "CSV",
    env: "Environment", ini: "INI", cfg: "Config", conf: "Config",
    dockerfile: "Dockerfile", makefile: "Makefile",
  };
  if (name.toLowerCase() === "dockerfile") return "Dockerfile";
  if (name.toLowerCase() === "makefile") return "Makefile";
  return langMap[ext || ""] || "File";
}

function isTextFile(name: string): boolean {
  const textExts = ["txt", "md", "json", "js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "css", "scss", "html", "xml", "yaml", "yml", "toml", "sh", "bash", "sql", "php", "env", "gitignore", "dockerignore", "makefile", "conf", "cfg", "ini", "log", "csv"];
  const ext = name.split(".").pop()?.toLowerCase();
  return textExts.includes(ext || "");
}

function CliCopyBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#0d1117] border border-border px-3 py-2 font-mono text-sm">
      <code className="text-green-400 flex-1 truncate">$ {command}</code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
      </button>
    </div>
  );
}

export default function ProjectView() {
  const [, params] = useRoute("/:username/:projectId");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPath, setCurrentPath] = useState("/");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showRename, setShowRename] = useState<FileRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDelete, setShowDelete] = useState<FileRecord | null>(null);
  const [viewingFile, setViewingFile] = useState<FileRecord | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showVersions, setShowVersions] = useState<FileRecord | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [authPin, setAuthPin] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const projectId = params?.projectId || "";
  const username = params?.username || "";

  // Build query string with owner and optional PIN
  const pinParam = authPin ? `&pin=${encodeURIComponent(authPin)}` : "";
  const ownerParam = `owner=${encodeURIComponent(username)}`;

  const { data: project, isLoading: projectLoading } = useQuery<any>({
    queryKey: ["/api/projects", projectId, authPin],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}?${ownerParam}${pinParam}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Project not found");
      return res.json();
    },
  });

  const { data: fileList, isLoading: filesLoading } = useQuery<FileRecord[]>({
    queryKey: ["/api/projects", projectId, "files", currentPath, authPin],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/files?path=${encodeURIComponent(currentPath)}&${ownerParam}${pinParam}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error("Failed to load files");
      return res.json();
    },
    enabled: !!project && !project.requiresPin,
  });

  const isOwner = project?.isOwner || (isAuthenticated && user?.username === username);

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/files?owner=${encodeURIComponent(username)}`, {
        name,
        parentPath: currentPath,
        isDirectory: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      setShowNewFolder(false);
      setNewFolderName("");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create folder", description: err.message, variant: "destructive" });
    },
  });

  const createFileMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/files?owner=${encodeURIComponent(username)}`, {
        name,
        parentPath: currentPath,
        isDirectory: false,
        content: "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      setShowNewFile(false);
      setNewFileName("");
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create file", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      formData.append("parentPath", currentPath);
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch(`/api/projects/${projectId}/upload?${ownerParam}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Upload failed");
      }
      const result = await res.json();
      if (Array.isArray(result) && result.length === 0) {
        throw new Error("No files were received by the server. Try a smaller file or different format.");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({ title: "Files uploaded successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `/api/files/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      setShowRename(null);
    },
    onError: (err: any) => {
      toast({ title: "Rename failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      setShowDelete(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const saveFileMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiRequest("PATCH", `/api/files/${id}`, { content });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      setViewingFile(data);
      setIsEditing(false);
      toast({ title: "File saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: versions } = useQuery<FileVersion[]>({
    queryKey: ["/api/files", showVersions?.id, "versions"],
    enabled: !!showVersions,
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ fileId, versionId }: { fileId: string; versionId: string }) => {
      const res = await apiRequest("POST", `/api/files/${fileId}/restore/${versionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setShowVersions(null);
      toast({ title: "Version restored" });
    },
  });

  const breadcrumbs = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinInput.trim();
    if (!pin) return;
    setAuthPin(pin);
  };

  const navigateToFolder = (file: FileRecord) => {
    setCurrentPath(file.path);
  };

  const goUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? "/" : "/" + parts.join("/"));
  };

  const handleViewFile = async (file: FileRecord) => {
    try {
      const res = await fetch(`/api/files/${file.id}?${pinParam.replace("&", "")}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Couldn't load file content");
      const data = await res.json();
      setViewingFile(data);
      setEditContent(data.content || "");
      setIsEditing(false);
    } catch (err: any) {
      toast({ title: "File error", description: err.message, variant: "destructive" });
    }
  };

  const projectUrl = project ? `vpush.tech/${username}/${project.name}` : `vpush.tech/${username}/${projectId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://${projectUrl}`);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 text-center">
          <h1 className="text-2xl font-bold mb-4" data-testid="text-project-not-found">Project not found</h1>
          <Link href="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </main>
      </div>
    );
  }

  if (project.requiresPin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-sm mx-auto px-4 pt-32 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-private-project"
          >
            Private Project
          </h1>
          <p className="text-base text-muted-foreground mb-6">
            Enter the Auth PIN to access this project
          </p>
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <Input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Auth PIN"
              data-testid="input-auth-pin"
              className="text-center"
            />
            <Button type="submit" className="w-full" data-testid="button-submit-pin">
              Access Project
            </Button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href={isOwner ? "/dashboard" : "/"}>
                <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" data-testid="button-back">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                data-testid="text-project-name"
              >
                {project.name}
              </h1>
              <Badge variant={project.visibility === "public" ? "secondary" : "outline"} className="text-xs">
                {project.visibility === "public" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                {project.visibility}
              </Badge>
            </div>
            {project.description && (
              <p className="text-base text-muted-foreground mt-1">{project.description}</p>
            )}
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
              data-testid="button-copy-url"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {projectUrl}
            </button>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              <Link href={`/${username}/${projectId}/settings`}>
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-settings">
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </Button>
              </Link>
            </div>
          )}
        </div>

        {viewingFile ? (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#30363d] bg-[#161b22]">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => { setViewingFile(null); setIsEditing(false); }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  data-testid="button-back-to-files"
                >
                  <ArrowLeft className="w-4 h-4 text-[#8b949e]" />
                </button>
                {getFileIcon(viewingFile.name, false)}
                <span className="text-sm font-mono text-[#e6edf3] font-medium truncate">{viewingFile.name}</span>
                <Badge variant="secondary" className="text-[10px] h-5 bg-[#30363d] text-[#8b949e] border-0">
                  {getLanguageLabel(viewingFile.name)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && isTextFile(viewingFile.name) && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs border-[#30363d] bg-transparent text-[#c9d1d9] hover:bg-[#30363d] hover:text-[#e6edf3]"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-file"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs border-[#30363d] bg-transparent text-[#c9d1d9] hover:bg-[#30363d]"
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(viewingFile.content || "");
                      }}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 text-xs bg-[#238636] hover:bg-[#2ea043] border-0 text-white"
                      onClick={() =>
                        saveFileMutation.mutate({ id: viewingFile.id, content: editContent })
                      }
                      disabled={saveFileMutation.isPending}
                      data-testid="button-save-file"
                    >
                      {saveFileMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-auto bg-[#0d1117]" style={{ minHeight: "60vh" }}>
              {isEditing ? (
                <div className="flex min-h-[60vh]">
                  <div className="select-none text-right pr-3 pl-4 py-3 text-[#484f58] font-mono text-sm leading-[1.45rem] border-r border-[#21262d] bg-[#0d1117] flex-shrink-0" aria-hidden="true">
                    {editContent.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[60vh] bg-transparent text-[#e6edf3] font-mono text-sm py-3 px-4 resize-none outline-none leading-[1.45rem]"
                    spellCheck={false}
                    data-testid="textarea-file-editor"
                  />
                </div>
              ) : (
                <div className="flex">
                  <div className="select-none text-right pr-3 pl-4 py-3 text-[#484f58] font-mono text-sm leading-[1.45rem] border-r border-[#21262d] bg-[#0d1117] flex-shrink-0" aria-hidden="true">
                    {(viewingFile.content || " ").split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre className="text-sm text-[#e6edf3] font-mono py-3 px-4 overflow-x-auto whitespace-pre leading-[1.45rem] flex-1" data-testid="pre-file-content">
                    {viewingFile.content || "(empty file)"}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-1.5 border-t border-[#30363d] bg-[#161b22] text-[10px] text-[#8b949e] font-mono">
              <div className="flex items-center gap-3">
                <span>{getLanguageLabel(viewingFile.name)}</span>
                <span>{isEditing ? editContent.split("\n").length : (viewingFile.content || "").split("\n").length} lines</span>
                <span>{formatBytes(isEditing ? new Blob([editContent]).size : (viewingFile.size || 0))}</span>
              </div>
              <span>{isEditing ? "Editing" : "Read-only"}</span>
            </div>
          </div>
        ) : (
          <>
            {isOwner && (
              <div className="mb-6 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CLI Commands</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Clone</p>
                    <CliCopyBlock command={`vpush ${username}/${project.name}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Push changes</p>
                    <CliCopyBlock command="vpush push" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Pull latest</p>
                    <CliCopyBlock command="vpush pull" />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <button
                onClick={() => setCurrentPath("/")}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors px-1"
                data-testid="breadcrumb-root"
              >
                <Home className="w-3.5 h-3.5" />
              </button>
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <button
                    onClick={() =>
                      setCurrentPath("/" + breadcrumbs.slice(0, i + 1).join("/"))
                    }
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    data-testid={`breadcrumb-${crumb}`}
                  >
                    {crumb}
                  </button>
                </div>
              ))}
            </div>

            {isOwner && (
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setShowNewFolder(true)}
                  data-testid="button-new-folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Folder</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setShowNewFile(true)}
                  data-testid="button-new-file"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">File</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upload</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      uploadMutation.mutate(e.target.files);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            )}
          </div>

          {filesLoading ? (
            <div className="p-4 space-y-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : fileList?.length === 0 ? (
            <div className="text-center py-16 px-4" data-testid="empty-files">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Folder className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">This folder is empty</p>
              {isOwner && (
                <p className="text-xs text-muted-foreground">
                  Create a file or upload to get started
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {currentPath !== "/" && (
                <button
                  onClick={goUp}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  data-testid="button-go-up"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">..</span>
                </button>
              )}
              {fileList?.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  data-testid={`file-row-${file.name}`}
                >
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() =>
                      file.isDirectory ? navigateToFolder(file) : handleViewFile(file)
                    }
                    data-testid={`button-open-${file.name}`}
                  >
                    {getFileIcon(file.name, file.isDirectory)}
                    <span className="text-sm truncate">{file.name}</span>
                  </button>
                  <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                    {file.isDirectory ? "--" : formatBytes(file.size || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 hidden md:block w-24 text-right">
                    {new Date(file.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-menu-${file.name}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {!file.isDirectory && (
                        <DropdownMenuItem onClick={() => handleViewFile(file)} className="gap-2" data-testid={`menu-view-${file.name}`}>
                          <Eye className="w-4 h-4" /> View
                        </DropdownMenuItem>
                      )}
                      {!file.isDirectory && (
                        <DropdownMenuItem asChild>
                          <a
                            href={`/api/projects/${projectId}/download/${file.id}`}
                            className="gap-2"
                            data-testid={`menu-download-${file.name}`}
                          >
                            <Download className="w-4 h-4" /> Download
                          </a>
                        </DropdownMenuItem>
                      )}
                      {!file.isDirectory && (
                        <DropdownMenuItem onClick={() => setShowVersions(file)} className="gap-2" data-testid={`menu-versions-${file.name}`}>
                          <History className="w-4 h-4" /> Version History
                        </DropdownMenuItem>
                      )}
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setShowRename(file);
                              setRenameValue(file.name);
                            }}
                            className="gap-2"
                            data-testid={`menu-rename-${file.name}`}
                          >
                            <Pencil className="w-4 h-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setShowDelete(file)}
                            className="gap-2 text-destructive"
                            data-testid={`menu-delete-${file.name}`}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </main>

      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Create a new folder in the current directory.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFolderMutation.mutate(newFolderName);
            }}
            className="space-y-4"
          >
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              required
              data-testid="input-new-folder-name"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
              <Button type="submit" disabled={createFolderMutation.isPending} data-testid="button-create-folder">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFile} onOpenChange={setShowNewFile}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
            <DialogDescription>Create a new empty file.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFileMutation.mutate(newFileName);
            }}
            className="space-y-4"
          >
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.txt"
              required
              data-testid="input-new-file-name"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowNewFile(false)}>Cancel</Button>
              <Button type="submit" disabled={createFileMutation.isPending} data-testid="button-create-file">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showRename} onOpenChange={() => setShowRename(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (showRename) renameMutation.mutate({ id: showRename.id, name: renameValue });
            }}
            className="space-y-4"
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              required
              data-testid="input-rename"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowRename(null)}>Cancel</Button>
              <Button type="submit" disabled={renameMutation.isPending} data-testid="button-confirm-rename">Rename</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {showDelete?.isDirectory ? "folder" : "file"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{showDelete?.name}"?
              {showDelete?.isDirectory && " This will delete all files inside this folder."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDelete && deleteMutation.mutate(showDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!showVersions} onOpenChange={() => setShowVersions(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {showVersions?.name} - previous versions
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto">
            {versions?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No previous versions</p>
            ) : (
              <div className="space-y-2">
                {versions?.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                    data-testid={`version-${v.version}`}
                  >
                    <div>
                      <p className="text-sm font-medium">Version {v.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString()} - {formatBytes(v.size || 0)}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          showVersions &&
                          restoreVersionMutation.mutate({
                            fileId: showVersions.id,
                            versionId: v.id,
                          })
                        }
                        data-testid={`button-restore-${v.version}`}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
