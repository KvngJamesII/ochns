import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Terminal, Download, Copy, Check } from "lucide-react";
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
            CLI v2.0.0
          </Badge>
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-cli-title"
          >
            VPush CLI
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            The easiest way to move files between your computer and your VPush projects. No accounts or tokens needed on your server — just one command.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Install
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-base text-muted-foreground mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">Option 1:</span> Install with npm (if you have Node.js)
              </p>
              <CopyBlock text="npm install -g vpush-cli" label="npm" />
            </div>
            <div>
              <p className="text-base text-muted-foreground mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">Option 2:</span> Download the file directly
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
            How It Works
          </h2>
          <p className="text-base text-muted-foreground mb-6">
            VPush CLI lets you download and upload your project files from the terminal. Here's all you need to do:
          </p>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-medium">Clone your project</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Open a terminal on your server (or any computer) and run this command. Replace <code className="px-1 py-0.5 rounded bg-muted font-mono">username</code> and <code className="px-1 py-0.5 rounded bg-muted font-mono">project</code> with your actual username and project name from VPush.
              </p>
              <CopyBlock text="vpush username/project" label="clone" />
              <p className="text-sm text-muted-foreground mt-2">
                This downloads all your project files into a new folder. If the project is private, you'll be asked for your 4-digit PIN (you can find it on your project's settings page).
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h3 className="font-medium">Push your changes</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                After you edit files on your server, push them back to VPush so you can see them on the website:
              </p>
              <CopyBlock text="vpush push" label="push" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="font-medium">Pull latest files</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                If you edited files on the VPush website and want to get those changes on your server:
              </p>
              <CopyBlock text="vpush pull" label="pull" />
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <h3 className="text-base font-semibold mb-2">That's it!</h3>
              <p className="text-sm text-muted-foreground">
                No accounts, no tokens, no complicated setup. Just clone once, then push and pull whenever you need. The CLI remembers your project so you don't have to type the name again.
              </p>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">What it does</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["vpush username/project", "Downloads a project to your computer (clone)"],
                  ["vpush push", "Uploads your local files to VPush"],
                  ["vpush pull", "Downloads the latest files from VPush"],
                  ["vpush status", "Shows which project you're connected to"],
                  ["vpush server <url>", "Points the CLI to a different VPush server"],
                  ["vpush help", "Shows all available commands"],
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
            Ignoring Files
          </h2>
          <p className="text-base text-muted-foreground mb-3">
            Want to skip certain files when pushing? Create a file called <code className="px-1 py-0.5 rounded bg-muted font-mono">.vpushignore</code> in your project folder and list the files or folders you want to skip — one per line.
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
            Don't Have npm?
          </h2>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <p className="text-base text-muted-foreground">
              You can run the CLI directly with Node.js — no npm install needed:
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Install <a href="https://nodejs.org" className="text-primary hover:underline" target="_blank" rel="noopener">Node.js</a> (v16 or higher)</li>
              <li>Download <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">index.js</code> from above</li>
              <li>Run commands like: <code className="px-1 py-0.5 rounded bg-muted font-mono text-foreground">node index.js username/project</code></li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
