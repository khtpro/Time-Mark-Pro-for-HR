import React, { useState, useEffect } from 'react';
import { User, TimeLog } from '../types';
import { api } from '../services/api';
import { formatDate } from '../services/utils';
import { Clock, User as UserIcon, Calendar, Briefcase, LogOut, Coffee, Sun, Moon, CheckCircle } from 'lucide-react';

interface Props {
  currentUser: User;
  onLogout: () => void;
}

export const UserDashboard: React.FC<Props> = ({ currentUser, onLogout }) => {
  const [log, setLog] = useState<TimeLog | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(currentUser);
  
  // Success Popup State
  const [successPopup, setSuccessPopup] = useState<{ visible: boolean; action: string } | null>(null);
  const [countdown, setCountdown] = useState(5);

  const fetchLog = async () => {
    try {
      const todayLog = await api.getTodayLog(currentUser.id);
      setLog(todayLog);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLog();
  }, [currentUser]);

  // Countdown Logic
  useEffect(() => {
    let timer: any;
    if (successPopup && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (successPopup && countdown === 0) {
      onLogout();
    }
    return () => clearTimeout(timer);
  }, [successPopup, countdown, onLogout]);

  
  const handleClockAction = async (slot: keyof TimeLog) => {
    try {
      await api.clockAction(currentUser.id, slot);
      
      // Determine readable action name
      let actionName = '';
      switch(slot) {
          case 'morningIn': actionName = 'Morning Time In'; break;
          case 'morningOut': actionName = 'Morning Time Out'; break;
          case 'afternoonIn': actionName = 'Afternoon Time In'; break;
          case 'afternoonOut': actionName = 'Afternoon Time Out'; break;
          case 'overtimeIn': actionName = 'Overtime In'; break;
          case 'overtimeOut': actionName = 'Overtime Out'; break;
          default: actionName = 'Clocked';
      }

      await fetchLog();
      
      // Show Success Popup and reset countdown
      setCountdown(5);
      setSuccessPopup({ visible: true, action: actionName });
      
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveProfile = async () => {
    try {
        await api.saveUser(profileForm);
        setEditingProfile(false);
        setMessage({ text: 'Profile updated', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
        setMessage({ text: err.message, type: 'error' });
    }
  };

  const ClockButton = ({ label, time, onClick, disabled, colorClass, subLabel }: any) => (
    <div className="flex-1 min-w-[140px]">
        <div className="flex justify-between items-center mb-2">
            <div>
                <span className="block text-xs font-bold uppercase text-slate-500 tracking-wider">{label}</span>
                {subLabel && <span className="block text-[10px] text-slate-400">{subLabel}</span>}
            </div>
            <span className={`font-mono text-sm font-semibold ${time ? 'text-slate-900 dark:text-white' : 'text-slate-300'}`}>
                {formatDate(time) || '--:--'}
            </span>
        </div>
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`w-full h-16 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-lg ${
                disabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 shadow-none' 
                : colorClass
            }`}
        >
            {time ? 'Recorded' : label.toUpperCase()}
        </button>
    </div>
  );

  return (
    <>
        {/* Success Popup Overlay */}
        {successPopup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
                <div className="flex flex-col items-center justify-center text-center p-8 animate-scale-in">
                    {/* 300px Check Icon */}
                    <CheckCircle className="text-green-500 w-[300px] h-[300px] mb-8 drop-shadow-2xl" strokeWidth={1.5} /> 
                    
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Success!
                    </h2>
                    
                    <p className="text-xl md:text-3xl text-slate-200 max-w-4xl leading-relaxed">
                        User <span className="font-bold text-green-400">{currentUser.name}</span> has successfully <br/>
                        <span className="font-bold text-white uppercase bg-white/10 px-4 py-1 rounded-lg mt-2 inline-block">{successPopup.action}</span>
                    </p>
                    
                    <div className="mt-8 flex items-center text-slate-400 text-lg animate-pulse">
                         <LogOut className="mr-2" size={24}/> Logging out in {countdown}s...
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Tracking Section */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold mb-2">Welcome, {currentUser.name}</h1>
                <p className="opacity-90">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            </div>

            {message && (
            <div className={`p-4 rounded-lg text-center font-medium animate-fade-in ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message.text}
            </div>
            )}

            <div className="space-y-6">
                {/* Regular Shift Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                            <Sun className="w-5 h-5 mr-2 text-orange-500" /> Full Time
                        </h3>
                        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Daily Duty</span>
                    </div>
                    
                    <div className="p-6">
                        {/* 2x2 Grid Layout for Chronological Flow */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            
                            {/* 1. Morning Start */}
                            <ClockButton 
                                label="Morning Time In" 
                                subLabel="Start of Day"
                                time={log?.morningIn}
                                onClick={() => handleClockAction('morningIn')}
                                disabled={!!log?.morningIn}
                                colorClass="bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                            />

                            {/* 2. Morning End / Break Start */}
                            <ClockButton 
                                label="Break" 
                                subLabel="Morning Out"
                                time={log?.morningOut}
                                onClick={() => handleClockAction('morningOut')}
                                disabled={!log?.morningIn || !!log?.morningOut}
                                colorClass="bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
                            />

                            {/* 3. Afternoon Start / Break End */}
                            <ClockButton 
                                label="Afternoon In" 
                                subLabel="Back from Break"
                                time={log?.afternoonIn}
                                onClick={() => handleClockAction('afternoonIn')}
                                disabled={!log?.morningOut || !!log?.afternoonIn}
                                colorClass="bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20"
                            />

                            {/* 4. Afternoon End */}
                            <ClockButton 
                                label="Afternoon Out" 
                                subLabel="End of Day"
                                time={log?.afternoonOut}
                                onClick={() => handleClockAction('afternoonOut')}
                                // Enable if Afternoon In exists OR Morning In exists (for 2-punch auto-break flow)
                                disabled={(!log?.afternoonIn && !log?.morningIn) || !!log?.afternoonOut}
                                colorClass="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                            />
                        </div>
                        
                        {/* Logout Feature */}
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                        <button 
                            onClick={onLogout}
                            className="flex items-center text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 text-sm font-medium transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Exit current session"
                        >
                            <LogOut size={16} className="mr-2" /> Log Out Current User
                        </button>
                        </div>
                    </div>
                </div>

                {/* Overtime Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center">
                            <Moon className="w-5 h-5 mr-2 text-indigo-500" /> Overtime
                        </h3>
                    </div>
                    <div className="p-6 flex flex-col sm:flex-row gap-6">
                        <ClockButton 
                            label="OT Time In" 
                            time={log?.overtimeIn}
                            onClick={() => handleClockAction('overtimeIn')}
                            disabled={!!log?.overtimeIn}
                            colorClass="bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                        />
                        <ClockButton 
                            label="OT Time Out" 
                            time={log?.overtimeOut}
                            onClick={() => handleClockAction('overtimeOut')}
                            disabled={!log?.overtimeIn || !!log?.overtimeOut}
                            colorClass="bg-slate-700 hover:bg-slate-800 text-white shadow-slate-600/20"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Profile Section */}
        <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 h-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold flex items-center text-slate-900 dark:text-white"><UserIcon className="mr-2" size={20}/> My Profile</h2>
                    <button 
                        onClick={() => setEditingProfile(!editingProfile)}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        {editingProfile ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">Full Name</label>
                        {editingProfile ? (
                            <input 
                                className="w-full mt-1 px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 text-base text-slate-900 dark:text-white" 
                                value={profileForm.name} 
                                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                            />
                        ) : (
                            <p className="font-medium text-lg text-slate-900 dark:text-white">{currentUser.name}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">Birthday</label>
                        {editingProfile ? (
                            <input 
                                type="date"
                                className="w-full mt-1 px-4 py-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 text-base text-slate-900 dark:text-white" 
                                value={profileForm.birthday} 
                                onChange={(e) => setProfileForm({...profileForm, birthday: e.target.value})}
                            />
                        ) : (
                            <p className="font-medium flex items-center text-lg text-slate-900 dark:text-white"><Calendar size={16} className="mr-2 text-slate-400"/> {currentUser.birthday}</p>
                        )}
                    </div>
                    <div>
                    <label className="text-xs text-slate-500 uppercase font-bold">Hourly Rate</label>
                    <p className="font-medium flex items-center text-lg text-slate-900 dark:text-white"><Briefcase size={16} className="mr-2 text-slate-400"/> ₱{currentUser.hourlyRate}/hr</p>
                    </div>

                    {editingProfile && (
                        <button 
                            onClick={handleSaveProfile}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg mt-4 hover:bg-blue-700 font-bold"
                        >
                            Save Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
        </div>
    </>
  );
};