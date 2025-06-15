
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { useToast } from '@/components/ui/use-toast';
import { Pharmacist, Shift } from '@/lib/types';

const WorkAssignment = () => {
  const { pharmacists, shifts, assignShift, isPharmacistOnLeave } = useAppContext();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedPharmacistId, setSelectedPharmacistId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAssignMonth = () => {
    if (!selectedPharmacistId || !selectedShiftId) {
      toast({
        title: '錯誤',
        description: '請先選擇一位藥師和一個班型。',
        variant: 'destructive',
      });
      return;
    }

    const pharmacistName = pharmacists.find(p => p.id === selectedPharmacistId)?.name;
    const shiftName = shifts.find(s => s.id === selectedShiftId)?.name;

    const start = currentDate.startOf('month');
    const end = currentDate.endOf('month');
    
    let currentDay = start;
    let assignmentCount = 0;
    while (currentDay.isBefore(end) || currentDay.isSame(end, 'day')) {
      const dateStr = currentDay.format('YYYY-MM-DD');
      if (!isPharmacistOnLeave(selectedPharmacistId, dateStr)) {
        assignShift(dateStr, selectedShiftId, selectedPharmacistId);
        assignmentCount++;
      }
      currentDay = currentDay.add(1, 'day');
    }

    toast({
      title: '排班成功',
      description: `已為 ${pharmacistName} 在 ${currentDate.format('YYYY 年 MM 月')} 指派了 ${assignmentCount} 天的「${shiftName}」。`,
    });
  };

  const pharmacistName = pharmacists.find(p => p.id === selectedPharmacistId)?.name || '藥師';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">批次工作分配</h1>
      <Card>
        <CardHeader>
          <CardTitle>1. 選擇月份</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold text-center">
              {currentDate.format('YYYY 年 MM 月')}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(currentDate.add(1, 'month'))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>2. 選擇藥師與班型</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row">
          <Select onValueChange={setSelectedPharmacistId} value={selectedPharmacistId || undefined}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="請選擇一位藥師" />
            </SelectTrigger>
            <SelectContent>
              {pharmacists.map((p: Pharmacist) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedShiftId} value={selectedShiftId || undefined}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="請選擇一個班型" />
            </SelectTrigger>
            <SelectContent>
              {shifts.map((s: Shift) => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. 執行分配</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAssignMonth} disabled={!selectedPharmacistId || !selectedShiftId}>
            為 {selectedPharmacistId ? pharmacistName : ''} 在 {currentDate.format('MM 月')} 進行批次排班
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            這將會為選擇的藥師指派整月份的班表，已設定的休假日期將會自動跳過。此操作會覆蓋現有排班。
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkAssignment;
