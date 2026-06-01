import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: 'admin', password: 'Admin1234!' });

  async function submit(e) {
    e.preventDefault();
    try {
      await login(form);
      toast.success('Signed in');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-ink text-white"><LockKeyhole size={20} /></div>
          <div>
            <h1 className="text-xl font-semibold">Jahan Local Grocers</h1>
            <p className="text-sm text-slate-500">POS staff sign in</p>
          </div>
        </div>
        <label className="mb-3 block text-sm font-medium">Username
          <input className="mt-1 w-full rounded border border-line px-3 py-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </label>
        <label className="mb-4 block text-sm font-medium">Password or PIN
          <input className="mt-1 w-full rounded border border-line px-3 py-2" type="password" value={form.password || form.pin || ''} onChange={(e) => setForm(e.target.value.length <= 6 && /^\d+$/.test(e.target.value) ? { username: form.username, pin: e.target.value } : { username: form.username, password: e.target.value })} />
        </label>
        <button disabled={loading} className="w-full rounded bg-ink px-4 py-2.5 font-semibold text-white disabled:opacity-60">Sign in</button>
      </form>
    </main>
  );
}
