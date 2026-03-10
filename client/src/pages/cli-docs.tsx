import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, Download, Copy, Check, ArrowRight } from "lucide-react";
import { SiApple, SiLinux } from "react-icons/si";
import { useState } from "react";

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-lg border border-border bg-[#0d1117] text-white font-mono text-sm overflow-hidden" data-testid={`copyblock-${label || "code"}`}>
      {label && (
        <div className="px-4 py-2 border-b border-white/10 text-xs text-white/40">{label}</div>
      )}
      <div className="flex items-center justify-between px-4 py-3">
        <code className="text-green-400">$ {text}</code>
        <button
          onClick={handleCopy}
          className="ml-3 p-1.5 rounded hover:bg-white/10 transition-colors"
          data-testid={`button-copy-${label || "code"}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/40" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function CliDocs() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-12">
          <Badge variant="secondary" className="mb-4" data-testid="badge-cli-version">
            <Terminal className="w-3 h-3 mr-1" />
            CLI v1.0.0
          </Badge>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-cli-title"
          >
            Install VPush CLI
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            The command-line tool for deploying files to your VPS servers. Works on Windows, macOS, and Linux.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Quick Install
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">Option 1:</span> Install via npm (requires Node.js)
              </p>
              <CopyBlock text="npm install -g vpush-cli" label="npm" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">Option 2:</span> Download directly
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <a href="/cli/index.js" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors" data-testid="link-download-windows">
                  <Terminal className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium">Windows</div>
                    <div className="text-xs text-muted-foreground">vpush.js</div>
                  </div>
                  <Download className="w-4 h-4 ml-auto text-muted-foreground" />
                </a>
                <a href="/cli/index.js" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors" data-testid="link-download-macos">
                  <SiApple className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-medium">macOS</div>
                    <div className="text-xs text-muted-foreground">vpush.js</div>
                  </div>
                  <Download className="w-4 h-4 ml-auto text-muted-foreground" />
                </a>
                <a href="/cli/index.js" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors" data-testid="link-download-linux">
                  <SiLinux className="w-5 h-5" />
                  <div>
                    <div className="text-sm font-medium">Linux</div>
                    <div className="text-xs text-muted-foreground">vpush.js</div>
                  </div>
                  <Download className="w-4 h-4 ml-auto text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Getting Started
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-medium">Set your server URL</h3>
              </div>
              <CopyBlock text="vpush server https://your-vpush-server.com" label="set-server" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="font-medium">Set your API token</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Generate a token from your <a href="/settings" className="text-primary hover:underline">Settings page</a>, then paste it here.
              </p>
              <CopyBlock text="vpush token YOUR_TOKEN_HERE" label="token" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="font-medium">Initialize a project</h3>
              </div>
              <CopyBlock text="vpush init" label="init" />
              <p className="text-xs text-muted-foreground mt-2">
                This creates a <code className="px-1 py-0.5 rounded bg-muted font-mono">.vpush.json</code> config file in your project directory.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">4</span>
                <h3 className="font-medium">Push or pull your files</h3>
              </div>
              <CopyBlock text="vpush push" label="push" />
              <p className="text-xs text-muted-foreground mt-2">
                Use <code className="px-1 py-0.5 rounded bg-muted font-mono">vpush pull</code> to download files from the server instead.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2">Alternative: Interactive login</h3>
              <p className="text-xs text-muted-foreground mb-3">
                If you prefer, you can sign in interactively instead of using a token. This will prompt for your username and password and generate a token automatically.
              </p>
              <CopyBlock text="vpush login" label="login-alt" />
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            All Commands
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Command</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["vpush server <url>", "Set or show server URL"],
                  ["vpush token <token>", "Set an API token for authentication"],
                  ["vpush init", "Initialize project in current directory"],
                  ["vpush push", "Push local files to server"],
                  ["vpush pull", "Pull files from server to local"],
                  ["vpush status", "Show connection and project status"],
                  ["vpush whoami", "Show current signed-in user"],
                  ["vpush login", "Interactive sign-in (alternative to token)"],
                  ["vpush logout", "Sign out and remove stored token"],
                ].map(([cmd, desc]) => (
                  <tr key={cmd} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-sm text-primary">{cmd}</td>
                    <td className="px-4 py-3 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            .vpushignore
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Create a <code className="px-1 py-0.5 rounded bg-muted font-mono">.vpushignore</code> file to exclude files from pushing. Works like <code className="px-1 py-0.5 rounded bg-muted font-mono">.gitignore</code>.
          </p>
          <div className="rounded-lg border border-border bg-[#0d1117] text-white font-mono text-sm p-4">
            <div className="text-white/40 mb-2"># .vpushignore</div>
            <div>node_modules</div>
            <div>.git</div>
            <div>.env</div>
            <div>dist</div>
            <div>*.pyc</div>
            <div>__pycache__</div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Manual Install (No npm)
          </h2>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              If you don't have npm, you can run the CLI directly with Node.js:
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Install <a href="https://nodejs.org" className="text-primary hover:underline" target="_blank" rel="noopener">Node.js</a> (v16 or higher)</li>
              <li>Download <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">index.js</code> from the CLI package</li>
              <li>Run with: <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">node index.js &lt;command&gt;</code></li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
