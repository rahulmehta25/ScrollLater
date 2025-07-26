
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const CalendarView = () => {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your scheduled content sessions
          </p>
        </div>
        <Button variant="hero" className="gap-2">
          <Plus className="w-4 h-4" />
          Schedule Session
        </Button>
      </div>

      {/* Calendar Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">December 2024</h2>
            <Button variant="outline" size="icon">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Week</Button>
            <Button variant="outline" size="sm">Month</Button>
          </div>
        </div>

        {/* Calendar placeholder */}
        <div className="p-12 text-center border-2 border-dashed border-border rounded-lg">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Calendar Integration Coming Soon</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Full calendar view with Google Calendar sync and scheduling features are in development.
          </p>
          <Button variant="outline">
            Connect Google Calendar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CalendarView;
