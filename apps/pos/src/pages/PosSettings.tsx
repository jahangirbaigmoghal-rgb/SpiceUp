import { useState, useEffect } from 'react';
import {
  Mic,
  AlertCircle,
  Save,
  RefreshCw,
  Phone,
  BrainCircuit,
  CheckCircle2,
} from 'lucide-react';
import { settingsApi } from '@spiceup/api-client';

export default function PosSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceGreeting, setVoiceGreeting] = useState('');
  const [voiceHandoffPhone, setVoiceHandoffPhone] = useState('');
  const [voiceRecordCalls, setVoiceRecordCalls] = useState(true);
  const [voiceTestMode, setVoiceTestMode] = useState(false);
  const [voiceBargeIn, setVoiceBargeIn] = useState(true);
  const [voiceModel, setVoiceModel] = useState('gemini-3.1-flash-live-preview');

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await settingsApi.get();
      const s = res.data.settings || {};
      setVoiceEnabled(!!s.voiceAgentEnabled);
      setVoiceGreeting(s.voiceAgentGreeting || '');
      setVoiceHandoffPhone(s.voiceAgentHandoffPhone || '');
      setVoiceRecordCalls(s.voiceAgentRecordCalls !== false);
      setVoiceTestMode(!!s.voiceAgentTestMode);
      setVoiceBargeIn(s.voiceAgentBargeInEnabled !== false);
      setVoiceModel(s.voiceAgentModel || 'gemini-3.1-flash-live-preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await settingsApi.update({
        voiceAgentEnabled: voiceEnabled,
        voiceAgentGreeting: voiceGreeting,
        voiceAgentHandoffPhone: voiceHandoffPhone,
        voiceAgentRecordCalls: voiceRecordCalls,
        voiceAgentTestMode: voiceTestMode,
        voiceAgentBargeInEnabled: voiceBargeIn,
        voiceAgentModel: voiceModel,
      });
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage AI Voice Agent and terminal preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {success && (
          <div className="flex items-center space-x-2 bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center space-x-2 bg-red-950/30 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Voice Agent Card */}
        <div className={`rounded-2xl border transition-all duration-300 ${
          voiceEnabled
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-slate-900/50 to-emerald-500/5'
            : 'border-slate-800 bg-slate-900/30'
        }`}>
          <div className="p-6 flex items-start justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300 ${
                  voiceEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Mic className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">AI Voice Assistant</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`h-2 w-2 rounded-full ${voiceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${voiceEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {voiceEnabled ? 'Online & Listening' : 'Offline / Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                When activated, the AI agent answers incoming calls, greets customers, processes delivery or collection orders, calculates pricing, and pushes orders directly to your POS screen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none ${
                voiceEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${
                voiceEnabled ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Agent Configuration */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 space-y-6">
          <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">Agent Customization</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Welcome Greeting</label>
              <textarea
                value={voiceGreeting}
                onChange={(e) => setVoiceGreeting(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 outline-none min-h-[80px] resize-none"
                placeholder="E.g., Thanks for calling. I can help with collection or delivery orders."
              />
              <p className="text-[10px] text-slate-500">First sentence spoken by the AI when a customer calls.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Handoff Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  value={voiceHandoffPhone}
                  onChange={(e) => setVoiceHandoffPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-brand-500 outline-none"
                  placeholder="E.g., 01782 811112"
                />
              </div>
              <p className="text-[10px] text-slate-500">Redirect calls to this number when customer asks for staff.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-950/60 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-200">Record Calls</span>
                <p className="text-[10px] text-slate-500">Save audio for quality review</p>
              </div>
              <input
                type="checkbox"
                checked={voiceRecordCalls}
                onChange={(e) => setVoiceRecordCalls(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-950/60 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-200">Barge-In</span>
                <p className="text-[10px] text-slate-500">Allow customer interruptions</p>
              </div>
              <input
                type="checkbox"
                checked={voiceBargeIn}
                onChange={(e) => setVoiceBargeIn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-950/60 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-slate-200">Test Mode</span>
                <p className="text-[10px] text-slate-500">Simulate without real orders</p>
              </div>
              <input
                type="checkbox"
                checked={voiceTestMode}
                onChange={(e) => setVoiceTestMode(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Model</label>
            <div className="relative">
              <BrainCircuit className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <select
                value={voiceModel}
                onChange={(e) => setVoiceModel(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:border-brand-500 outline-none appearance-none"
              >
                <option value="gemini-3.1-flash-live-preview">gemini-3.1-flash-live-preview (Low Latency)</option>
                <option value="gemini-2.0-flash-live-001">gemini-2.0-flash-live-001</option>
                <option value="gemini-live-2.5-flash-preview">gemini-live-2.5-flash-preview</option>
                <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Select the underlying Gemini model for voice operations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
