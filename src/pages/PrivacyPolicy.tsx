import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="space-y-4 text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              Legal & Data Protection
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              Privacy Policy
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Last Updated: 3 November 2026 | Effective Date: 3 November 2026
            </p>
          </div>

          <Card className="border-border/60 shadow-md">
            <CardContent className="p-6 md:p-10 space-y-8 text-sm md:text-base text-muted-foreground leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  1. Information We Collect
                </h2>
                <p>
                  The Prep Ville ("we", "us", or "our") is an independent educational assessment platform operated by AdSavvy LLP.
                  We collect information necessary to provide educational practice, mock examinations, and progress tracking:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  <li><strong>Account Information:</strong> Name, email address, educational programme (IB MYP), and password hash.</li>
                  <li><strong>Assessment Data:</strong> Student answers, mathematical equation inputs, time spent per question, practice session progress, and evaluation rubrics.</li>
                  <li><strong>Technical Data:</strong> Browser user agent, IP address for authentication session security, and basic telemetry required to operate the application.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  2. How We Protect Your Data
                </h2>
                <p>
                  Security and privacy are core engineering commitments of PrepVille:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  <li>We implement PostgreSQL Row-Level Security (RLS) to ensure that student answers, practice progress, and user records are isolated and accessible only by the verified student account.</li>
                  <li>All communications are encrypted in transit using industry-standard TLS 1.3 encryption.</li>
                  <li>Private question answer keys and solution rubrics are strictly isolated in protected database tables and cannot be viewed prior to verified question submission.</li>
                  <li>We never sell, rent, or monetize student personal data or practice records to third-party advertisers.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  3. Use of Information
                </h2>
                <p>
                  We use collected information solely to:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  <li>Deliver interactive mathematics practice questions and mock examinations.</li>
                  <li>Provide real-time step-by-step scoring, feedback, and performance analytics.</li>
                  <li>Maintain platform security, authenticate legitimate users, and prevent unauthorized access.</li>
                  <li>Communicate essential account notifications, security alerts, and system updates.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  4. Your Rights and Contact Information
                </h2>
                <p>
                  You have the right to request access to, rectification of, or deletion of your personal account data at any time.
                  For privacy inquiries, data deletion requests, or questions regarding this policy, please contact our data protection team:
                </p>
                <div className="p-4 rounded-lg bg-slate-50 border border-border/80 text-foreground font-mono text-xs md:text-sm">
                  Email: support@theprepville.com<br />
                  Company: AdSavvy LLP<br />
                  Subject: Data Privacy Request
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
