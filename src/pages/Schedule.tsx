import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, TriangleAlert, Download, LifeBuoy, MessageSquare } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shift } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Pharmacist } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import EventsManager from '@/components/EventsManager';

dayjs.locale('zh-tw');

const TIME_SLOTS = [
  { name: '早班', start: '08:30', end: '12:00' },
  { name: '午班', start: '13:00', end: '17:30' },
  { name: '晚班', start: '18:00', end: '22:00' },
];

const SATURDAY_SHIFTS = [
  { name: '早班1', start: '08:30', end: '12:30', type: 'morning' },
  { name: '早班2', start: '08:30', end: '12:30', type: 'morning' },
  { name: '早班3', start: '09:00', end: '13:00', type: 'afternoon' },
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
  const { 
    shifts, pharmacists, schedule, assignShift, isPharmacistOnLeave, 
    supportNeeds, assignSupport, updateNotes, events, updateEvent,
    assignSaturdaySupport, getSaturdaySupport
  } = useAppContext();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ name: string; start: string; end: string; } | null>(null);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [selectedDayForSupport, setSelectedDayForSupport] = useState<dayjs.Dayjs | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [selectedDayForNotes, setSelectedDayForNotes] = useState<dayjs.Dayjs | null>(null);
  const [notesText, setNotesText] = useState('');
  const [showEventsManager, setShowEventsManager] = useState(false);

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
  
  const openNotesDialog = (day: dayjs.Dayjs) => {
    const dateStr = day.format('YYYY-MM-DD');
    const currentNotes = schedule[dateStr]?.notes || '';
    setSelectedDayForNotes(day);
    setNotesText(currentNotes);
    setIsNotesDialogOpen(true);
  };
  
  const handleSaveNotes = () => {
    if (selectedDayForNotes) {
      const dateStr = selectedDayForNotes.format('YYYY-MM-DD');
      updateNotes(dateStr, notesText);
      setIsNotesDialogOpen(false);
    }
  };

  const handleEventDrop = (eventId: string, targetDate: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      updateEvent({ ...event, date: targetDate });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    handleEventDrop(eventId, targetDate);
  };
  
  const shiftsForSelectedSlot = selectedSlot ? getShiftsForSlot(selectedSlot) : [];
  
  const handleExportCSV = () => {
    const csvRows = [['日期', '早班', '午班', '晚班', '支援人員', '休假人員', '備註事件']];
    const pharmacistMap = new Map(pharmacists.map(p => [p.id, p.name]));

    daysInMonth.forEach(day => {
        const dateStr = day.format('YYYY-MM-DD');
        const dailySchedule = { shifts: {}, ...(schedule[dateStr] || {}) };
        const isTuesday = day.day() === 2;
        
        if (day.day() === 0) {
            csvRows.push([day.format('MM/DD'), 'OFF', '', '', '', '', '']);
            return;
        }
        
        // 收集各時段的藥師
        const morningPharmacists = [];
        const afternoonPharmacists = [];
        const eveningPharmacists = [];
        
        // 從班表中收集藥師
        TIME_SLOTS.forEach(slot => {
            const relevantShifts = getShiftsForSlot(slot);
            relevantShifts.forEach(shift => {
                const pharmacistId = dailySchedule.shifts[shift.id];
                if (pharmacistId) {
                    const pharmacist = pharmacistMap.get(pharmacistId);
                    // 檢查是否被指派到支援，如果是就不在班表顯示
                    const isInSupport = dailySchedule.support && (
                        (slot.name === '早班' && dailySchedule.support.morning?.includes(pharmacistId)) ||
                        (slot.name === '晚班' && dailySchedule.support.afternoon?.includes(pharmacistId))
                    );
                    
                    if (!isInSupport) {
                        if (slot.name === '早班') {
                            morningPharmacists.push(pharmacist);
                        } else if (slot.name === '午班') {
                            afternoonPharmacists.push(pharmacist);
                        } else if (slot.name === '晚班' && !isTuesday) { // 週二無晚班
                            eveningPharmacists.push(pharmacist);
                        }
                    }
                }
            });
        });
        
        // 收集支援人員
        const supportPersonnel = [];
        if (dailySchedule.support?.morning) {
            dailySchedule.support.morning.forEach(pId => {
                if (pId) {
                    const pharmacist = pharmacistMap.get(pId);
                    if (pharmacist) supportPersonnel.push(`${pharmacist}(早班支援)`);
                }
            });
        }
        
        if (dailySchedule.support?.afternoon) {
            dailySchedule.support.afternoon.forEach(pId => {
                if (pId) {
                    const pharmacist = pharmacistMap.get(pId);
                    if (pharmacist) supportPersonnel.push(`${pharmacist}(晚班支援)`);
                }
            });
        }
        
        // 收集休假人員
        const onLeaveToday = pharmacists
            .filter(p => isPharmacistOnLeave(p.id, dateStr))
            .map(p => p.name);
        
        // 收集備註事件
        const dayEvents = events
            .filter(event => event.date === dateStr)
            .map(event => event.name);
        
        csvRows.push([
            day.format('MM/DD'),
            morningPharmacists.join(' ') || '',
            afternoonPharmacists.join(' ') || '',
            isTuesday ? '延長白班' : (day.day() === 6 ? '' : eveningPharmacists.join(' ') || ''),
            supportPersonnel.join(' ') || '',
            onLeaveToday.join(' ') || '',
            [...dayEvents, dailySchedule.notes].filter(Boolean).join(' | ') || ''
        ]);
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

        if (isSunday) {
            return `
                <tr>
                    <td style="font-weight: 500; color: #dc2626;">${day.format('MM/DD')}</td>
                    <td style="text-align: center; color: #71717a; background-color: #f3f4f6; font-weight: bold;">OFF</td>
                    <td style="background-color: #f3f4f6;"></td>
                    <td style="background-color: #f3f4f6;"></td>
                    <td style="background-color: #f3f4f6;"></td>
                    <td style="background-color: #f3f4f6;"></td>
                </tr>
            `;
        }

        // 收集各時段的藥師
        const morningPharmacists = [];
        const afternoonPharmacists = [];
        const eveningPharmacists = [];
        
        // 從班表中收集藥師
        TIME_SLOTS.forEach(slot => {
            const relevantShifts = getShiftsForSlot(slot);
            relevantShifts.forEach(shift => {
                const pharmacistId = dailySchedule.shifts[shift.id];
                if (pharmacistId) {
                    const pharmacist = pharmacistMap.get(pharmacistId);
                    if (slot.name === '早班') {
                        morningPharmacists.push(pharmacist);
                    } else if (slot.name === '午班') {
                        afternoonPharmacists.push(pharmacist);
                    } else if (slot.name === '晚班') {
                        eveningPharmacists.push(pharmacist);
                    }
                }
            });
        });
        
        // 添加支援人力
        if (dailySchedule.support?.morning) {
            dailySchedule.support.morning.forEach(pId => {
                if (pId) {
                    const pharmacist = pharmacistMap.get(pId);
                    if (pharmacist && !morningPharmacists.includes(pharmacist)) {
                        morningPharmacists.push(pharmacist);
                    }
                }
            });
        }
        
        if (dailySchedule.support?.afternoon) {
            dailySchedule.support.afternoon.forEach(pId => {
                if (pId) {
                    const pharmacist = pharmacistMap.get(pId);
                    if (pharmacist && !afternoonPharmacists.includes(pharmacist)) {
                        afternoonPharmacists.push(pharmacist);
                    }
                }
            });
        }
        
        // 收集休假人員
        const onLeaveToday = pharmacists
            .filter(p => isPharmacistOnLeave(p.id, dateStr))
            .map(p => `${p.name} 休`);

        return `
            <tr>
                <td style="font-weight: 500; ${isSaturday ? 'color: #2563eb;' : ''}">${day.format('MM/DD')}</td>
                <td>${morningPharmacists.join(' ') || ''}</td>
                <td>${afternoonPharmacists.join(' ') || ''}</td>
                <td>${isSaturday ? '' : eveningPharmacists.join(' ') || ''}</td>
                <td>${onLeaveToday.join(' ') || ''}</td>
                <td>${dailySchedule.notes || ''}</td>
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
                    th { background-color: #f9fafb; font-weight: 600; text-align: center; }
                    h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h1>排班表 - ${currentDate.format('YYYY 年 MM 月')}</h1>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 80px;">日期</th>
                            <th>早</th>
                            <th>午</th>
                            <th>晚</th>
                            <th>休假</th>
                            <th>備註</th>
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
            <Button variant="outline" onClick={() => setShowEventsManager(!showEventsManager)}>
                {showEventsManager ? '隱藏' : '顯示'}事件管理
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
                <TableHead className="w-[120px]">備註</TableHead>
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

                // 檢查各種排班問題並顯示警告
                let scheduleWarnings = [];
                
                        if (isSaturday) {
                    const workingFullTimersCount = pharmacists.filter(p => p.position === '正職' && !isPharmacistOnLeave(p.id, dateStr)).length;
                    const supportPersonCount = (dailySchedule.support?.morning?.filter(Boolean).length || 0) + (dailySchedule.support?.afternoon?.filter(Boolean).length || 0);

                    if (workingFullTimersCount + supportPersonCount < 3) {
                         scheduleWarnings.push(
                            <div key="saturday" className="flex items-center gap-1 text-xs text-destructive mt-1 font-normal">
                                <TriangleAlert className="h-3 w-3" />
                                <span>早班人數不足 (應為3人)</span>
                            </div>
                        );
                    }
                } else if (!isSunday) {
                // 檢查是否有人力不足問題
                TIME_SLOTS.forEach(slot => {
                    const relevantShifts = getShiftsForSlot(slot);
                    const assignedCount = relevantShifts.filter(shift => dailySchedule.shifts[shift.id]).length;
                    const hasLeaveConflict = relevantShifts.some(shift => {
                        const pharmacistId = dailySchedule.shifts[shift.id];
                        return pharmacistId && isPharmacistOnLeave(pharmacistId, dateStr);
                    });
                    
                    // 檢查是否有藥師被安排支援但仍在班表上顯示
                    const hasConflictWithSupport = relevantShifts.some(shift => {
                        const pharmacistId = dailySchedule.shifts[shift.id];
                        if (!pharmacistId) return false;
                        
                        // 檢查這個藥師是否同時被安排支援
                        const isInSupport = dailySchedule.support && (
                            (slot.name === '早班' && dailySchedule.support.morning?.includes(pharmacistId)) ||
                            (slot.name === '晚班' && dailySchedule.support.afternoon?.includes(pharmacistId))
                        );
                        
                        // 如果藥師在休假且被安排支援，不應顯示班表問題
                        const isOnLeaveAndInSupport = isPharmacistOnLeave(pharmacistId, dateStr) && isInSupport;
                        
                        return !isOnLeaveAndInSupport && (assignedCount === 0 || (hasLeaveConflict && !isInSupport));
                    });
                    
                    if (hasConflictWithSupport) {
                        scheduleWarnings.push(
                            <div key={slot.name} className="flex items-center gap-1 text-xs text-orange-600 mt-1 font-normal">
                                <TriangleAlert className="h-3 w-3" />
                                <span>{slot.name}有問題</span>
                            </div>
                        );
                    }
                });
                }
                
                return (
                  <TableRow key={dateStr} className={cn(isSunday && "bg-muted/50")}>
                    <TableCell 
                      className="font-medium align-top"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateStr)}
                    >
                      <div className="flex flex-col">
                        <span className={cn(isSaturday && "text-blue-600 font-bold", isSunday && "text-red-600 font-bold")}>
                          {day.format('MM/DD')} ({day.format('ddd')})
                        </span>
                        {scheduleWarnings}
                        
                        {/* 顯示當日事件 */}
                        <div className="mt-1 space-y-1">
                          {events
                            .filter(event => event.date === dateStr)
                            .map(event => (
                              <div 
                                key={event.id} 
                                className="text-xs px-2 py-0.5 rounded-full w-fit text-white font-medium"
                                style={{ backgroundColor: event.color }}
                              >
                                {event.name}
                              </div>
                            ))}
                        </div>
                        
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
                            <div className="text-xs font-semibold text-blue-600 mb-1">
                              早班1 & 早班2 (08:30-12:30)
                            </div>
                            {(() => {
                              const workingFullTimers = pharmacists.filter(p => p.position === '正職' && !isPharmacistOnLeave(p.id, dateStr));
                              const fullTimeCount = pharmacists.filter(p => p.position === '正職').length;
                              const hasLeave = workingFullTimers.length < fullTimeCount;
                              const slotsNeeded = 3 - workingFullTimers.length;
                              
                              return (
                                <>
                                  {workingFullTimers.map(p => (
                                    <div key={p.id} className="text-xs p-1.5 rounded-md bg-background border">
                                      <span className="font-semibold">{p.name}</span>
                                      <span className="text-muted-foreground"> (正職)</span>
                                    </div>
                                  ))}
                                  
                                  {/* 下拉選單填補空缺 */}
                                  {Array.from({ length: slotsNeeded }, (_, index) => (
                                    <Select 
                                      key={`support-${index}`}
                                      value={dailySchedule.support?.morning?.[index] || ''}
                                      onValueChange={(value) => {
                                        if (value === 'unassign') {
                                          assignSupport(dateStr, 'morning', 'unassign', index);
                                        } else {
                                          assignSupport(dateStr, 'morning', value, index);
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="選擇支援藥師" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassign">清除指派</SelectItem>
                                        {pharmacists
                                          .filter(p => 
                                            p.position === 'OPD支援' || 
                                            (p.position === '兼職' && !isPharmacistOnLeave(p.id, dateStr))
                                          )
                                          .map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.name} ({p.position})
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="align-top p-2">
                          <div className="flex flex-col gap-1 min-h-[60px]">
                            <div className="text-xs font-semibold text-green-600 mb-1">
                              早班3 (09:00-13:00)
                            </div>
                            <Select
                              value={dailySchedule.support?.afternoon?.[0] || ''}
                              onValueChange={(value) => {
                                if (value === 'unassign') {
                                  assignSupport(dateStr, 'afternoon', 'unassign', 0);
                                } else {
                                  assignSupport(dateStr, 'afternoon', value, 0);
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="選擇藥師" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassign">清除指派</SelectItem>
                                {pharmacists
                                  .filter(p => !isPharmacistOnLeave(p.id, dateStr))
                                  .map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} ({p.position})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="align-top p-2 bg-muted/40">
                          <div className="flex flex-col gap-1 min-h-[60px] items-center justify-center text-muted-foreground text-sm">
                            無此時段
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      TIME_SLOTS.map(slot => {
                        // 週二沒有晚班，顯示為白班延長
                        const isTuesdayEvening = day.day() === 2 && slot.name === '晚班';
                        
                        if (isTuesdayEvening) {
                          return (
                            <TableCell key={slot.name} className="align-top p-2">
                              <div className="flex flex-col gap-1 min-h-[60px]">
                                <div className="text-xs font-semibold text-blue-600 mb-1">
                                  延長白班 (09:00-17:30)
                                </div>
                                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
                                  晚班人員改為白班
                                </div>
                              </div>
                            </TableCell>
                          );
                        }
                        
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
                                  
                                  // 檢查此藥師是否已被指派到支援
                                  const isInSupport = pharmacistId && dailySchedule.support && (
                                    (slot.name === '早班' && dailySchedule.support.morning?.includes(pharmacistId)) ||
                                    (slot.name === '晚班' && dailySchedule.support.afternoon?.includes(pharmacistId))
                                  );

                                  // 如果藥師在休假且不在支援，不顯示警告
                                  const shouldHide = hasLeaveConflict && !isInSupport;

                                  return (
                                    <div key={shift.id} className={cn(
                                      "text-xs p-1.5 rounded-md bg-background border",
                                      hasLeaveConflict && !isInSupport && "border-destructive",
                                      isInSupport && "hidden"  // 如果在支援中就不顯示
                                    )}>
                                      <span className="font-semibold">{shift.name}:</span>{' '}
                                      <span className={pharmacist 
                                        ? (shouldHide ? 'text-destructive font-bold' : 'text-primary font-bold') 
                                        : 'text-muted-foreground'
                                      }>
                                        {pharmacist ? pharmacist.name : '未指派'}
                                      </span>
                                      {shouldHide && <div className="text-destructive font-semibold mt-1">休假中</div>}
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
                                    const morningNeed = supportNeeds.find(n => n.dayOfWeek === dayOfWeek && n.timeSlot === 'morning')?.count || 0;
                                    const afternoonNeed = supportNeeds.find(n => n.dayOfWeek === dayOfWeek && n.timeSlot === 'afternoon')?.count || 0;
                                    
                                     // 檢查有沒有人請假且當天支援需求
                                    const hasLeaveToday = pharmacistsOnLeaveToday.length > 0;
                                    const needsSupport = morningNeed > 0 || afternoonNeed > 0;
                                    
                                    if (!supportAssignments || (supportAssignments.morning?.filter(Boolean).length === 0 && supportAssignments.afternoon?.filter(Boolean).length === 0)) {
                                       if(!needsSupport) {
                                        // 如果有人請假但不需要支援，顯示請假的人去支援
                                        if (hasLeaveToday) {
                                            return (
                                                <div className="text-xs text-center pt-2">
                                                    <div className="font-medium text-blue-700">當作請假者支援</div>
                                                    <div className="text-muted-foreground">
                                                        {pharmacistsOnLeaveToday.map(p => p.name).join(', ')}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return <div className="text-xs text-muted-foreground text-center pt-2">無支援需求</div>
                                       } else {
                                           // 如果需要支援但沒有人被指派
                                           if (hasLeaveToday) {
                                               // 有人請假且需要支援，檢查請假的人是否已被指派為支援
                                               const leavePharmacistIds = pharmacistsOnLeaveToday.map(p => p.id);
                                               const hasLeavePharmacistInSupport = 
                                                   (morningNeed > 0 && supportAssignments?.morning?.some(pId => leavePharmacistIds.includes(pId || ''))) ||
                                                   (afternoonNeed > 0 && supportAssignments?.afternoon?.some(pId => leavePharmacistIds.includes(pId || '')));
                                               
                                               if (!hasLeavePharmacistInSupport) {
                                                   return (
                                                       <div className="text-xs text-center pt-2">
                                                           <div className="font-medium text-blue-700">當作請假者支援</div>
                                                           <div className="text-muted-foreground">
                                                               {pharmacistsOnLeaveToday.map(p => p.name).join(', ')}
                                                           </div>
                                                       </div>
                                                   );
                                               }
                                           }
                                           return <div className="text-xs text-muted-foreground text-center pt-2">點擊指派</div>;
                                       }
                                    }

                                    const morningSupport = supportAssignments?.morning?.filter(Boolean) || [];
                                    const afternoonSupport = supportAssignments?.afternoon?.filter(Boolean) || [];
                                    const findPharmacist = (id: string) => pharmacists.find(p => p.id === id);

                                     if (morningSupport.length === 0 && afternoonSupport.length === 0) {
                                        // 如果需要支援但沒有指派，且有人請假，顯示需要 OPD 派人
                                        if (hasLeaveToday && needsSupport) {
                                            return <div className="text-xs text-center pt-2 text-orange-600 font-medium">需OPD派人</div>;
                                        }
                                        return <div className="text-xs text-muted-foreground text-center pt-2">點擊指派</div>;
                                    }

                                    return (
                                        <>
                                            {morningSupport.length > 0 && (
                                                <div className="text-xs mt-1">
                                                    <span className="font-medium">早班支援: </span>
                                                    {morningSupport.map(pId => findPharmacist(pId)?.name).join(', ')}
                                                </div>
                                            )}
                                             {afternoonSupport.length > 0 && (
                                                <div className="text-xs">
                                                    <span className="font-medium">晚班支援: </span>
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
                    <TableCell className="align-top p-2">
                        <div 
                            className="flex flex-col gap-1 min-h-[60px] cursor-pointer hover:bg-yellow-50 p-1 rounded-md"
                            onClick={() => openNotesDialog(day)}
                        >
                            <div className="font-semibold text-xs flex items-center gap-1 text-amber-700">
                                <MessageSquare className="h-4 w-4" />
                                <span>備註</span>
                            </div>
                            
                            {(() => {
                                const notes = dailySchedule.notes;
                                if (!notes) {
                                    return <div className="text-xs text-muted-foreground text-center pt-2">點擊新增</div>;
                                }
                                return (
                                    <div className="text-xs text-gray-700 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                                        {notes.length > 30 ? `${notes.substring(0, 30)}...` : notes}
                                    </div>
                                );
                            })()}
                        </div>
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
                                <h3 className="font-semibold mb-3 border-b pb-2">{timeSlot === 'morning' ? '早班支援' : '晚班支援 (1800-2200)'} ({need.count}人)</h3>
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
      
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
               編輯 {selectedDayForNotes?.format('MM/DD (ddd)')} 備註
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="輸入當日備註..."
              className="min-h-[120px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNotesDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveNotes}>
              儲存備註
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showEventsManager && (
        <div className="mt-4">
          <EventsManager currentMonth={currentDate} onEventDrop={handleEventDrop} />
        </div>
      )}
    </div>
  );
};

export default Schedule;
