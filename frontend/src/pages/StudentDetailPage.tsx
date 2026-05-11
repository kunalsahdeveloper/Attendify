import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import type { Attendance, Class, User } from '@/types';
import { ArrowLeft, BookOpen, Calendar, User as UserIcon } from 'lucide-react';
import TeacherLayout from '@/components/TeacherLayout';

const getGoogleMapsLink = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [u, setU] = useState<User | null>(null);
  const [enrollments, setEnrollments] = useState<Class[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [loadAtt, setLoadAtt] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const r = await api.users.getStudent(id);
    if (r.success && r.data) {
      setU(r.data.user);
      setEnrollments(r.data.enrollments || []);
    } else {
      setErr(r.error || 'Not found');
    }
  }, [id]);

  const loadA = useCallback(async () => {
    if (!id) return;
    setLoadAtt(true);
    const r = await api.users.getStudentAttendance(id, classFilter || undefined);
    if (r.success && r.data) setAtt(r.data.attendance);
    setLoadAtt(false);
  }, [id, classFilter]);

  useEffect(() => {
    if (!authLoading && !me) navigate('/login');
  }, [me, authLoading, navigate]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  useEffect(() => {
    if (id) void loadA();
  }, [id, classFilter, loadA]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <TeacherLayout>
      <div className="flex-1 px-8 py-8">
        <Link
          to="/students"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          All students
        </Link>
        {err && <p className="text-red-600">{err}</p>}
        {u && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              {u.profilePhoto ? (
                <img src={u.profilePhoto} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-slate-100" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-extrabold text-blue-800">
                  {u.firstName?.charAt(0)}
                  {u.lastName?.charAt(0) || '•'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {u.firstName} {u.lastName}
                </h1>
                <p className="flex items-center gap-2 text-slate-500">
                  <UserIcon className="h-4 w-4" />
                  {u.email}
                </p>
                {u.studentId && <p className="text-sm text-slate-400">Student ID: {u.studentId}</p>}
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <BookOpen className="h-4 w-4" />
                Enrollments
              </h2>
              {enrollments.length === 0 ? (
                <p className="text-sm text-slate-500">No course enrollments.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-600">
                  {enrollments.map((c) => (
                    <li key={c._id}>
                      {c.name} <span className="text-slate-400">({c.code})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="flex items-center gap-2 font-extrabold text-slate-900">
                  <Calendar className="h-4 w-4" />
                  Attendance (your courses)
                </h2>
                <p className="text-xs text-slate-500">Only sessions for courses you teach and this student is in.</p>
                <div className="mt-2 max-w-xs">
                  <label className="text-xs font-semibold text-slate-600">Filter by class</label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">All your classes with this student</option>
                    {enrollments.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {loadAtt ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : att.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No attendance records in your courses yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Class</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {att.map((a) => (
                        <tr key={a._id}>
                          <td className="px-4 py-2 text-slate-700">
                            {a.scannedAt ? new Date(a.scannedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2">
                            {typeof a.class === 'object' && a.class
                              ? `${(a.class as Class).name} (${(a.class as Class).code})`
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                            {a.location?.latitude != null && a.location?.longitude != null ? (
                              <div className="space-y-1">
                                <p>{a.location.latitude.toFixed(5)}, {a.location.longitude.toFixed(5)}</p>
                                <a
                                  href={getGoogleMapsLink(a.location.latitude, a.location.longitude)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  Open in Google Maps
                                </a>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                a.status === 'present'
                                  ? 'text-emerald-600'
                                  : a.status === 'late'
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                              }
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
