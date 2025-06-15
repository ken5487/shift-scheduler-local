
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

dayjs.locale('zh-tw');

const Schedule = () => {
  const { shifts, pharmacists, schedule, assignShift } = useAppContext();
  const [currentDate, setCurrentDate] = useState(dayjs());

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const daysInMonth = [];
  let day = startOfMonth;
  
  // Pad start of month
  for (let i = 0; i < startOfMonth.day(); i++) {
    daysInMonth.push(null);
  }

  while(day.isBefore(endOfMonth) || day.isSame(endOfMonth, 'day')) {
    daysInMonth.push(day);
    day = day.add(1, 'day');
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  const getPharmacistName = (id: string) => pharmacists.find(p => p.id === id)?.name || '未指派';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-center">
          {currentDate.format('YYYY 年 MM 月')}
        </h1>
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(currentDate.add(1, 'month'))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map(weekday => (
          <div key={weekday} className="text-center font-semibold text-muted-foreground p-2">{weekday}</div>
        ))}
        {daysInMonth.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="border rounded-lg bg-muted/20" />;

          const dateStr = day.format('YYYY-MM-DD');
          const dailyShifts = schedule[dateStr] || {};
          
          return (
            <Card key={dateStr} className="min-h-[160px]">
              <CardHeader className="p-2">
                <CardTitle className={`text-sm font-medium ${day.isSame(dayjs(), 'day') ? 'text-primary' : ''}`}>
                  {day.format('D')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 flex flex-col gap-2">
                {shifts.map(shift => (
                  <div key={shift.id} className="flex items-center gap-1 text-xs">
                    <span className="font-semibold w-10 truncate">{shift.name}</span>
                    <Select
                      value={dailyShifts[shift.id]}
                      onValueChange={(pharmacistId) => assignShift(dateStr, shift.id, pharmacistId)}
                    >
                      <SelectTrigger className="flex-1 h-7">
                        <SelectValue placeholder="指派藥師" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassign">取消指派</SelectItem>
                        {pharmacists.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

export default Schedule;
