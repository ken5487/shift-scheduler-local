
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { pharmacists, shifts } = useAppContext();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">儀表板</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">藥師總數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pharmacists.length}</div>
            <p className="text-xs text-muted-foreground">位在職藥師</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">班型總數</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">種已定義班型</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>快速開始</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/schedule">前往排班</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/staff">管理藥師</Link>
          </Button>
           <Button asChild variant="outline">
            <Link to="/shifts">管理班型</Link>
          </Button>
           <Button asChild variant="outline">
            <Link to="/leave">休假管理</Link>
          </Button>
           <Button asChild variant="outline">
            <Link to="/work-assignment">批次分配</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/support">支援設定</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
