import { Header } from "@/components/header";
import { Link } from "wouter";
import { Terminal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-6" data-testid="button-back-home">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
        </Link>

        <h1
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          data-testid="text-terms-title"
        >
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using VPush ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            VPush is a file deployment and management platform that allows users to push, pull, and sync files between their VPS servers and hosted project storage. The Service includes a web platform and CLI tool.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You must create an account to use VPush. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Attempt to gain unauthorized access to other users' accounts or projects</li>
            <li>Use the Service to distribute copyrighted material without authorization</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Use automated tools to scrape or harvest data from the Service</li>
          </ul>

          <h2>5. User Content</h2>
          <p>
            You retain ownership of all files and content you upload to VPush. By using the Service, you grant VPush a limited license to store, process, and transmit your content solely for the purpose of providing the Service.
          </p>

          <h2>6. Privacy</h2>
          <p>
            We collect and process personal data as necessary to provide the Service. This includes your username, email address, and usage data. We do not sell your personal data to third parties. Files stored in private projects are only accessible to you and users you authorize via Auth PIN.
          </p>

          <h2>7. Service Availability</h2>
          <p>
            VPush is currently in beta. We strive to maintain high availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue the Service at any time with reasonable notice.
          </p>

          <h2>8. Data Retention</h2>
          <p>
            Your files and project data are retained as long as your account is active. If you delete a project or your account, associated data will be permanently removed within 30 days.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            VPush is provided "as is" without warranties of any kind. We are not liable for any data loss, service interruptions, or damages arising from your use of the Service. You are responsible for maintaining your own backups.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We may update these Terms of Service from time to time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the updated terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            For questions about these Terms, please visit our <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
