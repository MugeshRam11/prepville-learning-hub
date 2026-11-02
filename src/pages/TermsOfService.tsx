import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Scale, AlertTriangle, BookCheck, ShieldCheck } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="space-y-4 text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <Scale className="w-3.5 h-3.5" />
              Terms of Use
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Last Updated: 3 November 2026 | Effective Date: 3 November 2026
            </p>
          </div>

          <Card className="border-border/60 shadow-md">
            <CardContent className="p-6 md:p-10 space-y-8 text-sm md:text-base text-muted-foreground leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BookCheck className="w-5 h-5 text-primary" />
                  1. Agreement to Terms
                </h2>
                <p>
                  By accessing or using The Prep Ville ("the Service"), operated by AdSavvy LLP ("the Company"),
                  you agree to be bound by these Terms of Service. If you do not agree to these terms,
                  you must discontinue access immediately.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  2. Independent Educational Platform & Non-Affiliation Disclaimer
                </h2>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200">
                  <p className="font-semibold text-sm">
                    Mandatory Non-Affiliation Disclosure:
                  </p>
                  <p className="text-xs md:text-sm mt-1">
                    The Prep Ville is an independent educational learning hub created by AdSavvy LLP.
                    The Prep Ville is not affiliated with, endorsed by, sponsored by, or in any way associated
                    with the International Baccalaureate Organization (IBO). "International Baccalaureate",
                    "IB", and "MYP" are registered trademarks of the International Baccalaureate Organization.
                    All curriculum references are used solely for descriptive educational purposes under nominative fair use.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  3. Permitted Use & Academic Integrity
                </h2>
                <p>
                  The Service provides mathematics practice questions, formula input tools, and mock examinations:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  <li>You agree to use the platform for legitimate educational study and practice only.</li>
                  <li>You must not reverse engineer, scrape, extract, or attempt to bypass security controls to access private question answer keys or solution databases.</li>
                  <li>Accounts are individual and non-transferable. You are responsible for safeguarding your login credentials.</li>
                  <li>Any intentional attempt to disrupt system availability, submit malicious payloads, or access unauthorized administrative functions will result in immediate termination of access.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  4. Scope of Launch & Service Availability
                </h2>
                <p>
                  PrepVille currently offers official educational content exclusively for the International Baccalaureate (IB)
                  Middle Years Programme (MYP) — Mathematics. Future subjects, including IBDP programmes and sciences,
                  are in development and will become available in subsequent releases.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-foreground">
                  5. Contact Information
                </h2>
                <p>
                  For questions regarding these Terms of Service or to report violations, please reach out to:
                </p>
                <div className="p-4 rounded-lg bg-slate-50 border border-border/80 text-foreground font-mono text-xs md:text-sm">
                  Support: support@theprepville.com<br />
                  Company: AdSavvy LLP<br />
                  Location: PrepVille Engineering Operations
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

export default TermsOfService;
