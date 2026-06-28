import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  Wifi,
  WifiOff,
  ClipboardList,
  Utensils,
  Settings,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import OrderManagement from './OrderManagement';
import MenuStudio from './MenuStudio';
import PosSettings from './PosSettings';

interface AdminPanelProps {
  user: { username: string; role: string } | null;
  onLogout: () => void;
  isOnline: boolean;
}

const tabs = [
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'menu', label: 'Menu Studio', icon: Utensils },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPanel({ user, onLogout, isOnline }: AdminPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 bg-slate-950 relative z-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to POS</span>
          </button>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Admin Panel</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Terminal Management</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-sm text-slate-300">
            <User className="w-4 h-4 text-brand-500" />
            <span className="font-semibold">{user?.username} ({user?.role})</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {isOnline ? (
              <span className="flex items-center text-emerald-400 font-medium">
                <Wifi className="w-4 h-4 mr-1" /> Online
              </span>
            ) : (
              <span className="flex items-center text-rose-400 font-medium">
                <WifiOff className="w-4 h-4 mr-1" /> Offline
              </span>
            )}
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex space-x-1 px-6 py-3 border-b border-slate-900 bg-slate-950/50 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-orange-500 border-transparent text-white shadow-md shadow-brand-500/10'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'menu' && <MenuStudio />}
        {activeTab === 'settings' && <PosSettings />}
      </div>
    </div>
  );
}
