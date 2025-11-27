import { User, TimeLog, PayrollEntry, PayrollExtras } from '../types';

const API_URL = 'http://localhost:3001/api';

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(`${API_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'API Error');
  }
  return res.json();
};

export const api = {
  // Users
  getUsers: (): Promise<User[]> => fetchJson('/users'),
  saveUser: (user: User) => fetchJson('/users', { method: 'POST', body: JSON.stringify(user) }),
  deleteUser: (id: string) => fetchJson(`/users/${id}`, { method: 'DELETE' }),

  // Auth
  loginPin: (pin: string): Promise<User> => fetchJson('/login/pin', { method: 'POST', body: JSON.stringify({ pin }) }),
  loginEmail: (email: string, pass: string): Promise<User> => fetchJson('/login/email', { method: 'POST', body: JSON.stringify({ email, password: pass }) }),

  // Logs
  getLogs: (): Promise<TimeLog[]> => fetchJson('/logs'),
  saveLog: (log: TimeLog) => fetchJson('/logs', { method: 'POST', body: JSON.stringify(log) }),
  getTodayLog: (userId: string): Promise<TimeLog> => fetchJson(`/logs/today/${userId}`),
  clockAction: (userId: string, slot: string) => fetchJson('/clock', { method: 'POST', body: JSON.stringify({ userId, slot }) }),

  // Payroll
  getPayrollExtras: (userId: string): Promise<PayrollExtras> => fetchJson(`/payroll/extras/${userId}`),
  savePayrollExtras: (extras: PayrollExtras) => fetchJson('/payroll/extras', { method: 'POST', body: JSON.stringify(extras) }),
  calculatePayroll: (): Promise<PayrollEntry[]> => fetchJson('/payroll/report'),
};