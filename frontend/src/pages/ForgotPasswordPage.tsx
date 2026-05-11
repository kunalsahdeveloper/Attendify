import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMessage('');
    setLoading(true);
    const r = await api.auth.forgotPassword(email);
    setLoading(false);
    if (r.success) {
      setMessage('If that email is registered, we sent a reset link. Check your inbox (and server logs in development if email is not configured).');
    } else {
      setErr(r.error || 'Request failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30">
      <div className="mx-auto max-w-md px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-xl bg-blue-600 p-2 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Reset password</h1>
          </div>
          <p className="mb-6 text-sm text-slate-600">
            Enter your account email. We will send a link to choose a new password. Works on Render if you set
            <code className="mx-1 rounded bg-slate-100 px-1.5 text-xs">SMTP_*</code> and
            <code className="mx-1 rounded bg-slate-100 px-1.5 text-xs">FRONTEND_URL</code> in the backend.
          </p>
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@school.edu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Attendify
        </p>
      </div>
    </div>
  );
}
