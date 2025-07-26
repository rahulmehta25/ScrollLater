import { Button } from "@/components/ui/button";
import { Calendar, Brain, Clock, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary-glow/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/10 backdrop-blur-sm rounded-full border border-background/20">
                <Sparkles className="w-4 h-4 text-primary-glow" />
                <span className="text-sm font-medium text-background">AI-Powered Productivity</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-background leading-tight">
                Save.<br />
                <span className="bg-gradient-to-r from-primary-glow to-accent bg-clip-text text-transparent">
                  Schedule.
                </span><br />
                Consume.
              </h1>
              
              <p className="text-xl text-background/80 max-w-2xl">
                Transform any link into a scheduled learning session. ScrollLater uses AI to organize your content and automatically schedules it into your calendar when you're most likely to engage.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="lg" className="text-lg">
                <Calendar className="w-5 h-5" />
                Start Scheduling
              </Button>
              <Button variant="smart" size="lg" className="text-lg">
                <Brain className="w-5 h-5" />
                See AI in Action
              </Button>
            </div>
            
            <div className="flex items-center gap-8 justify-center lg:justify-start text-background/70">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Smart Scheduling</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <span className="text-sm">AI Summaries</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm">Auto Canva Docs</span>
              </div>
            </div>
          </div>
          
          {/* Right content - Hero image */}
          <div className="relative">
            <div className="relative z-10 transform lg:translate-x-8">
              <img 
                src={heroImage} 
                alt="ScrollLater AI scheduling interface"
                className="w-full h-auto rounded-2xl shadow-glow"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary-glow/30 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent/30 rounded-full blur-xl animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;