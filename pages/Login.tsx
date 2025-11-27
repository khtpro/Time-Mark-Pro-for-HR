import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, Delete } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'pin' | 'email'>('pin');
  
  // Time State for Clock
  const [time, setTime] = useState(new Date());

  // PIN Mode State
  const [pin, setPin] = useState('');
  
  // Email Mode State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle PIN Logic
  useEffect(() => {
    if (mode === 'pin' && pin.length === 4) {
        handlePinSubmit(pin);
    }
  }, [pin, mode]);

  const handlePinClick = (digit: string) => {
    if (pin.length < 4) setPin(prev => prev + digit);
    setError('');
  };

  const handlePinClear = () => {
    setPin('');
    setError('');
  };

  const handlePinSubmit = async (inputPin: string) => {
      try {
        const user = await api.loginPin(inputPin);
        onLogin(user);
      } catch (err: any) {
          setError(err.message || 'Invalid PIN');
          setTimeout(() => setPin(''), 500);
      }
  };

  // Handle Email Logic
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const user = await api.loginEmail(email, password);
        onLogin(user);
    } catch (err: any) {
        setError(err.message || 'Invalid email or password');
    }
  };

  // Clock Calculations
  const secondsDegrees = (time.getSeconds() / 60) * 360;
  const minutesDegrees = ((time.getMinutes() + time.getSeconds() / 60) / 60) * 360;
  const hoursDegrees = ((time.getHours() % 12 + time.getMinutes() / 60) / 12) * 360;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel: Analog Clock & Welcome */}
        <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 relative">
             <div className="text-center mb-10 z-10">
                 <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Welcome!</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-lg">Your time now is <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
             </div>

             {/* Analog Clock UI */}
             <div className="relative w-80 h-80 rounded-full border-8 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] flex items-center justify-center">
                {/* Clock Center Dot */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full z-30 shadow-md"></div>

                {/* Numbers */}
                {[...Array(12)].map((_, i) => {
                    const num = i + 1;
                    const rotation = num * 30;
                    return (
                        <div 
                            key={num}
                            className="absolute w-full h-full text-center pt-4 font-bold text-2xl text-slate-400 dark:text-slate-500"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            <span 
                                className="inline-block" 
                                style={{ transform: `rotate(-${rotation}deg)` }}
                            >
                                {num}
                            </span>
                        </div>
                    );
                })}

                {/* Hour Hand */}
                <div 
                    className="absolute left-1/2 w-2 h-20 bg-slate-800 dark:bg-slate-200 rounded-full origin-bottom z-20"
                    style={{ 
                        bottom: '50%',
                        transform: `translateX(-50%) rotate(${hoursDegrees}deg)` 
                    }}
                />

                {/* Minute Hand */}
                <div 
                    className="absolute left-1/2 w-1.5 h-28 bg-slate-500 dark:bg-slate-400 rounded-full origin-bottom z-10"
                    style={{ 
                        bottom: '50%',
                        transform: `translateX(-50%) rotate(${minutesDegrees}deg)`
                    }}
                />

                {/* Second Hand */}
                <div 
                    className="absolute left-1/2 w-1 h-32 bg-blue-500 rounded-full origin-bottom z-20"
                    style={{ 
                        bottom: '50%',
                        transform: `translateX(-50%) rotate(${secondsDegrees}deg)`
                    }}
                />
             </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
                <span className="text-white font-bold text-3xl">T</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Time Track</h1>
            <p className="text-slate-500 mt-2 text-sm">{mode === 'pin' ? 'Enter your Employee PIN' : 'Admin Login'}</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center text-sm font-medium mb-4 animate-pulse">{error}</div>}

            {mode === 'pin' ? (
                <div className="space-y-6 max-w-xs mx-auto w-full">
                    {/* PIN Dots */}
                    <div className="flex justify-center space-x-4 mb-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div 
                                key={i} 
                                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                                    i < pin.length 
                                        ? 'bg-blue-600 scale-110' 
                                        : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <button 
                                key={n} 
                                onClick={() => handlePinClick(n.toString())}
                                className="h-16 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-2xl font-semibold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 shadow-sm"
                            >
                                {n}
                            </button>
                        ))}
                        <div className="h-16"></div>
                        <button onClick={() => handlePinClick('0')} className="h-16 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-2xl font-semibold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 shadow-sm">0</button>
                        <button onClick={handlePinClear} className="h-16 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors flex items-center justify-center active:scale-95 shadow-sm">
                            <Delete size={24} />
                        </button>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            onClick={() => { setMode('email'); setError(''); }}
                            className="w-full text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center"
                        >
                            <ShieldCheck size={16} className="mr-1" /> Switch to Admin Login
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4 max-w-sm mx-auto w-full">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                        <input 
                            type="email" 
                            required
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="admin@admin.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                        <input 
                            type="password" 
                            required
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-600/30"
                    >
                        Sign In
                    </button>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                        <button 
                            type="button"
                            onClick={() => { setMode('pin'); setError(''); }}
                            className="text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center w-full"
                        >
                            <UserIcon size={16} className="mr-1" /> Back to Employee PIN
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};