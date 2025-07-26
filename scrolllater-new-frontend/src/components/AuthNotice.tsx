import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Database, Calendar, Shield, Zap } from "lucide-react";

const AuthNotice = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-warning/10 rounded-full border border-warning/20">
            <Shield className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-warning">Backend Integration</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Ready for
            <span className="bg-gradient-primary bg-clip-text text-transparent"> full functionality</span>
          </h2>
          
          <p className="text-xl text-muted-foreground">
            To enable authentication, database storage, Google Calendar integration, and AI features, connect your project to Supabase using our native integration.
          </p>
        </div>

        {/* Alert */}
        <Alert className="mb-12 border-warning/20 bg-warning/5">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-base">
            <strong>Backend Features Required:</strong> ScrollLater needs authentication, database storage, and API integrations to function fully. Connect to Supabase to enable all features including Google Calendar sync, AI summarization, and user data storage.
          </AlertDescription>
        </Alert>

        {/* Features that need backend */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">User Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Secure Google OAuth sign-in to access your Google Calendar and save personal content
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Content Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Store saved links, AI summaries, tags, and scheduling preferences securely
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Calendar Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Two-way sync with Google Calendar for smart scheduling and availability detection
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">AI Processing</h3>
                <p className="text-sm text-muted-foreground">
                  OpenRouter API integration for content summarization and Canva document generation
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center space-y-6">
          <p className="text-muted-foreground">
            Click the green Supabase button in the top right to connect your project and unlock all ScrollLater features.
          </p>
          
          <div className="inline-flex items-center gap-4">
            <Button 
              variant="hero" 
              size="lg"
              onClick={() => window.open('https://docs.lovable.dev/integrations/supabase/', '_blank')}
            >
              <Database className="w-5 h-5" />
              View Supabase Integration Guide
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthNotice;