
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookmarkPlus, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Brain,
  Plus,
  Sparkles,
  Zap,
  Target,
  ChevronRight
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ContentCard from '@/components/dashboard/ContentCard';
import QuickActions from '@/components/dashboard/QuickActions';
import UpcomingSessions from '@/components/dashboard/UpcomingSessions';
import { apiService, Entry } from '@/lib/api';

const Dashboard = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState({
    total_entries: 0,
    completed_sessions: 0,
    time_saved: 0,
    learning_streak: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [entriesData, statsData] = await Promise.all([
        apiService.getEntries(),
        apiService.getStats()
      ]);
      
      setEntries(entriesData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = [
    {
      name: 'Content Saved',
      value: stats.total_entries.toString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: BookmarkPlus,
      trend: 'from last week'
    },
    {
      name: 'Sessions Completed',
      value: stats.completed_sessions.toString(),
      change: '+25%',
      changeType: 'positive' as const,
      icon: Target,
      trend: '89% completion rate'
    },
    {
      name: 'Time Saved',
      value: `${stats.time_saved}h`,
      change: '+8%',
      changeType: 'positive' as const,
      icon: Clock,
      trend: 'this week'
    },
    {
      name: 'Learning Streak',
      value: stats.learning_streak.toString(),
      change: '+3',
      changeType: 'positive' as const,
      icon: TrendingUp,
      trend: 'days in a row'
    },
  ];

  const recentContent = entries.slice(0, 3).map(entry => ({
    id: entry.id,
    title: entry.title,
    url: entry.url,
    readTime: `${entry.read_time || 5} min read`,
    category: entry.category || 'General',
    scheduledFor: entry.scheduled_for ? new Date(entry.scheduled_for).toLocaleDateString() : 'Not scheduled',
    summary: entry.summary || entry.ai_analysis?.summary || 'No summary available',
    priority: (entry.priority as 'high' | 'medium' | 'low') || 'medium',
    tags: entry.tags || entry.ai_analysis?.tags || [],
    type: 'article' as const // Default to article, could be enhanced with URL analysis
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI-Powered Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Good morning! 👋
            </p>
            <p className="text-gray-500 text-sm">
              Ready to dive into your curated learning journey?
            </p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Save New Content
          </Button>
        </div>

        {/* Motivational Banner */}
        <Card className="p-6 border-0 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">🔥 You're on fire!</h3>
              <p className="text-sm opacity-90">
                {stats.learning_streak}-day learning streak • {stats.time_saved} hours of quality content consumed this week
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Keep it up!
            </Button>
          </div>
        </Card>

        {/* Enhanced Stats Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardStats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Content - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Smart Queue</h2>
              <Button variant="outline" size="sm">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="space-y-4">
              {recentContent.map((item) => (
                <ContentCard key={item.id} {...item} />
              ))}
            </div>

            {/* AI Insights Card */}
            <Card className="p-6 border-0 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">💡 AI Insight</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Based on your reading patterns, you're most focused between 9-11 AM. 
                    I've scheduled your complex technical content during this peak time.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Optimize my schedule
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Upcoming Sessions - Takes 1 column */}
          <div>
            <UpcomingSessions />
          </div>
        </div>

        {/* Achievement Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <h3 className="font-medium text-gray-900">Weekly Goal</h3>
                  <p className="text-sm text-gray-600">Completed 8/6 sessions</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <h3 className="font-medium text-gray-900">Speed Reader</h3>
                  <p className="text-sm text-gray-600">Finished 3 articles in 1 hour</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-0 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🧠</div>
                <div>
                  <h3 className="font-medium text-gray-900">Knowledge Seeker</h3>
                  <p className="text-sm text-gray-600">Saved 10+ AI-related articles</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
