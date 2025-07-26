import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookmarkPlus, 
  Calendar, 
  Brain, 
  Clock, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

const QuickActions = () => {
  const actions = [
    {
      icon: BookmarkPlus,
      label: 'Save Content',
      description: 'Add new link or content',
      variant: 'hero' as const,
      gradient: true
    },
    {
      icon: Calendar,
      label: 'Schedule Session',
      description: 'Plan your learning time',
      variant: 'smart' as const
    },
    {
      icon: Brain,
      label: 'AI Summary',
      description: 'Get intelligent insights',
      variant: 'ai' as const
    },
    {
      icon: Clock,
      label: 'Quick Read',
      description: 'Start 5-min session',
      variant: 'outline' as const
    }
  ];

  return (
    <Card className="p-6 border-0 bg-gradient-to-br from-white to-gray-50/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <Sparkles className="h-5 w-5 text-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant}
            className={`h-auto p-4 flex flex-col items-center space-y-2 ${
              action.gradient 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white' 
                : ''
            }`}
          >
            <action.icon className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">{action.label}</div>
              <div className="text-xs opacity-80">{action.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default QuickActions; 