
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, TriangleAlert, Download, LifeBuoy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shift } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Pharmacist } from '@/lib/types';

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
  const { shifts, pharmacists, schedule, assignShift, isPharmacistOnLeave, supportNeeds, assignSupport } = useAppContext();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ name: string; start: string; end: string; } | null>(null);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [selectedDayForSupport, setSelectedDayForSupport] = useState<dayjs.Dayjs | null>(null);

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
  
  const openSupportDialog = (day: dayjs.Dayjs) => {
    setSelectedDayForSupport(day);
    setIsSupportDialogOpen(true);
  };
  
  const shiftsForSelectedSlot = selectedSlot ? getShiftsForSlot(selectedSlot) : [];
  
  const handleExportCSV = () => {
    const csvRows = [['日期', '星期', '時段', '班別', '藥師']];
    const pharmacistMap = new Map(pharmacists.map(p => [p.id, p.name]));
    const shiftMap = new Map(shifts.map(s => [s.id, s.name]));

    daysInMonth.forEach(day => {
        const dateStr = day.format('YYYY-MM-DD');
        const dayOfWeek = day.format('ddd');
        const dailySchedule = { shifts: {}, ...(schedule[dateStr] || {}) };
        
        if (day.day() === 0) {
            return;
        }
        
        TIME_SLOTS.forEach(slot => {
            if (day.day() === 6 && (slot.name === '午班' || slot.name === '晚班')) return;

            const relevantShifts = getShiftsForSlot(slot);
            if (relevantShifts.length === 0) {
                 csvRows.push([dateStr, dayOfWeek, slot.name, '無適用班型', '']);
            } else {
                relevantShifts.forEach(shift => {
                    const pharmacistId = dailySchedule.shifts[shift.id];
                    const pharmacistName = pharmacistId ? pharmacistMap.get(pharmacistId) || '未知藥師' : '未指派';
                    csvRows.push([
                        dateStr,
                        dayOfWeek,
                        slot.name,
                        shift.name,
                        pharmacistName,
                    ]);
                });
            }
        });
    });

    const csvContent = csvRows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${currentDate.format('YYYY-MM')}_排班表.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };
  
  const handleExportHTML = () => {
    const pharmacistMap = new Map(pharmacists.map(p => [p.id, p.name]));
    
    const tableRows = daysInMonth.map(day => {
        const dateStr = day.format('YYYY-MM-DD');
        const dailySchedule = { shifts: {}, ...(schedule[dateStr] || {}) };
        const isSunday = day.day() === 0;
        const isSaturday = day.day() === 6;

        let cells = '';
        if (isSunday) {
            cells = `<td colspan="${TIME_SLOTS.length}" style="text-align: center; color: #71717a; background-color: #f3f4f6;">週日公休</td>`;
        } else if (!schedule[dateStr]) {
            cells = `<td colspan="${TIME_SLOTS.length + 1}" style="text-align: center; color: #71717a;">未排班</td>`;
        }
        else {
            cells = TIME_SLOTS.map(slot => {
                if (isSaturday && (slot.name === '午班' || slot.name === '晚班')) {
                    return `<td style="background-color: #f5f5f5; text-align: center; color: #71717a;">無此時段</td>`;
                }
                const relevantShifts = getShiftsForSlot(slot);
                const shiftContent = relevantShifts.map(shift => {
                    const pharmacistId = dailySchedule.shifts[shift.id];
                    const pharmacistName = pharmacistId ? pharmacistMap.get(pharmacistId) : '未指派';
                    return `<div style="border: 1px solid #e5e7eb; border-radius: 0.375rem; padding: 4px; margin-bottom: 4px; background-color: #ffffff;">
                                <strong style="font-weight: 600;">${shift.name}:</strong> ${pharmacistName}
                            </div>`;
                }).join('');
                return `<td><div style="min-height: 40px;">${shiftContent || '<span style="color: #a1a1aa; font-size: 12px;">無適用班型</span>'}</div></td>`;
            }).join('');
        }

        return `
            <tr>
                <td style="font-weight: 500; vertical-align: top; ${isSaturday ? 'color: #2563eb;' : ''} ${isSunday ? 'color: #dc2626;' : ''}">${day.format('MM/DD')} (${day.format('ddd')})</td>
                ${cells}
            </tr>
        `;
    }).join('');

    const htmlContent = `
        <html>
            <head>
                <title>排班表 - ${currentDate.format('YYYY 年 MM 月')}</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; line-height: 1.5; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 14px; vertical-align: top; }
                    th { background-color: #f9fafb; font-weight: 600; }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>排班表 - ${currentDate.format('YYYY 年 MM 月')}</h1>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 100px;">日期</th>
                            ${TIME_SLOTS.map(slot => `<th>${slot.name} <br><span style="font-size: 12px; font-weight: normal; color: #71717a;">(${slot.start}-${slot.end})</span></th>`).join('')}
                            <th style="width: 150px;">支援</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
        </html>
    `;

    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center justify-center gap-4 flex-grow sm:flex-grow-0">
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
        <div className="flex gap-2 justify-center w-full sm:w-auto">
            <Button variant="outline" onClick={handleExportCSV}>
                <Download />
                匯出 CSV
            </Button>
            <Button variant="outline" onClick={handleExportHTML}>
                <Download />
                匯出 HTML
            </Button>
        </div>
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
                <TableHead className="w-[150px]">支援</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysInMonth.map(day => {
                const dateStr = day.format('YYYY-MM-DD');
                const dailySchedule = { shifts: {}, ...(schedule[dateStr] || {}) };
                const pharmacistsOnLeaveToday = pharmacists.filter(p => isPharmacistOnLeave(p.id, dateStr));
                const isSunday = day.day() === 0;
                const isSaturday = day.day() === 6;
                const dayOfWeek = day.day();
                const canHaveSupport = !isSunday && !isSaturday;

                let saturdayWarning = null;
                if (isSaturday) {
                    const workingFullTimersCount = pharmacists.filter(p => p.position === '正職' && !isPharmacistOnLeave(p.id, dateStr)).length;
                    
                    const earlySlot = TIME_SLOTS.find(slot => slot.name === '早班');
                    const morningShifts = earlySlot ? getShiftsForSlot(earlySlot) : [];

                    const assignedPharmacistIds = morningShifts.map(s => dailySchedule.shifts[s.id]).filter(Boolean) as string[];
                    const assignedPartTimersCount = pharmacists.filter(p => p.position === '兼職' && assignedPharmacistIds.includes(p.id)).length;

                    if (workingFullTimersCount + assignedPartTimersCount < 3) {
                         saturdayWarning = (
                            <div className="flex items-center gap-1 text-xs text-destructive mt-1 font-normal">
                                <TriangleAlert className="h-3 w-3" />
                                <span>早班人數不足 (應為3人)</span>
                            </div>
                        );
                    }
                }
                
                return (
                  <TableRow key={dateStr} className={cn(isSunday && "bg-muted/50")}>
                    <TableCell className="font-medium align-top">
                      <div className="flex flex-col">
                        <span className={cn(isSaturday && "text-blue-600 font-bold", isSunday && "text-red-600 font-bold")}>
                          {day.format('MM/DD')} ({day.format('ddd')})
                        </span>
                        {saturdayWarning}
                        <div className="mt-1 space-y-1">
                          {pharmacistsOnLeaveToday.map(p => (
                            <div key={p.id} className="text-xs text-destructive-foreground bg-destructive/80 px-2 py-0.5 rounded-full w-fit">
                              {p.name} 休假
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    {isSunday ? (
                      <>
                        <TableCell colSpan={TIME_SLOTS.length} className="text-center text-muted-foreground font-semibold">
                          週日公休
                        </TableCell>
                      </>
                    ) : isSaturday ? (
                      <>
                        <TableCell className="align-top p-2">
                          <div className="flex flex-col gap-1 min-h-[60px]">
                            {(() => {
                              const workingFullTimers = pharmacists.filter(p => p.position === '正職' && !isPharmacistOnLeave(p.id, dateStr));
                              const earlySlot = TIME_SLOTS.find(slot => slot.name === '早班');
                              const morningShifts = earlySlot ? getShiftsForSlot(earlySlot) : [];

                              const assignedPharmacists = morningShifts
                                .map(shift => {
                                    const pharmacistId = dailySchedule.shifts[shift.id];
                                    if (!pharmacistId) return null;
                                    return pharmacists.find(p => p.id === pharmacistId);
                                })
                                .filter((p): p is Pharmacist => !!p);
                              
                              const assignedPartTimers = assignedPharmacists.filter(p => p.position === '兼職');

                              return (
                                  <>
                                      {workingFullTimers.map(p => (
                                          <div key={p.id} className="text-xs p-1.5 rounded-md bg-background border">
                                              <span className="font-semibold">{p.name}</span>
                                              <span className="text-muted-foreground"> (正職)</span>
                                          </div>
                                      ))}
                                      {assignedPartTimers.map(p => {
                                          const hasLeaveConflict = isPharmacistOnLeave(p.id, dateStr);
                                          return (
                                              <div key={p.id} className={cn(
                                                  "text-xs p-1.5 rounded-md border",
                                                  hasLeaveConflict ? "border-destructive bg-destructive/10" : "bg-green-50 border-green-200"
                                              )}>
                                                  <span className="font-semibold text-green-900">{p.name}</span>
                                                  <span className="text-green-800"> (兼職支援)</span>
                                                  {hasLeaveConflict && <div className="text-destructive font-semibold mt-1">休假中</div>}
                                              </div>
                                          );
                                      })}
                                      {(workingFullTimers.length + assignedPartTimers.length) === 0 && (
                                          <div className="text-xs text-muted-foreground flex items-center justify-center h-full">無人上班</div>
                                      )}
                                  </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell colSpan={2} className="align-top p-2 bg-muted/40">
                            <div className="flex flex-col gap-1 min-h-[60px] items-center justify-center text-muted-foreground text-sm">
                                無此時段
                            </div>
                        </TableCell>
                      </>
                    ) : (
                      TIME_SLOTS.map(slot => {
                        if (isSaturday && (slot.name === '午班' || slot.name === '晚班')) {
                          return (
                            <TableCell key={slot.name} className="align-top p-2 bg-muted/40">
                              <div className="flex flex-col gap-1 min-h-[60px] items-center justify-center text-muted-foreground text-sm">
                                無此時段
                              </div>
                            </TableCell>
                          );
                        }
                        const relevantShifts = getShiftsForSlot(slot);
                        return (
                          <TableCell key={slot.name} className="align-top cursor-pointer hover:bg-muted/50 p-2" onClick={() => openAssignmentDialog(day, slot)}>
                            <div className="flex flex-col gap-1 min-h-[60px]">
                              {relevantShifts.length > 0 ? relevantShifts.map(shift => {
                                  const pharmacistId = dailySchedule.shifts[shift.id];
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
                      })
                    )}
                    <TableCell className="align-top p-2">
                        {canHaveSupport ? (
                            <div 
                                className="flex flex-col gap-1 min-h-[60px] cursor-pointer hover:bg-blue-50 p-1 rounded-md"
                                onClick={() => openSupportDialog(day)}
                            >
                                <div className="font-semibold text-xs flex items-center gap-1 text-blue-700">
                                    <LifeBuoy className="h-4 w-4" />
                                    <span>支援人力</span>
                                </div>
                                
                                {(() => {
                                    const supportAssignments = dailySchedule.support;
                                    if (!supportAssignments || (supportAssignments.morning?.filter(Boolean).length === 0 && supportAssignments.afternoon?.filter(Boolean).length === 0)) {
                                       const morningNeed = supportNeeds.find(n => n.dayOfWeek === dayOfWeek && n.timeSlot === 'morning')?.count || 0;
                                       const afternoonNeed = supportNeeds.find(n => n.dayOfWeek === dayOfWeek && n.timeSlot === 'afternoon')?.count || 0;
                                       if(morningNeed === 0 && afternoonNeed === 0) {
                                        return <div className="text-xs text-muted-foreground text-center pt-2">無支援需求</div>
                                       }
                                    }

                                    const morningSupport = supportAssignments?.morning?.filter(Boolean) || [];
                                    const afternoonSupport = supportAssignments?.afternoon?.filter(Boolean) || [];
                                    const findPharmacist = (id: string) => pharmacists.find(p => p.id === id);

                                    if (morningSupport.length === 0 && afternoonSupport.length === 0) {
                                        return <div className="text-xs text-muted-foreground text-center pt-2">點擊指派</div>;
                                    }

                                    return (
                                        <>
                                            {morningSupport.length > 0 && (
                                                <div className="text-xs mt-1">
                                                    <span className="font-medium">上午: </span>
                                                    {morningSupport.map(pId => findPharmacist(pId)?.name).join(', ')}
                                                </div>
                                            )}
                                            {afternoonSupport.length > 0 && (
                                                <div className="text-xs">
                                                    <span className="font-medium">下午: </span>
                                                    {afternoonSupport.map(pId => findPharmacist(pId)?.name).join(', ')}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center text-muted-foreground text-xs h-full">不適用</div>
                        )}
                    </TableCell>
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
            <DialogTitle>
              {selectedDay?.day() === 6 
                ? `指派 ${selectedDay?.format('MM/DD')} 週六支援` 
                : `指派 ${selectedDay?.format('MM/DD')} ${selectedSlot?.name}`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-4">
            {shiftsForSelectedSlot.length > 0 ? shiftsForSelectedSlot.map(shift => {
               const dateStr = selectedDay!.format('YYYY-MM-DD');
               const dailySchedule = { shifts: {}, ...(schedule[dateStr] || {}) };
               const isSaturdayDialog = selectedDay?.day() === 6;
               const availablePharmacists = isSaturdayDialog
                ? pharmacists.filter(p => p.position === '兼職' && !isPharmacistOnLeave(p.id, dateStr))
                : pharmacists.filter(p => !isPharmacistOnLeave(p.id, dateStr));

              return (
              <div key={shift.id} className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-medium">{shift.name}</span>
                <div className="col-span-3">
                  <Select
                    value={dailySchedule.shifts[shift.id]}
                    onValueChange={(pharmacistId) => assignShift(dateStr, shift.id, pharmacistId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isSaturdayDialog ? "指派兼職藥師支援" : "指派藥師"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassign">取消指派</SelectItem>
                      {availablePharmacists.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                      {isSaturdayDialog && availablePharmacists.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">無可用的兼職藥師</div>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}) : <p className="text-center text-muted-foreground">此時段沒有可以指派的班型。</p>}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
               指派 {selectedDayForSupport?.format('MM/DD (ddd)')} 支援人力
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-6">
            {selectedDayForSupport && (
                <>
                    {(['morning', 'afternoon'] as const).map(timeSlot => {
                        const dayOfWeek = selectedDayForSupport.day() === 0 ? 7 : selectedDayForSupport.day();
                        const need = supportNeeds.find(n => n.dayOfWeek === dayOfWeek && n.timeSlot === timeSlot);
                        if (!need || need.count === 0) return null;

                        const dateStr = selectedDayForSupport.format('YYYY-MM-DD');
                        const supportAssignments = schedule[dateStr]?.support?.[timeSlot] || [];
                        const availablePharmacists = pharmacists.filter(p => !isPharmacistOnLeave(p.id, dateStr));

                        return (
                            <div key={timeSlot}>
                                <h3 className="font-semibold mb-3 border-b pb-2">{timeSlot === 'morning' ? '上午支援' : '下午支援'} ({need.count}人)</h3>
                                <div className="flex flex-col gap-3">
                                    {Array.from({ length: need.count }).map((_, index) => (
                                        <div key={index} className="grid grid-cols-4 items-center gap-4">
                                            <span className="text-right text-sm text-muted-foreground">支援 {index + 1}</span>
                                            <div className="col-span-3">
                                                 <Select
                                                    value={supportAssignments[index] || 'unassign'}
                                                    onValueChange={(pharmacistId) => assignSupport(dateStr, timeSlot, pharmacistId, index)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="指派藥師" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="unassign">取消指派</SelectItem>
                                                        {availablePharmacists.map(p => {
                                                            const currentSlotAssignments = supportAssignments || [];
                                                            const isAssignedInThisSlot = currentSlotAssignments.some((pId, i) => pId === p.id && i !== index);
                                                            return (
                                                                <SelectItem key={p.id} value={p.id} disabled={isAssignedInThisSlot}>
                                                                    {p.name} {isAssignedInThisSlot ? '(已於此時段指派)' : ''}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
