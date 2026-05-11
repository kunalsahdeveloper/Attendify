import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { Eye, EyeOff, Home, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError('');
    setLoading(true);
    const result = await api.auth.google(credentialResponse.credential, 'teacher');
    if (result.success && result.data) {
      // Pass the pre-issued token; authContext will call /auth/me to set user
      const authResult = await login('', '', result.data.token);
      if (authResult.success) {
        navigate('/dashboard');
      } else {
        setError(authResult.error || 'Could not load profile');
      }
    } else {
      setError(result.error || 'Google sign-in failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/80">
      <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
        >
          <Home className="h-4 w-4" />
          Return to home
        </Link>
        <Link to="/register" className="text-sm font-semibold text-blue-600 hover:underline">
          Create account
        </Link>
      </header>
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-gradient-to-br from-blue-700 to-indigo-900 p-16 text-white">
        <Link to="/" className="flex items-center gap-3 mb-12">
          <div className="rounded-xl bg-white/10 p-2">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight">Attendify</span>
        </Link>
        <h2 className="text-4xl font-extrabold leading-tight mb-6">
          Enterprise attendance<br />management made simple.
        </h2>
        <p className="text-lg text-blue-100 max-w-md">
          Create courses, manage rosters, upload notes, and run QR attendance sessions from
          your teacher dashboard.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 pt-24">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-blue-600 p-2 text-white shadow-lg shadow-blue-600/25">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">Attendify</span>
          </div>

          <h1 className="mb-1 text-3xl font-extrabold text-slate-900">Teacher Sign In</h1>
          <p className="mb-6 text-slate-500">
            New here?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="teacher@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google sign-in failed')}
              text="signin_with"
              shape="rectangular"
              size="large"
              width="100%"
            />
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Student?{' '}
            <a href="/app/student.apk" download className="font-semibold text-blue-600 hover:underline">
              Download the Android app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
