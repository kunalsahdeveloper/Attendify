import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import type { Class, Session } from '@/types';
import { api } from '@/lib/api';
import { ensureTimetable, formatTimetableLine } from '@/lib/classTimetable';
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  QrCode,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import TeacherLayout from '@/components/TeacherLayout';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PIE_COLORS = ['#22c55e', '#f59e0b', '#f87171'];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [attStats, setAttStats] = useState<{
    total: number;
    present: number;
    late: number;
    absent: number;
  } | null>(null);
  const [summary, setSummary] = useState<{
    studentCount?: number;
    teacherCount?: number;
    classCount?: number;
    attendanceCount?: number;
    myCourseCount?: number;
    uniqueStudentsInMyCourses?: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const extra =
        user.role === 'teacher' || user.role === 'admin'
          ? [api.users.getDashboardSummary()]
          : [];
      const [classesRes, sessionsRes, stRes, ...sumArr] = await Promise.all([
        api.classes.getAll(),
        api.sessions.getActive(),
        api.attendance.getStats(),
        ...extra,
      ]);
      if (classesRes.success && classesRes.data) setClasses(classesRes.data.classes);
      if (sessionsRes.success && sessionsRes.data) {
        setActiveSession(sessionsRes.data.sessions.find((s) => s.status === 'active') ?? null);
      }
      if (stRes.success && stRes.data && 'stats' in stRes.data) {
        setAttStats(stRes.data.stats as { total: number; present: number; late: number; absent: number });
      }
      const sumRes = sumArr[0];
      if (sumRes && sumRes.success && sumRes.data) {
        setSummary(sumRes.data as typeof summary);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const isAdmin = user?.role === 'admin';

  const totalStudents = classes.reduce((s, c) => s + (c.students?.length ?? 0), 0);

  const pieData = useMemo(() => {
    if (!attStats) return [];
    return [
      { name: 'Present', value: attStats.present },
      { name: 'Late', value: attStats.late },
      { name: 'Absent', value: attStats.absent },
    ].filter((d) => d.value > 0);
  }, [attStats]);

  const adminBarData = useMemo(
    () =>
      summary
        ? [
            { name: 'Students', value: summary.studentCount ?? 0 },
            { name: 'Teachers', value: summary.teacherCount ?? 0 },
            { name: 'Courses', value: summary.classCount ?? 0 },
            { name: 'Records', value: summary.attendanceCount ?? 0 },
          ]
        : [],
    [summary]
  );

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Courses', value: isAdmin ? (summary?.classCount ?? '—') : classes.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    {
      label: isAdmin ? 'Total students' : 'Seats (your courses)',
      value: isAdmin ? (summary?.studentCount ?? '—') : totalStudents,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Active session',
      value: activeSession ? 'Live' : '—',
      icon: QrCode,
      color: activeSession ? 'text-green-600' : 'text-slate-400',
      bg: activeSession ? 'bg-green-50' : 'bg-slate-50',
    },
    { label: 'Reports', value: 'Open', icon: BarChart2, color: 'text-orange-600', bg: 'bg-orange-50', link: '/reports' },
  ];

  return (
    <TeacherLayout>
      <div className="flex-1 px-6 py-8 sm:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
            {user?.firstName}!
            {isAdmin && (
              <span className="ml-2 rounded-lg bg-amber-100 px-2 py-0.5 text-sm font-extrabold text-amber-800">
                Admin
              </span>
            )}
          </h1>
          <p className="mt-1 text-slate-500">
            {isAdmin
              ? 'Institution-wide usage and attendance mix.'
              : "Here's an overview of your teaching activity."}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              onClick={() => s.link && navigate(s.link)}
              className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${
                s.link ? 'cursor-pointer transition-shadow hover:shadow-md' : ''
              }`}
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wider text-slate-400">Attendance mix</h2>
            <p className="mb-4 text-xs text-slate-500">
              {isAdmin ? 'All recorded attendance' : 'Across your own courses only'}
            </p>
            {pieData.length === 0 || !attStats ? (
              <p className="py-8 text-center text-sm text-slate-400">No data yet. Start a session to collect attendance.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={pieData} innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={String(i)} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wider text-slate-400">
              {isAdmin ? 'Institution scale' : 'My footprint'}
            </h2>
            {isAdmin && adminBarData.length > 0 ? (
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adminBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : !isAdmin && summary ? (
              <div className="flex h-64 flex-col justify-center gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">My courses</p>
                  <p className="text-2xl font-extrabold text-slate-900">{summary.myCourseCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Unique students in your courses</p>
                  <p className="text-2xl font-extrabold text-slate-900">{summary.uniqueStudentsInMyCourses ?? 0}</p>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Loading summary…</p>
            )}
          </div>
        </div>

        {activeSession && (
          <div className="mb-8 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 animate-pulse rounded-full bg-emerald-500 shadow-sm shadow-emerald-400" />
              <div>
                <p className="font-bold text-emerald-900">Live — {activeSession.class?.name}</p>
                <p className="text-sm text-emerald-800">
                  {activeSession.attendanceCount?.present ?? 0} / {activeSession.attendanceCount?.total ?? 0} checked
                  in
                </p>
              </div>
            </div>
            <Link
              to="/session"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <QrCode className="h-4 w-4" />
              Open QR session
            </Link>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/courses"
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            <div className="rounded-xl bg-blue-100 p-3 transition group-hover:bg-blue-600 group-hover:text-white">
              <BookOpen className="h-5 w-5 text-blue-600 group-hover:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">Courses</p>
              <p className="text-sm text-slate-500">Rosters, materials, filters</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-500" />
          </Link>
          <Link
            to="/session"
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <div className="rounded-xl bg-emerald-100 p-3 transition group-hover:bg-emerald-600 group-hover:text-white">
              <QrCode className="h-5 w-5 text-emerald-600 group-hover:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">QR attendance</p>
              <p className="text-sm text-slate-500">Start or end a session</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-500" />
          </Link>
          <Link
            to="/reports"
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
          >
            <div className="rounded-xl bg-orange-100 p-3 transition group-hover:bg-orange-600 group-hover:text-white">
              <BarChart2 className="h-5 w-5 text-orange-600 group-hover:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">Reports</p>
              <p className="text-sm text-slate-500">Per-student analytics</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-orange-500" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">Your courses (latest)</h2>
            <Link to="/courses" className="text-sm font-semibold text-blue-600 hover:underline">
              All courses
            </Link>
          </div>
          {classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <BookOpen className="mb-4 h-12 w-12 text-slate-200" />
              <p className="mb-3 font-semibold text-slate-500">No courses yet</p>
              <Link
                to="/courses"
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Create a course
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {classes.slice(0, 5).map((cls) => (
                <div key={cls._id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                    {cls.code.slice(0, 4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{cls.name}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {ensureTimetable(cls).map((s) => formatTimetableLine(s, DAYS)).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="h-4 w-4" />
                    {cls.students?.length ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
