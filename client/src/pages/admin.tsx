import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderOpen,
  FileText,
  MessageSquare,
  Megaphone,
  BarChart3,
  Trash2,
  Eye,
  Mail,
  Plus,
  Loader2,
  Shield,
  CheckCircle2,
  Circle,
  Bell,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AdminTab = "overview" | "users" | "contacts" | "announcements" | "notifications";

interface AdminStats {
  users: number;
  projects: number;
  files: number;
  contacts: number;
  unreadContacts: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName: string | null;
  createdAt: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent || "bg-primary/10"}`}>
          <Icon className={`w-4 h-4 ${accent ? "text-white" : "text-primary"}`} />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: AdminStats | undefined }) {
  if (!stats) return null;
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users} />
        <StatCard icon={FolderOpen} label="Total Projects" value={stats.projects} />
        <StatCard icon={FileText} label="Total Files" value={stats.files} />
        <StatCard icon={MessageSquare} label="Unread Messages" value={stats.unreadContacts} accent="bg-orange-500" />
      </div>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Users</h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-border/50 last:border-0" data-testid={`row-user-${u.id}`}>
                  <td className="px-4 py-3 font-medium font-mono text-sm">{u.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" || u.username === "idledev" ? (
                      <Badge variant="default" className="text-xs"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">User</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ContactsTab() {
  const { data: messages, isLoading } = useQuery<ContactMessage[]>({ queryKey: ["/api/admin/contacts"] });
  const { toast } = useToast();

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/admin/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Contact deleted" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Contact Messages</h2>
      {!messages?.length ? (
        <div className="text-center py-12 text-muted-foreground">No messages yet</div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl border p-5 ${msg.read ? "border-border bg-card" : "border-primary/30 bg-primary/[0.02]"}`}
              data-testid={`contact-${msg.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.read ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-primary flex-shrink-0 fill-primary" />
                    )}
                    <span className="font-medium text-sm">{msg.name}</span>
                    <span className="text-xs text-muted-foreground">&lt;{msg.email}&gt;</span>
                    {msg.subject && (
                      <Badge variant="secondary" className="text-[10px]">{msg.subject}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground ml-5.5 leading-relaxed">{msg.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2 ml-5.5">{new Date(msg.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!msg.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => markReadMutation.mutate(msg.id)}
                      disabled={markReadMutation.isPending}
                      data-testid={`button-mark-read-${msg.id}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(msg.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-contact-${msg.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { data: items, isLoading } = useQuery<Announcement[]>({ queryKey: ["/api/admin/announcements"] });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/announcements", { title, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setTitle("");
      setContent("");
      toast({ title: "Announcement published" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement deleted" });
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Announcements</h2>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h3 className="text-sm font-medium mb-3">New Announcement</h3>
        <div className="space-y-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="input-announcement-title"
          />
          <Textarea
            placeholder="Content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            data-testid="input-announcement-content"
          />
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
            className="gap-2"
            data-testid="button-publish-announcement"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Publish
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !items?.length ? (
        <div className="text-center py-12 text-muted-foreground">No announcements yet</div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5" data-testid={`announcement-${a.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Megaphone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <h4 className="font-medium text-sm">{a.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground ml-5.5 leading-relaxed">{a.content}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2 ml-5.5">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => deleteMutation.mutate(a.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-announcement-${a.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsTab() {
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const { data: users } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });
  const { toast } = useToast();

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/notifications", {
        title: notifTitle,
        message: notifMessage,
        ...(targetUserId ? { userId: targetUserId } : {}),
      });
    },
    onSuccess: () => {
      setNotifTitle("");
      setNotifMessage("");
      setTargetUserId("");
      toast({ title: "Notification sent" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't send notification", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Send Notification</h2>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              data-testid="select-notif-target"
            >
              <option value="">All Users</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Notification title"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              data-testid="input-notif-title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Notification message..."
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              rows={3}
              data-testid="input-notif-message"
            />
          </div>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!notifTitle.trim() || !notifMessage.trim() || sendMutation.isPending}
            className="gap-2"
            data-testid="button-send-notification"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Notification
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<AdminTab>("overview");

  const isAdmin = user?.role === "admin";

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    window.location.href = "/dashboard";
    return null;
  }

  const tabs: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "contacts", label: "Contacts", icon: MessageSquare, badge: stats?.unreadContacts },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-admin-title">
              Admin Panel
            </h1>
            <p className="text-xs text-muted-foreground">Manage your VPush platform</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="lg:w-56 flex-shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  data-testid={`tab-${t.id}`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  {t.badge !== undefined && t.badge > 0 && (
                    <span className={`ml-auto text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                      tab === t.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-orange-500 text-white"
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            {tab === "overview" && <OverviewTab stats={stats} />}
            {tab === "users" && <UsersTab />}
            {tab === "contacts" && <ContactsTab />}
            {tab === "announcements" && <AnnouncementsTab />}
            {tab === "notifications" && <NotificationsTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
