import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { authApi } from '@spiceup/api-client';
import PosTerminal from './pages/PosTerminal';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [terminalId] = useState('TERM-01');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await authApi.me();
        if (res.data && res.data.user) {
          setUser(res.data.user);
          if (res.data.user.tenant) {
            localStorage.setItem('tenantId', res.data.user.tenant);
          }
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Not authenticated, stay on lockscreen
      }
    };
    checkSession();
  }, []);

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) return;
    setErrorMsg('');
    try {
      const res = await authApi.loginPin({ pin, terminalId });
      setUser(res.data.user);
      if (res.data.user.tenant) {
        localStorage.setItem('tenantId', res.data.user.tenant);
      }
      setIsAuthenticated(true);
      setPin('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid PIN');
      setPin('');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // ignore
    }
    setUser(null);
    setIsAuthenticated(false);
    navigate('/', { replace: true });
  };

  // Lockscreen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10 flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SpiceUp</h1>
              <p className="text-xs text-slate-400">Terminal Access Control</p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-300 mb-6 tracking-wide uppercase">Enter Employee PIN</h2>

          <div className="flex space-x-4 mb-8">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border border-slate-700 transition-all duration-150 ${
                  pin.length > idx
                    ? 'bg-gradient-to-r from-brand-500 to-orange-500 shadow-md shadow-brand-500/50 scale-110 border-transparent'
                    : 'bg-slate-900'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinInput(num)}
                className="h-16 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 active:scale-95 text-xl font-bold flex items-center justify-center transition-all cursor-pointer select-none"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePinDelete}
              className="h-16 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/40 text-sm font-semibold flex items-center justify-center transition-all cursor-pointer select-none"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handlePinInput('0')}
              className="h-16 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 text-xl font-bold flex items-center justify-center transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handlePinSubmit()}
              className="h-16 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-sm font-semibold flex items-center justify-center transition-all cursor-pointer shadow-md shadow-brand-500/10 select-none"
            >
              Unlock
            </button>
          </div>

          {errorMsg && (
            <div className="w-full flex items-center space-x-2 bg-red-950/50 border border-red-500/30 p-3 rounded-lg text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<PosTerminal user={user} onLogout={handleLogout} />}
      />
      <Route
        path="/admin/*"
        element={
          user && ['admin', 'manager', 'super_admin'].includes(user.role) ? (
            <AdminPanel
              user={user}
              onLogout={handleLogout}
              isOnline={isOnline}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
