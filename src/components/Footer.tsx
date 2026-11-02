import React from 'react';
import { Mail, Shield, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/adsavvy-logo.svg';

const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t border-border/80">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src={logo} 
                alt="The Prep Ville" 
                className="h-24 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground mb-4 max-w-md text-sm leading-relaxed">
              Specialized mathematics assessment and practice platform for the International Baccalaureate (IB)
              Middle Years Programme (MYP). Precision mathematical equations, verified rubrics, and structured examination workflows.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="mailto:support@theprepville.com"
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-4 h-4 mr-2 text-indigo-600" />
                support@theprepville.com
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground mb-4">Platform</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/command-terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  IB MYP Command Terms
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Membership Plans
                </Link>
              </li>
              <li>
                <Link to="/student/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground mb-4">Legal & Support</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@theprepville.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Non-Affiliation Disclaimer */}
        <div className="border-t border-border/80 pt-6 mt-8">
          <p className="text-xs text-muted-foreground/90 leading-relaxed text-center md:text-left">
            <strong>Disclaimer:</strong> The Prep Ville is an independent educational platform operated by AdSavvy LLP.
            The Prep Ville is not affiliated with, endorsed by, or in any way associated with the International Baccalaureate Organization (IBO).
            IB and MYP are registered trademarks of the International Baccalaureate Organization.
          </p>
        </div>

        {/* Copyright & Secondary Links */}
        <div className="border-t border-border/40 pt-4 mt-4 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground">
          <p>© 2026 The Prep Ville. AdSavvy LLP. All rights reserved.</p>
          <div className="flex space-x-6 mt-2 md:mt-0">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
