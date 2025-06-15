
export interface Pharmacist {
  id: string;
  name: string;
  position: '正職' | '兼職';
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  saturdayLeaveLimit: number;
}

export interface DailySchedule {
  [shiftId: string]: string | undefined; // pharmacistId
  support?: {
    morning?: (string | null)[];
    afternoon?: (string | null)[];
  };
}

export interface MonthlySchedule {
  [day: string]: DailySchedule; // day is YYYY-MM-DD
}

export interface Leave {
  id: string;
  pharmacistId: string;
  date: string; // YYYY-MM-DD
}

export interface SupportNeed {
  dayOfWeek: number; // 1-5 for Mon-Fri
  timeSlot: 'morning' | 'afternoon';
  count: number;
}
