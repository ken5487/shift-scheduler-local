
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
}

export interface MonthlySchedule {
  [day: string]: DailySchedule; // day is YYYY-MM-DD
}

export interface Leave {
  id: string;
  pharmacistId: string;
  date: string; // YYYY-MM-DD
}

