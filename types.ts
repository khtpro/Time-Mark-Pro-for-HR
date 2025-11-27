export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Only used for login check
  pin: string;
  birthday: string;
  role: Role;
  hourlyRate: number;
  overtimeRate: number;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  morningIn: string | null; // ISO Date string
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  overtimeIn: string | null;
  overtimeOut: string | null;
}

// New interface for the specific requirements
export interface PayrollExtras {
  userId: string;
  daysWorked: number;
  incentives: number;
  cashAdvance: number;
  lateUndertimeDeduction: number;
  transportFee: number;
  thirtyPercent: number;
  // New editable hours overrides (optional, if undefined use calculated)
  manualRegularHours?: number;
  manualOvertimeHours?: number;
}

export interface PayrollEntry {
  userId: string;
  userName: string;
  email: string;
  
  // Hours (either calculated or manual)
  totalRegularHours: number;
  totalOvertimeHours: number;
  
  regularPay: number;
  overtimePay: number;
  
  // New specific fields for display
  daysWorked: number;
  incentives: number;
  cashAdvance: number;
  lateUndertimeDeduction: number;
  transportFee: number;
  thirtyPercent: number;
  
  totalPay: number;
}