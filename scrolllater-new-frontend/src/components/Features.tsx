import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Calendar, 
  FileText, 
  Clock, 
  Zap, 
  Sparkles,
  Smartphone,
  Globe,
  Presentation
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Smart Link Saver",
      description: "Save any link or note from mobile or desktop. Use share sheet or browser extension to send content instantly.",
      highlight: "Mobile-First"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Summarizer",
      description: "Automatically generates TL;DR summaries, categorizes content, and extracts estimated read/view time.",
      highlight: "AI Summary"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Auto Scheduler",
      description: "Schedules saved links into Google Calendar based on your availability and optimal learning patterns.",
      highlight: "Smart Timing"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "AI Suggestions",
      description: "Suggests optimal reading times, bundles similar content into sessions, and adapts to your habits.",
      highlight: "Personalized"
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Dashboard Control",
      description: "View, organize, and manage all your saved content with drag-to-reschedule functionality.",
      highlight: "Full Control"
    },
    {
      icon: <Presentation className="w-8 h-8" />,
      title: "Auto Canva Docs",
      description: "Generate presentation-style documents for meeting-related content using AI and Canva integration.",
      highlight: "Meeting Ready"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Core Features</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Everything you need to
            <span className="bg-gradient-primary bg-clip-text text-transparent"> master content consumption</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            ScrollLater combines the best of read-it-later apps, task managers, and calendar assistants into one intelligent productivity tool.
          </p>
        </div>
        
        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 border-border hover:shadow-medium transition-smooth group">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-gradient-soft rounded-xl text-primary group-hover:scale-110 transition-bounce">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-smooth">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* CTA */}
        <div className="text-center mt-16">
          <Button variant="ai" size="lg" className="text-lg">
            <Calendar className="w-5 h-5" />
            Try ScrollLater Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Features;