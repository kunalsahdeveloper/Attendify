import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!searchParams.get('token')) {
      setErr('Missing token. Open the link from your email, or request a new reset from Forgot password.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match');
      return;
    }
    setLoading(true);
    const r = await api.auth.resetPassword(token, password);
    setLoading(false);
    if (r.success && (r as { data?: { user: unknown } }).data) {
      setDone(true);
      await refreshUser();
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      setErr((r as { error?: string }).error || 'Invalid or expired link');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/20">
      <div className="mx-auto max-w-md px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-xl bg-violet-600 p-2 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Set new password</h1>
          </div>
          {done ? (
            <p className="text-emerald-700">Password updated. Redirecting to the dashboard…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {err && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Attendify
        </p>
      </div>
    </div>
  );
}
