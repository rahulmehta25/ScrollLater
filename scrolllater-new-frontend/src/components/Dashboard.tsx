import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  Brain, 
  Tag,
  MoreHorizontal,
  FileText,
  Video,
  Code,
  BookOpen
} from "lucide-react";

const Dashboard = () => {
  // Mock data for saved content
  const savedContent = [
    {
      id: 1,
      title: "The Future of AI in Web Development",
      url: "medium.com/ai-development",
      summary: "Explores how AI tools are transforming web development workflows, from code generation to design automation.",
      readTime: "8 min read",
      category: "article",
      tags: ["AI", "Web Dev", "Future Tech"],
      scheduledFor: "Today, 2:30 PM",
      priority: "high",
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 2,
      title: "React Server Components Deep Dive",
      url: "youtube.com/watch?v=xyz",
      summary: "Technical deep dive into React Server Components, explaining the architecture and implementation details.",
      readTime: "25 min watch",
      category: "video",
      tags: ["React", "Server Components"],
      scheduledFor: "Tomorrow, 9:00 AM",
      priority: "medium",
      icon: <Video className="w-4 h-4" />
    },
    {
      id: 3,
      title: "Advanced TypeScript Patterns",
      url: "dev.to/typescript-patterns",
      summary: "Learn advanced TypeScript patterns for better type safety and developer experience in large applications.",
      readTime: "12 min read",
      category: "docs",
      tags: ["TypeScript", "Patterns", "Advanced"],
      scheduledFor: "Friday, 10:30 AM",
      priority: "low",
      icon: <Code className="w-4 h-4" />
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <section id="dashboard" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Dashboard Preview</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Your content,
            <span className="bg-gradient-primary bg-clip-text text-transparent"> intelligently organized</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how ScrollLater transforms your saved links into a beautifully organized, AI-enhanced dashboard with smart scheduling.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">24</div>
            <div className="text-sm text-muted-foreground">Items Saved</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-success mb-2">18</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-warning mb-2">6</div>
            <div className="text-sm text-muted-foreground">Scheduled</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-accent-foreground mb-2">4.2h</div>
            <div className="text-sm text-muted-foreground">Time Saved</div>
          </Card>
        </div>

        {/* Content List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-foreground">Scheduled Content</h3>
            <Button variant="smart">
              <Brain className="w-4 h-4" />
              AI Optimize Schedule
            </Button>
          </div>

          <div className="space-y-4">
            {savedContent.map((item) => (
              <Card key={item.id} className="p-6 hover:shadow-medium transition-smooth group">
                <div className="flex items-start gap-4">
                  {/* Content Icon */}
                  <div className="p-2 bg-gradient-soft rounded-lg text-primary flex-shrink-0 group-hover:scale-110 transition-bounce">
                    {item.icon}
                  </div>

                  {/* Main Content */}
                  <div className="flex-grow space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-smooth">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority} priority
                      </Badge>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.readTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {item.scheduledFor}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-6">Ready to organize your content consumption?</p>
          <Button variant="hero" size="lg">
            <Calendar className="w-5 h-5" />
            Create Your Dashboard
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;