import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Pharmacist, Shift, MonthlySchedule, Leave, SupportNeed, ScheduleIssue } from '@/lib/types';
import dayjs from 'dayjs';

// --- 預設範例資料 ---
const defaultPharmacists: Pharmacist[] = [
  { id: uuidv4(), name: '王藥師', position: '正職' },
  { id: uuidv4(), name: '李藥師', position: '正職' },
  { id: uuidv4(), name: '陳藥師', position: '兼職' },
];

const defaultShifts: Shift[] = [
  { id: uuidv4(), name: '早班', startTime: '08:30', endTime: '12:00' },
  { id: uuidv4(), name: '午班', startTime: '13:00', endTime: '17:30' },
  { id: uuidv4(), name: '晚班', startTime: '18:00', endTime: '22:00' },
  { id: uuidv4(), name: '全日班', startTime: '08:30', endTime: '17:30' },
];

const defaultSupportNeeds: SupportNeed[] = [
    // Monday to Friday, morning and afternoon, default 0
    ...Array.from({ length: 5 }, (_, i) => i + 1).flatMap(day => ([
        { dayOfWeek: day, timeSlot: 'morning' as const, count: 0 },
        { dayOfWeek: day, timeSlot: 'afternoon' as const, count: 0 },
    ]))
];

interface AppContextType {
  pharmacists: Pharmacist[];
  addPharmacist: (pharmacist: Omit<Pharmacist, 'id'>) => void;
  updatePharmacist: (pharmacist: Pharmacist) => void;
  deletePharmacist: (id: string) => void;
  shifts: Shift[];
  addShift: (shift: Omit<Shift, 'id'>) => void;
  updateShift: (shift: Partial<Shift> & { id: string }) => void;
  deleteShift: (id: string) => void;
  schedule: MonthlySchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthlySchedule>>;
  assignShift: (date: string, shiftId: string, pharmacistId: string) => void;
  leave: Leave[];
  addLeave: (pharmacistId: string, date: string) => void;
  deleteLeave: (pharmacistId: string, date: string) => void;
  isPharmacistOnLeave: (pharmacistId: string, date: string) => boolean;
  supportNeeds: SupportNeed[];
  updateSupportNeed: (dayOfWeek: number, timeSlot: 'morning' | 'afternoon', count: number) => void;
  assignSupport: (date: string, timeSlot: 'morning' | 'afternoon', pharmacistId: string, index: number) => void;
  updateNotes: (date: string, notes: string) => void;
  getScheduleIssues: (month: dayjs.Dayjs) => ScheduleIssue[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedule, setSchedule] = useState<MonthlySchedule>({});
  const [leave, setLeave] = useState<Leave[]>([]);
  const [supportNeeds, setSupportNeeds] = useState<SupportNeed[]>([]);

  useEffect(() => {
    try {
      const savedPharmacists = localStorage.getItem('pharmacists');
      const savedShifts = localStorage.getItem('shifts');
      const savedSchedule = localStorage.getItem('schedule');
      const savedLeave = localStorage.getItem('leave');
      const savedSupportNeeds = localStorage.getItem('supportNeeds');
      
      // Clean up old data from localStorage
      localStorage.removeItem('saturdayLeaveLimits');

      setPharmacists(savedPharmacists ? JSON.parse(savedPharmacists) : defaultPharmacists);
      
      // Migration: remove saturdayLeaveLimit from existing shifts
      const parsedShifts = savedShifts ? JSON.parse(savedShifts) : defaultShifts;
      const cleanedShifts = parsedShifts.map((shift: any) => {
        const { saturdayLeaveLimit, ...cleanShift } = shift;
        return cleanShift;
      });
      setShifts(cleanedShifts);
      
      setSchedule(savedSchedule ? JSON.parse(savedSchedule) : {});
      setLeave(savedLeave ? JSON.parse(savedLeave) : []);
      setSupportNeeds(savedSupportNeeds ? JSON.parse(savedSupportNeeds) : defaultSupportNeeds);
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setPharmacists(defaultPharmacists);
      setShifts(defaultShifts);
      setSchedule({});
      setLeave([]);
      setSupportNeeds(defaultSupportNeeds);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('pharmacists', JSON.stringify(pharmacists));
        localStorage.setItem('shifts', JSON.stringify(shifts));
        localStorage.setItem('schedule', JSON.stringify(schedule));
        localStorage.setItem('leave', JSON.stringify(leave));
        localStorage.setItem('supportNeeds', JSON.stringify(supportNeeds));
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, [pharmacists, shifts, schedule, leave, supportNeeds]);

  const addPharmacist = (pharmacist: Omit<Pharmacist, 'id'>) => {
    setPharmacists([...pharmacists, { ...pharmacist, id: uuidv4() }]);
  };

  const updatePharmacist = (updatedPharmacist: Pharmacist) => {
    setPharmacists(pharmacists.map(p => p.id === updatedPharmacist.id ? updatedPharmacist : p));
  };
  
  const deletePharmacist = (id: string) => {
    setPharmacists(pharmacists.filter(p => p.id !== id));
  };

  const addShift = (shift: Omit<Shift, 'id'>) => {
    setShifts([...shifts, { ...shift, id: uuidv4() }]);
  };

  const updateShift = (updatedShift: Partial<Shift> & { id: string }) => {
    setShifts(shifts.map(s => s.id === updatedShift.id ? { ...s, ...updatedShift } : s));
  };

  const deleteShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const assignShift = (date: string, shiftId: string, pharmacistId: string) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      
      // Ensure the date entry and its shifts property exist
      if (!newSchedule[date]) {
        newSchedule[date] = { shifts: {} };
      } else if (!newSchedule[date].shifts) {
        newSchedule[date].shifts = {};
      }

      if (pharmacistId === "unassign") {
        delete newSchedule[date].shifts[shiftId];
      } else {
        newSchedule[date].shifts[shiftId] = pharmacistId;
      }
      return newSchedule;
    });
  };

  const toMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const assignSupport = (date: string, timeSlot: 'morning' | 'afternoon', pharmacistId: string, index: number) => {
    setSchedule(prev => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        const daySchedule = newSchedule[date] || {};
        if (!daySchedule.shifts) {
          daySchedule.shifts = {};
        }

        // When assigning, clear conflicting shifts for the newly assigned pharmacist
        if (pharmacistId && pharmacistId !== 'unassign') {
            const supportStartTime = timeSlot === 'morning' ? toMinutes('08:00') : toMinutes('12:30');
            const supportEndTime = timeSlot === 'morning' ? toMinutes('12:30') : toMinutes('18:00');
            
            shifts.forEach(shift => {
              const shiftStart = toMinutes(shift.startTime);
              const shiftEnd = toMinutes(shift.endTime);
              const shiftCenter = shiftStart + (shiftEnd - shiftStart) / 2;

              const isShiftInSupportSlot = shiftCenter >= supportStartTime && shiftCenter < supportEndTime;

              if (isShiftInSupportSlot && daySchedule.shifts[shift.id] === pharmacistId) {
                console.log(`清除衝突班表: ${shift.name} for pharmacist ${pharmacistId} on ${date}`);
                delete daySchedule.shifts[shift.id];
              }
            });
        }
        
        if (!daySchedule.support) daySchedule.support = {};
        if (!daySchedule.support[timeSlot]) daySchedule.support[timeSlot] = [];
        
        daySchedule.support[timeSlot]![index] = pharmacistId === 'unassign' ? null : pharmacistId;
        
        const hasAssignments = daySchedule.support[timeSlot]!.some(p => p !== null);
        if (!hasAssignments) {
            delete daySchedule.support![timeSlot];
        }
        if(daySchedule.support && Object.keys(daySchedule.support).length === 0) {
            delete daySchedule.support;
        }

        newSchedule[date] = daySchedule;
        return newSchedule;
    });
  };

  const updateNotes = (date: string, notes: string) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[date]) {
        newSchedule[date] = { shifts: {} };
      }
      if (notes.trim()) {
        newSchedule[date].notes = notes;
      } else {
        delete newSchedule[date].notes;
      }
      return newSchedule;
    });
  };

  const getScheduleIssues = (month: dayjs.Dayjs): ScheduleIssue[] => {
    const issues: ScheduleIssue[] = [];
    const startOfMonth = month.startOf('month');
    const endOfMonth = month.endOf('month');
    let day = startOfMonth;

    while(day.isBefore(endOfMonth) || day.isSame(endOfMonth, 'day')) {
      const dateStr = day.format('YYYY-MM-DD');
      const isSunday = day.day() === 0;
      const isSaturday = day.day() === 6;
      
      if (!isSunday) {
        const dailySchedule = schedule[dateStr];
        
        // 檢查是否完全沒有排班
        if (!dailySchedule) {
          issues.push({
            date: dateStr,
            type: 'no_assignment',
            description: '尚未排班',
            severity: 'high'
          });
        } else {
          // 檢查週六人數不足
          if (isSaturday) {
            const workingFullTimers = pharmacists.filter(p => 
              p.position === '正職' && !isPharmacistOnLeave(p.id, dateStr)
            ).length;
            
            const supportPharmacists = Object.values(dailySchedule.shifts || {})
              .filter(pId => {
                const pharmacist = pharmacists.find(p => p.id === pId);
                return pharmacist?.position === '兼職';
              }).length;
            
            if (workingFullTimers + supportPharmacists < 3) {
              issues.push({
                date: dateStr,
                type: 'understaffed',
                description: `週六人數不足 (${workingFullTimers + supportPharmacists}/3)`,
                severity: 'high'
              });
            }
          }
          
          // 檢查休假衝突
          Object.entries(dailySchedule.shifts || {}).forEach(([shiftId, pharmacistId]) => {
            if (pharmacistId && isPharmacistOnLeave(pharmacistId, dateStr)) {
              const pharmacist = pharmacists.find(p => p.id === pharmacistId);
              const shift = shifts.find(s => s.id === shiftId);
              issues.push({
                date: dateStr,
                type: 'conflict',
                description: `${pharmacist?.name} 在 ${shift?.name} 但已請假`,
                severity: 'high'
              });
            }
          });
        }
      }
      
      day = day.add(1, 'day');
    }
    
    return issues;
  };

  const updateSupportNeed = (dayOfWeek: number, timeSlot: 'morning' | 'afternoon', count: number) => {
    setSupportNeeds(prev => 
        prev.map(need => 
            need.dayOfWeek === dayOfWeek && need.timeSlot === timeSlot
            ? { ...need, count: Math.max(0, count) }
            : need
        )
    );
     // When reducing count, clear orphaned support assignments
    setSchedule(prevSchedule => {
        const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
        Object.keys(newSchedule).forEach(dateStr => {
            const day = dayjs(dateStr);
            const dayNum = day.day() === 0 ? 7 : day.day(); // Use 1-7 for Mon-Sun
            
            if (dayNum === dayOfWeek) {
                const daySchedule = newSchedule[dateStr];
                if (daySchedule.support?.[timeSlot]?.length > count) {
                    daySchedule.support[timeSlot].length = count;
                }
            }
        });
        return newSchedule;
    });
  };

  const addLeave = (pharmacistId: string, date: string) => {
    if (leave.some(l => l.pharmacistId === pharmacistId && l.date === date)) return;
    setLeave(prevLeave => [...prevLeave, { id: uuidv4(), pharmacistId, date }]);
  };

  const deleteLeave = (pharmacistId: string, date: string) => {
    setLeave(leave.filter(l => !(l.pharmacistId === pharmacistId && l.date === date)));
  };
  
  const isPharmacistOnLeave = (pharmacistId: string, date: string) => {
    return leave.some(l => l.pharmacistId === pharmacistId && l.date === date);
  };

  return (
    <AppContext.Provider value={{ 
      pharmacists, addPharmacist, updatePharmacist, deletePharmacist,
      shifts, addShift, updateShift, deleteShift,
      schedule, setSchedule, assignShift,
      leave, addLeave, deleteLeave, isPharmacistOnLeave,
      supportNeeds, updateSupportNeed, assignSupport,
      updateNotes, getScheduleIssues
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
