
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScheduleIssue } from '@/lib/types';

dayjs.locale('zh-tw');

const Dashboard = () => {
  const { getScheduleIssues } = useAppContext();
  const [currentDate, setCurrentDate] = useState(dayjs());
  
  const issues = getScheduleIssues(currentDate);
  
  const getSeverityColor = (severity: ScheduleIssue['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: ScheduleIssue['severity']) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.date]) {
      acc[issue.date] = [];
    }
    acc[issue.date].push(issue);
    return acc;
  }, {} as Record<string, ScheduleIssue[]>);

  const highPriorityCount = issues.filter(i => i.severity === 'high').length;
  const mediumPriorityCount = issues.filter(i => i.severity === 'medium').length;
  const lowPriorityCount = issues.filter(i => i.severity === 'low').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center justify-center gap-4 flex-grow sm:flex-grow-0">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-center">
            {currentDate.format('YYYY 年 MM 月')} 儀表板
          </h1>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(currentDate.add(1, 'month'))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">總問題數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issues.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">高優先級</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highPriorityCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">中優先級</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mediumPriorityCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">低優先級</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{lowPriorityCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>問題清單</CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>本月排班沒有發現問題！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedIssues)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, dateIssues]) => (
                <div key={date} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">
                    {dayjs(date).format('MM/DD (ddd)')}
                  </h3>
                  <div className="space-y-2">
                    {dateIssues.map((issue, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {getSeverityIcon(issue.severity)}
                        <span className="flex-1">{issue.description}</span>
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
