import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Play, Brain } from 'lucide-react';

const UpcomingSessions = () => {
  const sessions = [
    {
      id: 1,
      title: 'AI in Product Design',
      time: 'Today 3:00 PM',
      duration: '8 min',
      type: 'reading',
      priority: 'high'
    },
    {
      id: 2,
      title: 'React Server Components',
      time: 'Tomorrow 9:00 AM',
      duration: '12 min',
      type: 'video',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Database Indexing',
      time: 'Friday 10:00 AM',
      duration: '15 min',
      type: 'article',
      priority: 'low'
    }
  ];

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <Card className="p-6 border-0 bg-gradient-to-br from-white to-gray-50/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          View calendar
        </Button>
      </div>

      <div className="space-y-4">
        {sessions.map((session, index) => (
          <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-white border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${getPriorityDot(session.priority)}`} />
              <div>
                <p className="text-sm text-gray-500">{session.time}</p>
                {index === 0 && (
                  <Button size="sm" className="mt-1">
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                )}
              </div>
            </div>
            <div className="text-right">
              <h4 className="font-medium text-gray-900">{session.title}</h4>
              <p className="text-sm text-gray-500">{session.duration} {session.type} session</p>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
        <Brain className="h-4 w-4 mr-2" />
        AI Optimize My Schedule
      </Button>
    </Card>
  );
};

export default UpcomingSessions; 