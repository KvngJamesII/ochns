import { useState } from "react";
import { Header } from "@/components/header";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, Terminal, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Message received", description: "We'll get back to you soon." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
        </Link>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          <div className="lg:col-span-2">
            <h1
              className="text-3xl font-bold tracking-tight mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-contact-title"
            >
              Get in touch
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Have a question, feature request, or bug report? We'd love to hear from you. Our team typically responds within 24 hours.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">Email</h3>
                  <p className="text-sm text-muted-foreground">support@vpush.tech</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">Community</h3>
                  <p className="text-sm text-muted-foreground">Join our Discord community for real-time help and discussions.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Terminal className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5">Bug Reports</h3>
                  <p className="text-sm text-muted-foreground">Found a bug? Use the form or reach out directly at bugs@vpush.tech</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {submitted ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }} data-testid="text-contact-success">
                  Message sent
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Thanks for reaching out. We'll get back to you at {email} as soon as possible.
                </p>
                <Button variant="outline" onClick={() => { setSubmitted(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-5" data-testid="form-contact">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-sm font-medium">Name</Label>
                    <Input
                      id="contact-name"
                      data-testid="input-contact-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="contact-email"
                      data-testid="input-contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger data-testid="select-contact-subject">
                      <SelectValue placeholder="What's this about?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Question</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="enterprise">Enterprise Inquiry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-message" className="text-sm font-medium">Message</Label>
                  <Textarea
                    id="contact-message"
                    data-testid="input-contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    rows={5}
                    required
                  />
                </div>

                <Button type="submit" className="w-full sm:w-auto gap-2" data-testid="button-send-message">
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
