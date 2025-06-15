
import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pharmacist, Shift } from '@/lib/types';
import dayjs from 'dayjs';
import { toast } from 'sonner';

const Leave = () => {
  const { pharmacists, leave, addLeave, deleteLeave, shifts, schedule } = useAppContext();
  const [selectedPharmacist, setSelectedPharmacist] = useState<Pharmacist | null>(null);
  const [month, setMonth] = useState<Date>(new Date());

  const pharmacistLeaveDates = leave
    .filter(l => l.pharmacistId === selectedPharmacist?.id)
    .map(l => dayjs(l.date).toDate());

  const handleDayClick = (day: Date) => {
    if (!selectedPharmacist) return;
    const dateStr = dayjs(day).format('YYYY-MM-DD');
    
    const isOnLeave = pharmacistLeaveDates.some(leaveDate => dayjs(leaveDate).isSame(day, 'day'));

    if (isOnLeave) {
      deleteLeave(selectedPharmacist.id, dateStr);
    } else {
      const clickedDayJs = dayjs(day);
      if (clickedDayJs.day() === 6) { // It's a Saturday
        // 1. Determine the pharmacist's Saturday leave limit for the month.
        const pharmacistShiftsInMonth = new Set<string>();
        const startOfMonth = dayjs(month).startOf('month');
        const endOfMonth = dayjs(month).endOf('month');

        for (let d = startOfMonth; d.isBefore(endOfMonth.add(1, 'day')); d = d.add(1, 'day')) {
            const dateStrInner = d.format('YYYY-MM-DD');
            const dailySchedule = schedule[dateStrInner];
            if (dailySchedule) {
                for (const shiftId in dailySchedule) {
                    if (dailySchedule[shiftId] === selectedPharmacist.id) {
                        pharmacistShiftsInMonth.add(shiftId);
                    }
                }
            }
        }
        
        let limit = 1; // Default limit
        let limitReasonShiftName = '';

        if (pharmacistShiftsInMonth.size > 0) {
            const shiftsWithLimits = [...pharmacistShiftsInMonth]
                .map(shiftId => shifts.find(s => s.id === shiftId))
                .filter((s): s is Shift => !!s && s.saturdayLeaveLimit != null);

            if (shiftsWithLimits.length > 0) {
                const maxLimitShift = shiftsWithLimits.reduce((maxShift, currentShift) => {
                    return currentShift.saturdayLeaveLimit > maxShift.saturdayLeaveLimit ? currentShift : maxShift;
                }, shiftsWithLimits[0]);
                
                limit = maxLimitShift.saturdayLeaveLimit;
                limitReasonShiftName = maxLimitShift.name;
            }
        }
        
        // 2. Count existing Saturday leaves for this pharmacist in the current month
        const saturdayLeaveCount = pharmacistLeaveDates.filter(d => 
            dayjs(d).isSame(month, 'month') && dayjs(d).day() === 6
        ).length;

        // 3. Check against limit
        if (saturdayLeaveCount >= limit) {
            toast.warning(`週六休假已達上限`, {
                description: `${selectedPharmacist.name} 的每月週六休假上限為 ${limit} 天。` + (limitReasonShiftName ? ` (因本月有排 ${limitReasonShiftName})` : ''),
            });
            return;
        }
      }
      addLeave(selectedPharmacist.id, dateStr);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">休假管理</h1>
      <Card>
        <CardHeader>
          <CardTitle>1. 選擇藥師</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={(id) => setSelectedPharmacist(pharmacists.find(p => p.id === id) || null)}>
            <SelectTrigger className="w-full md:w-1/3">
              <SelectValue placeholder="請選擇一位藥師" />
            </SelectTrigger>
            <SelectContent>
              {pharmacists.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
        
      {selectedPharmacist && (
        <Card>
          <CardHeader>
            <CardTitle>2. 選擇 {selectedPharmacist.name} 的休假日期</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div>
              <Calendar
                mode="multiple"
                selected={pharmacistLeaveDates}
                onDayClick={handleDayClick}
                month={month}
                onMonthChange={setMonth}
                className="rounded-md border"
                disabled={(date) => dayjs(date).day() === 0} // Disable Sundays
              />
              <p className="text-sm text-muted-foreground mt-2 text-center">點擊日期即可新增或移除休假。週日為公休日。</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Leave;
