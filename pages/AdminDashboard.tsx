import React, { useState, useEffect } from 'react';
import { User, Role, TimeLog, PayrollEntry, PayrollExtras } from '../types';
import { api } from '../services/api';
import { generateId, formatDate, downloadCSV, calculateHours } from '../services/utils';
import { Users, DollarSign, Download, Plus, Trash2, Edit2, X, Settings, Sun, Moon, Save, Calculator, Clock, ChevronRight, ArrowUpDown, Filter, AlertCircle, PieChart as PieIcon, CheckCircle2, XCircle } from 'lucide-react';

interface AdminDashboardProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ darkMode, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'payroll'>('payroll');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  
  // Log Filters & Sort
  const [logFilterEmployeeId, setLogFilterEmployeeId] = useState<string>('');
  const [logSort, setLogSort] = useState<string>('date-desc');

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Edit States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<{entry: PayrollEntry, extras: PayrollExtras} | null>(null);

  // Admin Profile
  const [adminProfile, setAdminProfile] = useState<User | null>(null);

  // Forms
  const emptyUser: User = {
    id: '', name: '', email: '', password: '', pin: '', birthday: '', role: Role.USER,
    hourlyRate: 15, overtimeRate: 22.5, createdAt: new Date().toISOString()
  };
  const [userForm, setUserForm] = useState<User>(emptyUser);

  const refreshData = async () => {
    try {
        const [allUsers, allLogs, payrollReport] = await Promise.all([
            api.getUsers(),
            api.getLogs(),
            api.calculatePayroll()
        ]);
        
        setUsers(allUsers);
        setLogs(allLogs);
        setPayrollData(payrollReport);
        
        const admin = allUsers.find(u => u.role === Role.ADMIN);
        if (admin) setAdminProfile(admin);
    } catch (error) {
        console.error("Error refreshing data:", error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- ACTIONS ---

  const handleSaveUser = async () => {
    const toSave = { ...userForm, id: userForm.id || generateId() };
    await api.saveUser(toSave);
    setShowUserModal(false);
    setUserForm(emptyUser);
    setEditingUser(null);
    refreshData();
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure?')) {
      await api.deleteUser(id);
      refreshData();
    }
  };

  const handleCreateLog = () => {
    const newLog: TimeLog = {
      id: generateId(),
      userId: '',
      date: new Date().toISOString().split('T')[0],
      morningIn: null,
      morningOut: null,
      afternoonIn: null,
      afternoonOut: null,
      overtimeIn: null,
      overtimeOut: null
    };
    setEditingLog(newLog);
    setShowLogModal(true);
  };

  const handleSaveLog = async () => {
    if (editingLog) {
      // Validate
      if (!editingLog.userId) {
        alert('Please select an employee.');
        return;
      }
      if (!editingLog.date) {
        alert('Please select a date.');
        return;
      }

      // If existing log has same ID (edit) or we are creating new
      await api.saveLog(editingLog);
      setShowLogModal(false);
      setEditingLog(null);
      refreshData();
    }
  };

  // --- PAYROLL EXTRA HANDLERS ---
  const handleEditPayroll = async (entry: PayrollEntry) => {
    const extras = await api.getPayrollExtras(entry.userId);
    
    // Init overrides if they don't exist yet, using current calculations as default for the form
    if (extras.daysWorked === 0) extras.daysWorked = entry.daysWorked;
    if (extras.manualRegularHours === undefined || extras.manualRegularHours === null) extras.manualRegularHours = entry.totalRegularHours;
    if (extras.manualOvertimeHours === undefined || extras.manualOvertimeHours === null) extras.manualOvertimeHours = entry.totalOvertimeHours;

    setEditingPayroll({ entry, extras });
    setShowPayrollModal(true);
  };

  const handleSavePayrollExtras = async () => {
    if (editingPayroll) {
        await api.savePayrollExtras(editingPayroll.extras);
        setShowPayrollModal(false);
        setEditingPayroll(null);
        refreshData();
    }
  };

  const calculateThirtyPercent = () => {
      if (!editingPayroll) return;
      // Recalculate base based on current form inputs
      const ex = editingPayroll.extras;
      const u = users.find(user => user.id === editingPayroll.entry.userId);
      if(!u) return;

      const regPay = (ex.manualRegularHours || 0) * u.hourlyRate;
      const otPay = (ex.manualOvertimeHours || 0) * u.overtimeRate;
      
      const currentBase = regPay + otPay + ex.incentives + ex.transportFee;
      
      const val = Math.floor(currentBase * 0.30);
      setEditingPayroll({
          ...editingPayroll,
          extras: { ...editingPayroll.extras, thirtyPercent: val }
      });
  };

  // --- SETTINGS ---
  const handleSaveAdminProfile = async () => {
      if (adminProfile) {
          await api.saveUser(adminProfile);
          alert('Admin profile updated!');
          refreshData();
      }
  };

  // --- UTILS ---
  const toDatetimeLocal = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
  };

  const fromDatetimeLocal = (localString: string) => localString ? new Date(localString).toISOString() : null;

  const exportXLS = () => {
    // Explicitly listing columns that make up the calculation
    const headers = ['Name', 'Days', 'Reg Hours', 'OT Hours', 'Reg Pay', 'OT Pay', 'Incentives', 'Transport', 'Cash Adv', 'Late Ded', '30%', 'Total Pay'];
    const data = payrollData.map(p => [
        p.userName,
        p.daysWorked,
        p.totalRegularHours.toFixed(2),
        p.totalOvertimeHours.toFixed(2),
        p.regularPay.toFixed(2),
        p.overtimePay.toFixed(2),
        p.incentives.toFixed(2),
        p.transportFee.toFixed(2),
        p.cashAdvance.toFixed(2),
        p.lateUndertimeDeduction.toFixed(2),
        p.thirtyPercent.toFixed(2),
        p.totalPay.toFixed(2)
    ].join(','));
    downloadCSV([headers.join(','), ...data].join('\n'), 'payroll_full_export.csv');
  };

  // --- LOGS FILTER/SORT LOGIC ---
  const getFilteredLogs = () => {
    let result = [...logs];

    // Filter
    if (logFilterEmployeeId) {
      result = result.filter(l => l.userId === logFilterEmployeeId);
    }

    // Sort
    result.sort((a, b) => {
      const getIn = (l: TimeLog) => l.morningIn || l.afternoonIn || l.overtimeIn || '';
      const getOut = (l: TimeLog) => l.overtimeOut || l.afternoonOut || l.morningOut || '';

      switch (logSort) {
        case 'date-desc': return b.date.localeCompare(a.date);
        case 'date-asc': return a.date.localeCompare(b.date);
        
        case 'in-desc': return getIn(b).localeCompare(getIn(a));
        case 'in-asc': return getIn(a).localeCompare(getIn(b));
        
        case 'out-desc': return getOut(b).localeCompare(getOut(a));
        case 'out-asc': return getOut(a).localeCompare(getOut(b));
        
        default: return 0;
      }
    });

    return result;
  };

  const filteredLogs = getFilteredLogs();

  // --- PAYROLL ANALYTICS ---
  const getPayrollStats = () => {
    const totalPayroll = payrollData.reduce((acc, curr) => acc + curr.totalPay, 0);
    const totalRegular = payrollData.reduce((acc, curr) => acc + curr.regularPay, 0);
    const totalOT = payrollData.reduce((acc, curr) => acc + curr.overtimePay, 0);
    const totalAllowances = payrollData.reduce((acc, curr) => acc + curr.incentives + curr.transportFee, 0);
    const totalDeductions = payrollData.reduce((acc, curr) => acc + curr.cashAdvance + curr.lateUndertimeDeduction + curr.thirtyPercent, 0);

    // Attendance Calculations
    const totalDaysWorked = payrollData.reduce((acc, curr) => acc + curr.daysWorked, 0);
    const totalLateIncidents = payrollData.filter(p => p.lateUndertimeDeduction > 0).length; // Using deduction count as proxy for late incidents
    
    // Estimate potential days (Max days worked by any single employee * number of employees)
    // If no one worked, default to 1 to avoid division by zero
    const maxDays = Math.max(...payrollData.map(p => p.daysWorked), 1);
    const employeeCount = payrollData.length || 1;
    const totalPotentialDays = maxDays * employeeCount;
    
    // Derived Stats
    const present = totalDaysWorked;
    const late = totalLateIncidents; // Note: 'Late' is often a subset of 'Present', but for the chart we might want them distinct or overlapping. 
                                     // For this visualization, we will treat 'Late' as a quality of presence, but the prompt asks for separate slices.
                                     // We'll treat 'Present' as 'On Time' for the chart math to sum to 100%, or just raw values.
                                     // Let's use raw values for the dominant check.
    const absent = Math.max(0, totalPotentialDays - present);
    const leave = 0; // Feature not implemented yet, but field requested

    // Determine Message
    const stats = { present, late, absent, leave };
    const dominantStat = Object.entries(stats).reduce((a, b) => a[1] >= b[1] ? a : b)[0];

    let message = "";
    let color = "";
    
    switch (dominantStat) {
        case 'leave':
            message = "Your employees seems have problems, better consult them for better understanding.";
            color = "text-orange-500";
            break;
        case 'late':
            message = "Your employees seems not interested, better to consult them and give them awareness.";
            color = "text-yellow-500";
            break;
        case 'absent':
            message = "Your company is at risk, make a total meeting and consult each of them to prevent loses.";
            color = "text-red-600";
            break;
        case 'present':
        default:
            message = "Yey your company is enjoying! Feel safe. Keep it up!";
            color = "text-green-600";
            break;
    }

    return { 
        totalPayroll, totalRegular, totalOT, totalAllowances, totalDeductions,
        attendance: { present, late, absent, leave },
        healthMessage: message,
        healthColor: color
    };
  };

  const stats = getPayrollStats();

  // Pie Chart CSS Generator
  const getPieStyle = () => {
    const total = stats.attendance.present + stats.attendance.late + stats.attendance.absent + stats.attendance.leave || 1;
    const p = (stats.attendance.present / total) * 100;
    const l = (stats.attendance.late / total) * 100;
    const a = (stats.attendance.absent / total) * 100;
    const lv = (stats.attendance.leave / total) * 100;

    // Conic gradient syntax: color start% end%, color start% end%...
    return {
        background: `conic-gradient(
            #16a34a 0% ${p}%, 
            #eab308 ${p}% ${p + l}%, 
            #dc2626 ${p + l}% ${p + l + a}%, 
            #f97316 ${p + l + a}% 100%
        )`
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Payroll & Time Management</p>
        </div>
        <div className="flex space-x-3">
            <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm"
                title="Settings"
            >
                <Settings size={22} />
            </button>
            <button 
                onClick={exportXLS} 
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-medium text-base"
            >
                <Download size={20} />
                <span>Export Report</span>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'payroll', label: 'Payroll Overview' },
            { id: 'users', label: 'Employee Directory' },
            { id: 'logs', label: 'Time Logs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-base font-medium transition-all relative whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in">
        
        {/* Payroll Tab */}
        {activeTab === 'payroll' && (
          <div className="space-y-8">
             
             {/* Greeting Message */}
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-start space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Greetings Admin,</h2>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">
                        Here's the overall calculations of the payroll. Feel free to view it.
                    </p>
                </div>
             </div>

             {/* Totals Section */}
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 {/* Hero Card: Total Payroll */}
                 <div className="lg:col-span-4 bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-2xl shadow-lg text-white flex flex-col justify-center items-center text-center">
                    <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2">Total Payroll Disbursement</p>
                    <h3 className="text-6xl font-bold tracking-tight">₱{stats.totalPayroll.toFixed(2)}</h3>
                    <p className="mt-4 text-blue-100 text-sm opacity-80">Including all allowances and deductions</p>
                 </div>

                 {/* Breakdown Cards */}
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regular Pay</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">₱{stats.totalRegular.toFixed(2)}</p>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overtime Pay</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2">₱{stats.totalOT.toFixed(2)}</p>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-green-600/70 uppercase tracking-wider">Total Allowances</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">+₱{stats.totalAllowances.toFixed(2)}</p>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-red-500/70 uppercase tracking-wider">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-500 mt-2">-₱{stats.totalDeductions.toFixed(2)}</p>
                 </div>
             </div>

             {/* Analytics Chart & Message */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 items-center">
                {/* Chart */}
                <div className="flex justify-center">
                    <div className="relative w-48 h-48 rounded-full shadow-inner" style={getPieStyle()}>
                        <div className="absolute inset-0 m-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                           <PieIcon className="text-slate-300" size={32} />
                        </div>
                    </div>
                </div>

                {/* Legend & Stats */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700 pb-2">Attendance Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">Present ({stats.attendance.present})</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">Late ({stats.attendance.late})</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">Absent ({stats.attendance.absent})</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">Leave ({stats.attendance.leave})</span>
                        </div>
                    </div>
                </div>

                {/* Health Message */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 h-full flex flex-col justify-center">
                    <div className="flex items-center mb-3">
                        <AlertCircle className={`mr-2 ${stats.healthColor}`} size={20} />
                        <span className={`font-bold uppercase text-xs tracking-wider ${stats.healthColor}`}>Admin Insight</span>
                    </div>
                    <p className={`text-lg font-medium italic ${stats.healthColor}`}>
                        "{stats.healthMessage}"
                    </p>
                </div>
             </div>

             {/* Grid Card View for Payroll (Existing) */}
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Detailed Employee Payroll</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {payrollData.map((p) => {
                        const u = users.find(usr => usr.id === p.userId);
                        const allowances = p.incentives + p.transportFee;
                        const deductions = p.cashAdvance + p.lateUndertimeDeduction + p.thirtyPercent;
                        
                        return (
                            <div key={p.userId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{p.userName}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">PIN: {u?.pin}</p>
                                    </div>
                                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                                        {p.daysWorked} Days
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Regular Pay ({p.totalRegularHours.toFixed(1)}h)</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-200">₱{p.regularPay.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Overtime Pay ({p.totalOvertimeHours.toFixed(1)}h)</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-200">₱{p.overtimePay.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-green-600">Total Allowances</span>
                                        <span className="font-medium text-green-600">+₱{allowances.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-500">Total Deductions</span>
                                        <span className="font-medium text-red-500">-₱{deductions.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Net Pay</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">₱{p.totalPay.toFixed(2)}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleEditPayroll(p)}
                                        className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-end">
                <button onClick={() => { setEditingUser(null); setUserForm(emptyUser); setShowUserModal(true); }} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Plus size={18}/> <span>Add Employee</span>
                </button>
             </div>
             <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                    <tr>
                        <th className="px-6 py-5 font-semibold text-sm uppercase tracking-wider">Name</th>
                        <th className="px-6 py-5 font-semibold text-sm uppercase tracking-wider">PIN</th>
                        <th className="px-6 py-5 font-semibold text-sm uppercase tracking-wider">Rates (Reg/OT)</th>
                        <th className="px-6 py-5 font-semibold text-right text-sm uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {users.filter(u => u.role === Role.USER).map(u => (
                        <tr key={u.id}>
                            <td className="px-6 py-5 font-medium text-base text-slate-900 dark:text-white">{u.name}</td>
                            <td className="px-6 py-5 font-mono text-base text-slate-900 dark:text-white">{u.pin}</td>
                            <td className="px-6 py-5 text-base text-slate-900 dark:text-white">₱{u.hourlyRate} / ₱{u.overtimeRate}</td>
                            <td className="px-6 py-5 text-right space-x-2">
                                <button onClick={() => { setEditingUser(u); setUserForm(u); setShowUserModal(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit2 size={20}/></button>
                                {u.role !== Role.ADMIN && <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {/* Employee Filter */}
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                                className="w-full sm:w-48 pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white appearance-none"
                                value={logFilterEmployeeId}
                                onChange={(e) => setLogFilterEmployeeId(e.target.value)}
                            >
                                <option value="">All Employees</option>
                                {users.filter(u => u.role === Role.USER).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Selector */}
                        <div className="relative">
                            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                                className="w-full sm:w-56 pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white appearance-none"
                                value={logSort}
                                onChange={(e) => setLogSort(e.target.value)}
                            >
                                <option value="date-desc">Date (Newest First)</option>
                                <option value="date-asc">Date (Oldest First)</option>
                                <option value="in-desc">Time In (Latest First)</option>
                                <option value="in-asc">Time In (Earliest First)</option>
                                <option value="out-desc">Time Out (Latest First)</option>
                                <option value="out-asc">Time Out (Earliest First)</option>
                            </select>
                        </div>
                    </div>

                    <button onClick={handleCreateLog} className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        <Plus size={18}/> <span>Add Log</span>
                    </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                    <tr>
                      <th className="px-6 py-5 font-semibold text-sm uppercase tracking-wider">Date</th>
                      <th className="px-6 py-5 font-semibold text-sm uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-5 font-semibold text-sm uppercase tracking-wider">Time In / Out</th>
                      <th className="px-6 py-5 font-semibold text-right text-sm uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredLogs.length > 0 ? (
                        filteredLogs.map(log => {
                        const u = users.find(x => x.id === log.userId);
                        return (
                            <tr key={log.id}>
                            <td className="px-6 py-5 font-mono text-base text-slate-900 dark:text-white">{log.date}</td>
                            <td className="px-6 py-5 font-medium text-base text-slate-900 dark:text-white">{u?.name || 'Unknown'}</td>
                            <td className="px-6 py-5 text-sm space-y-2 text-slate-900 dark:text-white">
                                <div className="flex justify-between w-48"><span>AM:</span> <span className="font-mono">{formatDate(log.morningIn || '')} - {formatDate(log.morningOut || '')}</span></div>
                                <div className="flex justify-between w-48"><span>PM:</span> <span className="font-mono">{formatDate(log.afternoonIn || '')} - {formatDate(log.afternoonOut || '')}</span></div>
                            </td>
                            <td className="px-6 py-5 text-right">
                                <button onClick={() => { setEditingLog(log); setShowLogModal(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit2 size={20}/></button>
                            </td>
                            </tr>
                        );
                        })
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                No logs found matching criteria.
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
            </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Payroll Manage Modal */}
      {showPayrollModal && editingPayroll && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                 <div>
                    <h3 className="font-bold text-xl text-slate-900 dark:text-white">Manage Pay: {editingPayroll.entry.userName}</h3>
                    <p className="text-sm text-slate-500 mt-1">Edit earnings and deductions for this period</p>
                 </div>
                 <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8">
                 {/* Hourly Rates & Overrides */}
                 <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Hours Override (Edit to change Base Pay)</p>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Regular Hours</label>
                            <div className="flex items-center">
                                <Clock size={18} className="text-slate-400 mr-2"/>
                                <input 
                                    type="number"
                                    className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base font-mono focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                    value={editingPayroll.extras.manualRegularHours ?? ''}
                                    placeholder={editingPayroll.entry.totalRegularHours.toFixed(2)}
                                    onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, manualRegularHours: Number(e.target.value)}})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Overtime Hours</label>
                            <div className="flex items-center">
                                <Clock size={18} className="text-slate-400 mr-2"/>
                                <input 
                                    type="number"
                                    className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base font-mono focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                    value={editingPayroll.extras.manualOvertimeHours ?? ''}
                                    placeholder={editingPayroll.entry.totalOvertimeHours.toFixed(2)}
                                    onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, manualOvertimeHours: Number(e.target.value)}})}
                                />
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* Editable Fields */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                     <div className="col-span-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-400 uppercase tracking-wider">Manual Adjustments</div>
                     
                     <div className="space-y-2">
                        <label className="text-base font-medium text-slate-700 dark:text-slate-300">Total Days Worked</label>
                        <input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                           value={editingPayroll.extras.daysWorked}
                           onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, daysWorked: Number(e.target.value)}})}
                        />
                        <p className="text-xs text-slate-400">Override calculated days count.</p>
                     </div>

                     <div className="space-y-2">
                        <label className="text-base font-medium text-green-600">Total Incentives (+)</label>
                        <input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                           value={editingPayroll.extras.incentives}
                           onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, incentives: Number(e.target.value)}})}
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-base font-medium text-green-600">Transportation Fee (+)</label>
                        <input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                           value={editingPayroll.extras.transportFee}
                           onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, transportFee: Number(e.target.value)}})}
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-base font-medium text-red-500">Cash Advance (-)</label>
                        <input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                           value={editingPayroll.extras.cashAdvance}
                           onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, cashAdvance: Number(e.target.value)}})}
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-base font-medium text-red-500">Late / Undertime (-)</label>
                        <input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                           value={editingPayroll.extras.lateUndertimeDeduction}
                           onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, lateUndertimeDeduction: Number(e.target.value)}})}
                        />
                     </div>

                     <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-base font-medium text-red-500">30% / Fund (-)</label>
                            <button onClick={calculateThirtyPercent} className="text-xs text-blue-500 hover:underline flex items-center font-bold uppercase tracking-wider"><Calculator size={14} className="mr-1"/> Auto-Calc</button>
                        </div>
                        <input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" 
                           value={editingPayroll.extras.thirtyPercent}
                           onChange={e => setEditingPayroll({...editingPayroll, extras: {...editingPayroll.extras, thirtyPercent: Number(e.target.value)}})}
                        />
                     </div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-4">
                 <button onClick={() => setShowPayrollModal(false)} className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-200 text-base font-bold transition-colors">Cancel</button>
                 <button onClick={handleSavePayrollExtras} className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-base font-bold flex items-center transition-colors">
                    <Save size={18} className="mr-2"/> Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal - (Unchanged content) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
               <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">Settings</h3>
                  <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
               </div>
               <div className="p-8 space-y-8">
                  {/* Theme */}
                  <div className="flex items-center justify-between">
                      <span className="font-medium text-lg text-slate-700 dark:text-slate-200">Dark Mode</span>
                      <button onClick={toggleTheme} className={`p-3 rounded-xl transition-colors ${darkMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                         {darkMode ? <Moon size={24}/> : <Sun size={24}/>}
                      </button>
                  </div>
                  
                  <hr className="border-slate-100 dark:border-slate-700"/>
                  
                  {/* Admin Profile */}
                  {adminProfile && (
                      <div className="space-y-5">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Profile</h4>
                          <input className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="Name" value={adminProfile.name} onChange={e => setAdminProfile({...adminProfile, name: e.target.value})} />
                          <input className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="Email" value={adminProfile.email} onChange={e => setAdminProfile({...adminProfile, email: e.target.value})} />
                          <input className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" type="password" placeholder="Password" value={adminProfile.password} onChange={e => setAdminProfile({...adminProfile, password: e.target.value})} />
                          <button onClick={handleSaveAdminProfile} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Update Profile</button>
                      </div>
                  )}
               </div>
           </div>
        </div>
      )}

      {/* User Edit Modal - (Unchanged content) */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">{editingUser ? 'Edit Employee' : 'New Employee'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="John Doe" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PIN Code</label>
                    <input className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="4 digits" maxLength={4} value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                    <select className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                        <option value={Role.USER}>User</option><option value={Role.ADMIN}>Admin</option>
                    </select>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hourly Rate</label>
                        <input type="number" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="₱" value={userForm.hourlyRate} onChange={e => setUserForm({...userForm, hourlyRate: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Overtime Rate</label>
                        <input type="number" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" placeholder="₱" value={userForm.overtimeRate} onChange={e => setUserForm({...userForm, overtimeRate: Number(e.target.value)})} />
                      </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birthday</label>
                    <input type="date" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" value={userForm.birthday} onChange={e => setUserForm({...userForm, birthday: e.target.value})} />
                  </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => setShowUserModal(false)} className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-200 text-base font-bold transition-colors">Cancel</button>
              <button onClick={handleSaveUser} className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-base font-bold transition-colors shadow-lg shadow-blue-600/20">Save Employee</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Edit Modal - (Unchanged content) */}
      {showLogModal && editingLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
             <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-xl text-slate-900 dark:text-white">
                    {users.find(u => u.id === editingLog.userId)?.name ? 'Edit Time Log' : 'Create Time Log'}
                </h3>
                <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
             </div>
             <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* User Selector if Creating New */}
                {(!editingLog.userId || !users.find(u => u.id === editingLog.userId)) && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Employee</label>
                        <select 
                            className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            value={editingLog.userId}
                            onChange={(e) => setEditingLog({...editingLog, userId: e.target.value})}
                        >
                            <option value="">-- Choose --</option>
                            {users.filter(u => u.role === Role.USER).map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                     </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                    <input type="date" className="w-full px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white" value={editingLog.date} onChange={(e) => setEditingLog({...editingLog, date: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Morning</div>
                    <input type="datetime-local" className="border rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white" value={toDatetimeLocal(editingLog.morningIn)} onChange={(e) => setEditingLog({...editingLog, morningIn: fromDatetimeLocal(e.target.value)})} />
                    <input type="datetime-local" className="border rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white" value={toDatetimeLocal(editingLog.morningOut)} onChange={(e) => setEditingLog({...editingLog, morningOut: fromDatetimeLocal(e.target.value)})} />
                    
                    <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">Afternoon</div>
                    <input type="datetime-local" className="border rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white" value={toDatetimeLocal(editingLog.afternoonIn)} onChange={(e) => setEditingLog({...editingLog, afternoonIn: fromDatetimeLocal(e.target.value)})} />
                    <input type="datetime-local" className="border rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white" value={toDatetimeLocal(editingLog.afternoonOut)} onChange={(e) => setEditingLog({...editingLog, afternoonOut: fromDatetimeLocal(e.target.value)})} />
                    
                    <div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">Overtime</div>
                    <input type="datetime-local" className="border rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white" value={toDatetimeLocal(editingLog.overtimeIn)} onChange={(e) => setEditingLog({...editingLog, overtimeIn: fromDatetimeLocal(e.target.value)})} />
                    <input type="datetime-local" className="border rounded-xl px-4 py-3 dark:bg-slate-900 dark:border-slate-600 text-base focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900 dark:text-white" value={toDatetimeLocal(editingLog.overtimeOut)} onChange={(e) => setEditingLog({...editingLog, overtimeOut: fromDatetimeLocal(e.target.value)})} />
                </div>
             </div>
             <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end space-x-4 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => setShowLogModal(false)} className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-200 text-base font-bold transition-colors">Cancel</button>
                <button onClick={handleSaveLog} className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-base font-bold transition-colors shadow-lg shadow-blue-600/20">Save</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};