import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { BookOpen, Camera, CheckCircle, LogOut, Mail, Shield, User } from 'lucide-react';
import TeacherLayout from '@/components/TeacherLayout';

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setStudentId(user.studentId || '');
    }
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setOk('');
    setSaving(true);
    const r = await api.auth.updateMe({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      studentId: user?.role === 'student' ? studentId.trim() : undefined,
    });
    setSaving(false);
    if (r.success) {
      setOk('Changes saved');
      await refreshUser();
    } else {
      setErr(r.error || 'Failed to save');
    }
  };

  const onPhoto = async (f: File) => {
    setErr('');
    setOk('');
    setUploading(true);
    const r = await api.auth.uploadProfilePhoto(f);
    setUploading(false);
    if (r.success) {
      setOk('Photo updated');
      await refreshUser();
    } else {
      setErr(r.error || 'Upload failed');
    }
  };

  const handleLogout = () => {
    logout?.();
    navigate('/login');
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  const initials = `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?';
  const roleLabel = user.role === 'teacher' ? 'Teacher' : user.role === 'admin' ? 'Admin' : 'Student';
  const roleColor = user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700';

  return (
    <TeacherLayout>
      <div className="flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Your Profile</h1>
          <p className="mt-0.5 text-slate-500">Manage your account details and profile photo.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left — Avatar card */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Banner */}
              <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="-mt-10 flex flex-col items-center px-6 pb-6">
                {/* Avatar */}
                <div className="relative">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt="profile"
                      className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white shadow-md"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-extrabold text-white ring-4 ring-white shadow-md">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    title="Change photo"
                  >
                    {uploading
                      ? <div className="h-3 w-3 animate-spin rounded-full border-b border-slate-500" />
                      : <Camera className="h-3.5 w-3.5 text-slate-600" />}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && void onPhoto(e.target.files[0])}
                />

                <h2 className="mt-3 text-lg font-extrabold text-slate-900 text-center">
                  {user.firstName} {user.lastName}
                </h2>
                <span className={`mt-1 rounded-full px-3 py-0.5 text-xs font-bold ${roleColor}`}>{roleLabel}</span>

                {/* Info rows */}
                <div className="mt-5 w-full space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.studentId && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>ID: {user.studentId}</span>
                    </div>
                  )}
                  {user.teacherId && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>Teacher ID: {user.teacherId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-slate-600">
                    <Shield className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="capitalize">{user.authProvider ?? 'local'} account</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>

            {/* Shortcut links */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Quick links</p>
              <div className="space-y-1">
                {[
                  { to: '/dashboard', label: 'Dashboard' },
                  { to: '/courses', label: 'My Courses' },
                  { to: '/session', label: 'QR Sessions' },
                  { to: '/reports', label: 'Reports' },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Edit form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-1 text-lg font-bold text-slate-900">Edit Details</h2>
            <p className="mb-6 text-sm text-slate-500">Update your display name or student ID.</p>

            {ok && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                <CheckCircle className="h-4 w-4" /> {ok}
              </div>
            )}
            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
            )}

            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  value={user.email}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
              </div>

              {user.role === 'student' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Student ID</label>
                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. STU2024001"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <CheckCircle className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>

            <div className="mt-8 rounded-xl bg-slate-50 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Profile photo</p>
              <div className="flex items-center gap-4">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="" className="h-14 w-14 rounded-xl object-cover ring-2 ring-slate-200" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-lg font-extrabold text-blue-700">{initials}</div>
                )}
                <div>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                  >
                    <Camera className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Change photo'}
                  </button>
                  <p className="mt-1.5 text-xs text-slate-400">JPEG or PNG, max 3 MB.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
