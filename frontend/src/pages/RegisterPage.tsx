import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { Eye, EyeOff, Home, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    teacherId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      teacherId: formData.teacherId || undefined,
    });
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed');
    }
    setLoading(false);
  };

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setError('');
    setLoading(true);
    const result = await api.auth.google(credentialResponse.credential, 'teacher');
    if (result.success && result.data) {
      const authResult = await login('', '', result.data.token);
      if (authResult.success) {
        navigate('/dashboard');
      } else {
        setError(authResult.error || 'Could not load profile');
      }
    } else {
      setError(result.error || 'Google sign-up failed');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40">
      <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
        >
          <Home className="h-4 w-4" />
          Return to home
        </Link>
        <Link to="/login" className="text-sm font-semibold text-blue-600 hover:underline">
          Sign in
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
          Start managing attendance<br />in minutes.
        </h2>
        <p className="text-lg text-blue-100 max-w-md">
          Create your free teacher account to begin creating courses, running QR sessions,
          and tracking student attendance.
        </p>
      </div>

      {/* Right form */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8 pt-24">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-violet-600 p-2 text-white shadow-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">Attendify</span>
          </div>

          <h1 className="mb-1 text-3xl font-extrabold text-slate-900">Create Teacher Account</h1>
          <p className="mb-8 text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Google sign-up first */}
          <div className="mb-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google sign-up failed')}
              text="signup_with"
              shape="rectangular"
              size="large"
              width="100%"
            />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">OR REGISTER WITH EMAIL</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teacher ID (optional)</label>
              <input
                type="text"
                name="teacherId"
                value={formData.teacherId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="T-12345"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-11 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
