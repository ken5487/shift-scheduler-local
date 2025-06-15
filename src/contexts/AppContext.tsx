
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Pharmacist, Shift, MonthlySchedule } from '@/lib/types';
import dayjs from 'dayjs';

// --- 預設範例資料 ---
const defaultPharmacists: Pharmacist[] = [
  { id: uuidv4(), name: '王藥師', position: '正職' },
  { id: uuidv4(), name: '李藥師', position: '正職' },
  { id: uuidv4(), name: '陳藥師', position: '兼職' },
];

const defaultShifts: Shift[] = [
  { id: uuidv4(), name: '早班', startTime: '08:00', endTime: '16:00' },
  { id: uuidv4(), name: '中班', startTime: '14:00', endTime: '22:00' },
  { id: uuidv4(), name: '夜班', startTime: '22:00', endTime: '08:00' },
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [schedule, setSchedule] = useState<MonthlySchedule>({});

  useEffect(() => {
    try {
      const savedPharmacists = localStorage.getItem('pharmacists');
      const savedShifts = localStorage.getItem('shifts');
      const savedSchedule = localStorage.getItem('schedule');

      setPharmacists(savedPharmacists ? JSON.parse(savedPharmacists) : defaultPharmacists);
      setShifts(savedShifts ? JSON.parse(savedShifts) : defaultShifts);
      setSchedule(savedSchedule ? JSON.parse(savedSchedule) : {});
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      setPharmacists(defaultPharmacists);
      setShifts(defaultShifts);
      setSchedule({});
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('pharmacists', JSON.stringify(pharmacists));
        localStorage.setItem('shifts', JSON.stringify(shifts));
        localStorage.setItem('schedule', JSON.stringify(schedule));
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, [pharmacists, shifts, schedule]);

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

  return (
    <AppContext.Provider value={{ 
      pharmacists, addPharmacist, updatePharmacist, deletePharmacist,
      shifts, addShift, updateShift, deleteShift,
      schedule, setSchedule, assignShift
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
