'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Link as LinkIcon,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface OnboardingProps {
  onComplete: () => void;
  className?: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  image?: string;
}

const steps: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to ScrollLater',
    description: 'Stop endless scrolling. Start intentional reading.',
    icon: <Bookmark className="w-8 h-8" />,
    features: [
      'Save articles, videos, and threads in one place',
      'AI-powered summaries and categorization',
      'Schedule time to actually read what you save',
    ],
  },
  {
    id: 'capture',
    title: 'Capture Anything',
    description: 'Save content from anywhere with a single click.',
    icon: <LinkIcon className="w-8 h-8" />,
    features: [
      'Browser extension for instant saving',
      'iOS Shortcuts for mobile capture',
      'Email forwarding support',
      'Paste detection in app',
    ],
  },
  {
    id: 'organize',
    title: 'Stay Organized',
    description: 'AI automatically categorizes and prioritizes your content.',
    icon: <Sparkles className="w-8 h-8" />,
    features: [
      'Smart collections based on topics',
      'Auto-tagging and summarization',
      'Priority scoring based on your preferences',
      'Related content suggestions',
    ],
  },
  {
    id: 'schedule',
    title: 'Schedule Reading Time',
    description: 'Block time on your calendar to actually consume content.',
    icon: <Calendar className="w-8 h-8" />,
    features: [
      'Google Calendar integration',
      'Smart scheduling suggestions',
      'Daily reading digest',
      'Progress tracking',
    ],
  },
];

function Onboarding({ onComplete, className }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    setCompletedSteps([...completedSteps, step.id]);
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 bg-white z-50 flex flex-col',
        className
      )}
    >
      <div className="w-full h-1 bg-gray-100">
        <motion.div
          className="h-full bg-gray-900"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-gray-900">ScrollLater</span>
        </div>
        <button
          onClick={handleSkip}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-600"
            >
              {step.icon}
            </motion.div>

            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {step.title}
            </h1>
            <p className="text-gray-500 mb-8">{step.description}</p>

            <div className="space-y-3 text-left">
              {step.features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentStep
                    ? 'w-6 bg-gray-900'
                    : completedSteps.includes(s.id)
                    ? 'bg-gray-400'
                    : 'bg-gray-200'
                )}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="w-full" size="lg">
            {isLastStep ? (
              <>
                Get Started
                <Zap className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { Onboarding };
export type { OnboardingProps };
