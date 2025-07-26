import { Calendar, Brain, Github, Twitter, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">ScrollLater</span>
            </div>
            <p className="text-background/70 leading-relaxed">
              AI-powered productivity tool that transforms content consumption into scheduled learning sessions.
            </p>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-background hover:text-primary">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-background hover:text-primary">
                <Github className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-background hover:text-primary">
                <Mail className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Product</h3>
            <ul className="space-y-2 text-background/70">
              <li><a href="#features" className="hover:text-background transition-smooth">Features</a></li>
              <li><a href="#dashboard" className="hover:text-background transition-smooth">Dashboard</a></li>
              <li><a href="#pricing" className="hover:text-background transition-smooth">Pricing</a></li>
              <li><a href="#api" className="hover:text-background transition-smooth">API</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Company</h3>
            <ul className="space-y-2 text-background/70">
              <li><a href="#about" className="hover:text-background transition-smooth">About</a></li>
              <li><a href="#blog" className="hover:text-background transition-smooth">Blog</a></li>
              <li><a href="#careers" className="hover:text-background transition-smooth">Careers</a></li>
              <li><a href="#contact" className="hover:text-background transition-smooth">Contact</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Support</h3>
            <ul className="space-y-2 text-background/70">
              <li><a href="#help" className="hover:text-background transition-smooth">Help Center</a></li>
              <li><a href="#docs" className="hover:text-background transition-smooth">Documentation</a></li>
              <li><a href="#community" className="hover:text-background transition-smooth">Community</a></li>
              <li><a href="#status" className="hover:text-background transition-smooth">Status</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-8 border-t border-background/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-background/70 text-sm">
            © 2024 ScrollLater. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-background/70">
            <a href="#privacy" className="hover:text-background transition-smooth">Privacy Policy</a>
            <a href="#terms" className="hover:text-background transition-smooth">Terms of Service</a>
            <a href="#cookies" className="hover:text-background transition-smooth">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;