import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shift } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

dayjs.locale('zh-tw');

const TIME_SLOTS = [
  { name: '早班', start: '08:30', end: '12:00' },
  { name: '午班', start: '13:00', end: '17:30' },
  { name: '晚班', start: '18:00', end: '22:00' },
];

const doTimesOverlap = (shift: Shift, slot: { start: string; end: string }) => {
  const toMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const shiftStart = toMinutes(shift.startTime);
  const shiftEnd = toMinutes(shift.endTime);
  const slotStart = toMinutes(slot.start);
  const slotEnd = toMinutes(slot.end);

  const effectiveShiftEnd = shiftEnd === 0 ? 24 * 60 : shiftEnd;

  return shiftStart < slotEnd && effectiveShiftEnd > slotStart;
};


const Schedule = () => {
  const { shifts, pharmacists, schedule, assignShift, isPharmacistOnLeave } = useAppContext();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ name: string; start: string; end: string; } | null>(null);

  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const daysInMonth = [];
  let day = startOfMonth;

  while(day.isBefore(endOfMonth) || day.isSame(endOfMonth, 'day')) {
    daysInMonth.push(day);
    day = day.add(1, 'day');
  }
  
  const getShiftsForSlot = (slot: { start: string; end: string }) => {
    return shifts.filter(shift => doTimesOverlap(shift, slot));
  };
  
  const openAssignmentDialog = (day: dayjs.Dayjs, slot: { name: string; start: string; end:string; }) => {
    setSelectedDay(day);
    setSelectedSlot(slot);
    setIsDialogOpen(true);
  };
  
  const shiftsForSelectedSlot = selectedSlot ? getShiftsForSlot(selectedSlot) : [];

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

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">日期</TableHead>
                {TIME_SLOTS.map(slot => (
                  <TableHead key={slot.name}>{slot.name} <span className="text-xs font-normal text-muted-foreground">({slot.start}-{slot.end})</span></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysInMonth.map(day => {
                const dateStr = day.format('YYYY-MM-DD');
                const dailySchedule = schedule[dateStr] || {};
                const pharmacistsOnLeaveToday = pharmacists.filter(p => isPharmacistOnLeave(p.id, dateStr));
                
                return (
                  <TableRow key={dateStr}>
                    <TableCell className="font-medium align-top">
                      <div className="flex flex-col">
                        <span>{day.format('MM/DD')} ({day.format('ddd')})</span>
                        <div className="mt-1 space-y-1">
                          {pharmacistsOnLeaveToday.map(p => (
                            <div key={p.id} className="text-xs text-destructive-foreground bg-destructive/80 px-2 py-0.5 rounded-full w-fit">
                              {p.name} 休假
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    {TIME_SLOTS.map(slot => {
                      const relevantShifts = getShiftsForSlot(slot);
                      return (
                        <TableCell key={slot.name} className="align-top cursor-pointer hover:bg-muted/50 p-2" onClick={() => openAssignmentDialog(day, slot)}>
                          <div className="flex flex-col gap-1 min-h-[60px]">
                            {relevantShifts.length > 0 ? relevantShifts.map(shift => {
                                const pharmacistId = dailySchedule[shift.id];
                                const pharmacist = pharmacists.find(p => p.id === pharmacistId);
                                const hasLeaveConflict = !!pharmacistId && isPharmacistOnLeave(pharmacistId, dateStr);

                                return (
                                  <div key={shift.id} className={cn(
                                    "text-xs p-1.5 rounded-md bg-background border",
                                    hasLeaveConflict && "border-destructive"
                                  )}>
                                    <span className="font-semibold">{shift.name}:</span>{' '}
                                    <span className={pharmacist 
                                      ? (hasLeaveConflict ? 'text-destructive font-bold' : 'text-primary font-bold') 
                                      : 'text-muted-foreground'
                                    }>
                                      {pharmacist ? pharmacist.name : '未指派'}
                                    </span>
                                    {hasLeaveConflict && <div className="text-destructive font-semibold mt-1">休假中</div>}
                                  </div>
                                )
                              }) : <div className="text-xs text-muted-foreground flex items-center justify-center h-full">無適用班型</div>}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>指派 {selectedDay?.format('MM/DD')} {selectedSlot?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-4">
            {shiftsForSelectedSlot.length > 0 ? shiftsForSelectedSlot.map(shift => {
               const dateStr = selectedDay!.format('YYYY-MM-DD');
               const dailySchedule = schedule[dateStr] || {};
               const availablePharmacists = pharmacists.filter(p => !isPharmacistOnLeave(p.id, dateStr));

              return (
              <div key={shift.id} className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-medium">{shift.name}</span>
                <div className="col-span-3">
                  <Select
                    value={dailySchedule[shift.id]}
                    onValueChange={(pharmacistId) => assignShift(dateStr, shift.id, pharmacistId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="指派藥師" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassign">取消指派</SelectItem>
                      {availablePharmacists.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}) : <p className="text-center text-muted-foreground">此時段沒有可以指派的班型。</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
