import { Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  ArrowRight,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function TerminalDemo() {
  return (
    <div className="w-full max-w-2xl mx-auto" data-testid="terminal-demo">
      <div className="rounded-xl border border-border/60 bg-[#0d1117] overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-xs text-white/40 font-mono ml-2">terminal</span>
        </div>
        <div className="p-5 font-mono text-sm leading-relaxed">
          <div className="flex items-center gap-2 text-[#8b949e]">
            <span className="text-[#58a6ff]">~</span>
            <span className="text-[#f0f6fc]">$</span>
            <span className="text-[#79c0ff]">vpush</span>
            <span className="text-[#f0f6fc]">samuel/my-api</span>
          </div>
          <div className="text-[#8b949e] mt-1.5 ml-4">Cloning samuel/my-api...</div>
          <div className="text-[#f0f6fc] ml-4">Downloaded 12 files (2.4 MB)</div>
          <div className="text-[#3fb950] ml-4 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Cloned into ./my-api
          </div>

          <div className="flex items-center gap-2 text-[#8b949e] mt-4">
            <span className="text-[#58a6ff]">~/my-api</span>
            <span className="text-[#f0f6fc]">$</span>
            <span className="text-[#79c0ff]">vpush</span>
            <span className="text-[#f0f6fc]">push</span>
          </div>
          <div className="text-[#8b949e] mt-1.5 ml-4">Scanning files...</div>
          <div className="text-[#f0f6fc] ml-4">Uploading 3 changed files</div>
          <div className="text-[#3fb950] ml-4 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Push complete in 0.8s
          </div>

          <div className="flex items-center gap-2 text-[#8b949e] mt-4">
            <span className="text-[#58a6ff]">~/my-api</span>
            <span className="text-[#f0f6fc]">$</span>
            <span className="text-[#79c0ff]">vpush</span>
            <span className="text-[#f0f6fc]">pull</span>
          </div>
          <div className="text-[#8b949e] mt-1.5 ml-4">Fetching changes...</div>
          <div className="text-[#f0f6fc] ml-4">3 files updated, 1 new file</div>
          <div className="text-[#3fb950] ml-4 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Pull complete
          </div>

          <div className="flex items-center gap-2 text-[#8b949e] mt-4">
            <span className="text-[#58a6ff]">~/my-api</span>
            <span className="text-[#f0f6fc]">$</span>
            <span className="animate-pulse text-[#f0f6fc]">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? "/dashboard" : "/auth?mode=register";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm" data-testid="badge-beta">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-medium text-primary tracking-wide">Beta — Free for early adopters</span>
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-hero-title"
            >
              Deploy files to your VPS
              <br />
              <span className="text-primary">with a single command</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
              data-testid="text-hero-description"
            >
              Push, pull, and manage your files from the terminal.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link href={ctaHref}>
                <Button size="lg" className="px-6 gap-2 text-sm font-medium" data-testid="button-get-started">
                  Start Deploying
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="px-6 gap-2 text-sm" data-testid="button-view-cli">
                  <Terminal className="w-4 h-4" />
                  See How It Works
                </Button>
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-16 sm:mt-20"
          >
            <TerminalDemo />
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-16">
            <p className="text-sm font-medium text-primary tracking-wider uppercase mb-3" data-testid="text-section-label">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Three steps. Zero complexity.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden border border-border/50">
            {[
              {
                step: "01",
                title: "Create a project",
                desc: "Sign up and create a project on VPush. That's it — no tokens or API keys needed.",
                code: "$ vpush samuel/my-api",
              },
              {
                step: "02",
                title: "Push your files",
                desc: "Edit files on your server, then run vpush push. Your changes sync to VPush instantly.",
                code: "$ vpush push",
              },
              {
                step: "03",
                title: "Pull anywhere",
                desc: "On another server? Run vpush pull and get all your files. Edit in the browser. Roll back anytime.",
                code: "$ vpush pull",
              },
            ].map((item) => (
              <div key={item.step} className="bg-card p-8 sm:p-10" data-testid={`step-${item.step}`}>
                <div className="text-4xl font-bold text-primary/15 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{item.desc}</p>
                <code className="inline-block text-xs font-mono bg-muted/80 text-muted-foreground px-3 py-1.5 rounded-md">
                  {item.code}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <div>
              <p className="text-sm font-medium text-primary tracking-wider uppercase mb-3">For your VPS</p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Simple file deployment for any server
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Not everyone uses Vercel or Netlify. If you deploy to DigitalOcean droplets, Hetzner boxes, or any Linux server, VPush gives you the deployment workflow you've been missing.
              </p>

              <div className="space-y-6">
                {[
                  {
                    title: "Smart file syncing",
                    desc: "Only transfers files that actually changed. No redundant uploads, no wasted bandwidth.",
                  },
                  {
                    title: "In-browser editor",
                    desc: "Fix a config file or update a script without opening an SSH session. Edit, save, pull.",
                  },
                  {
                    title: "Version snapshots",
                    desc: "Every save creates a snapshot. Broke something? Roll back to any previous version instantly.",
                  },
                  {
                    title: "Access control",
                    desc: "Public projects for open source. Private projects locked behind an Auth PIN for your team.",
                  },
                ].map((item) => (
                  <div key={item.title} className="group" data-testid={`feature-${item.title.toLowerCase().replace(/\s/g, "-")}`}>
                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary" />
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-3">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-card p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Web Interface</span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-primary">&#128193;</span>
                    <span>src/</span>
                    <span className="ml-auto text-muted-foreground">--</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-primary">&#128193;</span>
                    <span>config/</span>
                    <span className="ml-auto text-muted-foreground">--</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                    <span className="text-orange-400">&#128196;</span>
                    <span>server.ts</span>
                    <span className="ml-auto text-muted-foreground">4.2 KB</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                    <span className="text-orange-400">&#128196;</span>
                    <span>package.json</span>
                    <span className="ml-auto text-muted-foreground">1.1 KB</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                    <span className="text-muted-foreground">&#128196;</span>
                    <span>.env</span>
                    <span className="ml-auto text-muted-foreground">256 B</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                    <span className="text-muted-foreground">&#128196;</span>
                    <span>README.md</span>
                    <span className="ml-auto text-muted-foreground">892 B</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-[#0d1117] p-5 font-mono text-xs leading-relaxed">
                <div className="text-[#8b949e]"># Same project, from your VPS</div>
                <div className="mt-2">
                  <span className="text-[#f0f6fc]">$ </span>
                  <span className="text-[#79c0ff]">vpush</span>
                  <span className="text-[#f0f6fc]"> status</span>
                </div>
                <div className="text-[#f0f6fc] mt-1 ml-2">Connected to samuel/my-api</div>
                <div className="mt-2">
                  <span className="text-[#f0f6fc]">$ </span>
                  <span className="text-[#79c0ff]">vpush</span>
                  <span className="text-[#f0f6fc]"> push</span>
                </div>
                <div className="text-[#3fb950] mt-1 ml-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Push complete
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cli" className="py-24 sm:py-32 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-16">
            <p className="text-sm font-medium text-primary tracking-wider uppercase mb-3">CLI Reference</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-cli-title">
              Four commands. That's the whole API.
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Clone a project, push, pull. No tokens, no branches, no merge conflicts.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { cmd: "vpush user/project", desc: "Clone a project to your server. Downloads all files into a new folder. Enter your PIN if it's private.", example: "$ vpush samuel/my-api\nCloned into ./my-api" },
              { cmd: "vpush push", desc: "Upload all changed files from your local directory to VPush.", example: "$ vpush push\nUploading 5 files... Done." },
              { cmd: "vpush pull", desc: "Download the latest files from VPush. Only pulls what changed.", example: "$ vpush pull\n3 files updated." },
              { cmd: "vpush status", desc: "Shows which project you're connected to and the server URL.", example: "$ vpush status\nConnected to samuel/my-api" },
            ].map((item) => (
              <div key={item.cmd} className="rounded-xl border border-border bg-card p-5 hover:border-border transition-colors" data-testid={`cli-${item.cmd.replace(/\s/g, "-")}`}>
                <code className="text-sm font-mono font-semibold text-primary">{item.cmd}</code>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
                <pre className="text-[11px] font-mono text-muted-foreground/70 mt-3 bg-muted/40 rounded-md px-3 py-2 whitespace-pre-wrap">
                  {item.example}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-cta-title">
            Ready to simplify your deployments?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Free during beta. No credit card. Create your first project in under a minute.
          </p>
          <Link href={ctaHref}>
            <Button size="lg" className="px-8 gap-2 text-sm font-medium" data-testid="button-final-cta">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Terminal className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>VPush</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The simplest way to deploy files to your VPS.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Product</h4>
              <div className="space-y-2">
                <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-how">How It Works</a>
                <a href="#cli" className="block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-cli">CLI Reference</a>
                <Link href={ctaHref} className="block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-signup">Sign Up</Link>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Company</h4>
              <div className="space-y-2">
                <Link href="/contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-contact">Contact Us</Link>
                <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms of Service</Link>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Developers</h4>
              <div className="space-y-2">
                <a href="#cli" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">CLI Docs</a>
                <Link href={ctaHref} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Get Started</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              VPush. Deploy files to any server, effortlessly.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
