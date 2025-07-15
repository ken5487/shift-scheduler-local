
export interface Pharmacist {
  id: string;
  name: string;
  position: '正職' | '兼職' | 'OPD支援';
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface DailySchedule {
  [shiftId: string]: string | undefined; // pharmacistId
}

export interface MonthlySchedule {
  [day: string]: { // day is YYYY-MM-DD
    shifts: DailySchedule;
    support?: {
      morning?: (string | null)[];
      afternoon?: (string | null)[];
    };
    notes?: string; // 新增備註欄位
  }
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

export interface ScheduleIssue {
  date: string;
  type: 'understaffed' | 'conflict' | 'no_assignment';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ScheduleEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  color: string;
}
