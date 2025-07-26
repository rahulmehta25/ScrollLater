import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Tag,
  FileText,
  Video,
  Code
} from 'lucide-react';

interface ContentCardProps {
  id: number;
  title: string;
  url: string;
  summary: string;
  readTime: string;
  category: string;
  scheduledFor: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  type: 'article' | 'video' | 'docs';
}

const ContentCard = ({ 
  title, 
  summary, 
  readTime, 
  category, 
  scheduledFor, 
  priority, 
  tags, 
  type 
}: ContentCardProps) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'docs': return <Code className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            {getTypeIcon()}
          </div>
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
        </div>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 line-clamp-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3">
          {summary}
        </p>

        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{readTime}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{scheduledFor}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs ${getPriorityColor()}`}>
              {priority} priority
            </Badge>
            <Button size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ContentCard; 