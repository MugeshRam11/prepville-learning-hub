import React from 'react';
import { BookOpen, Mail, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/adsavvy-logo.svg';
const Footer = () => {
  return <footer className="bg-gray-50 border-t">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src={logo} 
                alt="Adsavvy" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground mb-4 max-w-md">
              Comprehensive EdTech platform designed for MYP and IBDP students. 
              Master your subjects with interactive quizzes, video explanations, and detailed analytics.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-4 h-4 mr-2" />
                contact@studyhub.com
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li><Link to="/subjects" className="text-sm text-muted-foreground hover:text-foreground">Subjects</Link></li>
              <li><Link to="/practice" className="text-sm text-muted-foreground hover:text-foreground">Practice Tests</Link></li>
              <li><Link to="/videos" className="text-sm text-muted-foreground hover:text-foreground">Video Library</Link></li>
              <li><Link to="/analytics" className="text-sm text-muted-foreground hover:text-foreground">Analytics</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link></li>
              <li><Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link></li>
              <li><Link to="/help" className="text-sm text-muted-foreground hover:text-foreground">Help Center</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Study Hub. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;