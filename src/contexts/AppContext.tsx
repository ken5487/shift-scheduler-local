import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Pharmacist, Shift, MonthlySchedule, Leave } from '@/lib/types';
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

interface AppContextType {
  pharmacists: Pharmacist[];
  addPharmacist: (pharmacist: Omit<Pharmacist, 'id'>) => void;
  updatePharmacist: (pharmacist: Pharmacist) => void;
  deletePharmacist: (id: string) => void;
  shifts: Shift[];
  addShift: (shift: Omit<Shift, 'id'>) => void;
  updateShift: (shift: Shift) => void;
  deleteShift: (id: string) => void;
  schedule: MonthlySchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthlySchedule>>;
  assignShift: (date: string, shiftId: string, pharmacistId: string) => void;
  leave: Leave[];
  addLeave: (pharmacistId: string, date: string) => void;
  deleteLeave: (pharmacistId: string, date: string) => void;
  isPharmacistOnLeave: (pharmacistId: string, date: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedule, setSchedule] = useState<MonthlySchedule>({});
  const [leave, setLeave] = useState<Leave[]>([]);

  useEffect(() => {
    try {
      const savedPharmacists = localStorage.getItem('pharmacists');
      const savedShifts = localStorage.getItem('shifts');
      const savedSchedule = localStorage.getItem('schedule');
      const savedLeave = localStorage.getItem('leave');

      setPharmacists(savedPharmacists ? JSON.parse(savedPharmacists) : defaultPharmacists);
      setShifts(savedShifts ? JSON.parse(savedShifts) : defaultShifts);
      setSchedule(savedSchedule ? JSON.parse(savedSchedule) : {});
      setLeave(savedLeave ? JSON.parse(savedLeave) : []);
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setPharmacists(defaultPharmacists);
      setShifts(defaultShifts);
      setSchedule({});
      setLeave([]);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('pharmacists', JSON.stringify(pharmacists));
        localStorage.setItem('shifts', JSON.stringify(shifts));
        localStorage.setItem('schedule', JSON.stringify(schedule));
        localStorage.setItem('leave', JSON.stringify(leave));
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, [pharmacists, shifts, schedule, leave]);

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

  const updateShift = (updatedShift: Shift) => {
    setShifts(shifts.map(s => s.id === updatedShift.id ? updatedShift : s));
  };

  const deleteShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const assignShift = (date: string, shiftId: string, pharmacistId: string) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[date]) {
        newSchedule[date] = {};
      }
      if (pharmacistId === "unassign") {
        delete newSchedule[date][shiftId];
      } else {
        newSchedule[date][shiftId] = pharmacistId;
      }
      return newSchedule;
    });
  };

  const addLeave = (pharmacistId: string, date: string) => {
    if (leave.some(l => l.pharmacistId === pharmacistId && l.date === date)) return;
    setLeave(prevLeave => [...prevLeave, { id: uuidv4(), pharmacistId, date }]);

    // Un-assign any shifts for this pharmacist on this date
    setSchedule(prevSchedule => {
      const newSchedule = { ...prevSchedule };
      if (newSchedule[date]) {
        const dailySchedule = { ...newSchedule[date] };
        let changed = false;
        Object.keys(dailySchedule).forEach(shiftId => {
          if (dailySchedule[shiftId] === pharmacistId) {
            delete dailySchedule[shiftId];
            changed = true;
          }
        });

        if (changed) {
          if (Object.keys(dailySchedule).length === 0) {
            delete newSchedule[date];
          } else {
            newSchedule[date] = dailySchedule;
          }
        }
      }
      return newSchedule;
    });
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
      leave, addLeave, deleteLeave, isPharmacistOnLeave
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
