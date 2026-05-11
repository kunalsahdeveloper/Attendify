import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import type { Attendance, AttendanceListEntry, Class, Session } from '@/types';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { BarChart2, CheckCircle, Clock, Edit2, Eye, Search, Users, X, XCircle } from 'lucide-react';
import TeacherLayout from '@/components/TeacherLayout';

type PageTab = 'summary' | 'sessions';

const STATUS_OPTIONS = ['present', 'late', 'absent'] as const;

const STATUS_CONFIG = {
  present: { label: 'Present', color: '#22c55e', bg: 'bg-green-100 text-green-700' },
  late: { label: 'Late', color: '#f59e0b', bg: 'bg-yellow-100 text-yellow-700' },
  absent: { label: 'Absent', color: '#ef4444', bg: 'bg-red-100 text-red-700' },
  pending: { label: 'Not yet', color: '#94a3b8', bg: 'bg-slate-100 text-slate-500' },
};

const getGoogleMapsLink = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;

function AttendanceRateBadge({ rate }: { rate: number }) {
  const color = rate >= 75 ? 'text-green-600 bg-green-50' : rate >= 60 ? 'text-orange-500 bg-orange-50' : 'text-red-600 bg-red-50';
  return <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${color}`}>{rate.toFixed(1)}%</span>;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [pageTab, setPageTab] = useState<PageTab>('summary');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [sessionSearch, setSessionSearch] = useState('');
  const [viewSessionId, setViewSessionId] = useState<string | null>(null);
  const [viewAttLoading, setViewAttLoading] = useState(false);
  const [viewAttendance, setViewAttendance] = useState<AttendanceListEntry[]>([]);
  const [viewSessionMeta, setViewSessionMeta] = useState<Session | null>(null);

  const loadClasses = useCallback(async () => {
    const res = await api.classes.getAll();
    if (res.success && res.data) setClasses(res.data.classes);
    setInitLoading(false);
  }, []);

  useEffect(() => { if (!authLoading && !user) navigate('/login'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) void loadClasses(); }, [user, loadClasses]);

  const loadAttendance = async (classId: string) => {
    setLoading(true);
    const res = await api.attendance.getClassAttendance(classId);
    if (res.success && res.data) setAttendance(res.data.attendance);
    setLoading(false);
  };

  const loadSessions = async (classId: string) => {
    setSessionsLoading(true);
    const res = await api.sessions.list(classId, 1, 200);
    if (res.success && res.data) setSessions(res.data.sessions);
    setSessionsLoading(false);
  };

  const closeViewSession = () => {
    setViewSessionId(null);
    setViewAttendance([]);
    setViewSessionMeta(null);
  };

  const openViewSession = async (sessionId: string) => {
    setViewSessionId(sessionId);
    setViewAttLoading(true);
    setViewAttendance([]);
    const s = sessions.find((x) => x._id === sessionId) ?? null;
    setViewSessionMeta(s);
    const res = await api.sessions.getAttendance(sessionId);
    if (res.success && res.data) {
      setViewAttendance(res.data.attendanceList);
      if (res.data.session) setViewSessionMeta(res.data.session as Session);
    }
    setViewAttLoading(false);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setAttendance([]);
    setSessions([]);
    setSessionSearch('');
    closeViewSession();
    if (classId) {
      void loadAttendance(classId);
      void loadSessions(classId);
    }
  };

  const handleStatusChange = async (entry: AttendanceListEntry, newStatus: 'present' | 'late' | 'absent', sessionId: string) => {
    if (!sessionId) return;
    setEditingId(entry.student._id);
    if (entry.attendanceId) {
      await api.attendance.update(entry.attendanceId, newStatus);
    } else {
      await api.attendance.createManual(sessionId, entry.student._id, newStatus);
    }
    const res = await api.sessions.getAttendance(sessionId);
    if (res.success && res.data && sessionId === viewSessionId) {
      setViewAttendance(res.data.attendanceList);
      const s = res.data.session as Session | undefined;
      if (s) {
        setViewSessionMeta(s);
        setSessions((prev) => prev.map((row) => (row._id === sessionId ? { ...row, ...s } : row)));
      }
    }
    if (selectedClass) {
      await Promise.all([loadAttendance(selectedClass), loadSessions(selectedClass)]);
    }
    setEditingId(null);
  };

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const started = s.startedAt ? new Date(s.startedAt).toLocaleString() : '';
      return (
        (s.sessionType ?? '').toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        started.toLowerCase().includes(q) ||
        s._id.toLowerCase().includes(q)
      );
    });
  }, [sessions, sessionSearch]);

  // Aggregate per student for summary tab
  type StudentStat = { studentId: string; name: string; email: string; present: number; late: number; absent: number; total: number };
  const studentMap: Record<string, StudentStat> = {};
  for (const rec of attendance) {
    const sid = typeof rec.student === 'object' ? rec.student._id : String(rec.student);
    if (!studentMap[sid]) {
      const s = typeof rec.student === 'object' ? rec.student : { _id: sid, firstName: '', lastName: '', email: '' };
      studentMap[sid] = { studentId: sid, name: `${s.firstName} ${s.lastName}`.trim() || sid, email: s.email ?? '', present: 0, late: 0, absent: 0, total: 0 };
    }
    studentMap[sid][rec.status as 'present' | 'late' | 'absent'] += 1;
    studentMap[sid].total += 1;
  }
  const studentStats = Object.values(studentMap).sort((a, b) => a.name.localeCompare(b.name));

  const barData = studentStats.map((s) => ({ name: s.name.split(' ')[0], present: s.present, late: s.late, absent: s.absent }));
  const overallPresent = studentStats.reduce((acc, s) => acc + s.present + s.late, 0);
  const overallAbsent = studentStats.reduce((acc, s) => acc + s.absent, 0);
  const pieData = [
    { name: 'Present/Late', value: overallPresent, fill: '#22c55e' },
    { name: 'Absent', value: overallAbsent, fill: '#ef4444' },
  ];

  if (authLoading || initLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <TeacherLayout>
      <div className="flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Attendance Reports</h1>
          <p className="mt-0.5 text-slate-500">Per-student summaries, charts, and session-level manual edits.</p>
        </div>

        {/* Course picker */}
        <div className="mb-6 max-w-sm">
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select Course</label>
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Choose a course…</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>{cls.name} ({cls.code})</option>
            ))}
          </select>
        </div>

        {!selectedClass && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20">
            <BarChart2 className="mb-4 h-14 w-14 text-slate-200" />
            <p className="font-semibold text-slate-500">Select a course to view its attendance report.</p>
          </div>
        )}

        {selectedClass && (
          <>
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
              {(['summary', 'sessions'] as PageTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setPageTab(t)}
                  className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition ${pageTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t === 'summary' ? 'Student Summary' : 'Session History'}
                </button>
              ))}
            </div>

            {/* ── SUMMARY TAB ── */}
            {pageTab === 'summary' && (
              <>
                {loading ? (
                  <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" /></div>
                ) : studentStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
                    <Users className="mb-4 h-14 w-14 text-slate-200" />
                    <p className="font-semibold text-slate-500">No attendance records yet for this course.</p>
                  </div>
                ) : (
                  <>
                    {/* Chart toggle + charts */}
                    <div className="mb-5 flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600">Chart:</span>
                      {(['bar', 'pie'] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => setChartType(c)}
                          className={`rounded-lg px-3 py-1 text-xs font-bold capitalize ${chartType === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {c} chart
                        </button>
                      ))}
                    </div>

                    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      {chartType === 'bar' ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                              {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Pie>
                            <Legend />
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Student table */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-slate-100 bg-slate-50">
                          <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-3 text-left">Student</th>
                            <th className="px-4 py-3 text-center">Present</th>
                            <th className="px-4 py-3 text-center">Late</th>
                            <th className="px-4 py-3 text-center">Absent</th>
                            <th className="px-4 py-3 text-center">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentStats.map((s) => {
                            const rate = s.total > 0 ? ((s.present + s.late) / s.total) * 100 : 0;
                            return (
                              <tr key={s.studentId} className="hover:bg-slate-50">
                                <td className="px-6 py-3">
                                  <p className="font-semibold text-slate-900">{s.name}</p>
                                  <p className="text-xs text-slate-400">{s.email}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 font-semibold text-green-600">
                                    <CheckCircle className="h-3.5 w-3.5" />{s.present}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 font-semibold text-orange-500">
                                    <Clock className="h-3.5 w-3.5" />{s.late}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 font-semibold text-red-500">
                                    <XCircle className="h-3.5 w-3.5" />{s.absent}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <AttendanceRateBadge rate={rate} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── SESSION HISTORY TAB ── */}
            {pageTab === 'sessions' && (
              <>
                {sessionsLoading ? (
                  <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" /></div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
                    <Clock className="mb-4 h-14 w-14 text-slate-200" />
                    <p className="font-semibold text-slate-500">No sessions found for this course.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="w-full max-w-md">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search session history</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="search"
                            value={sessionSearch}
                            onChange={(e) => setSessionSearch(e.target.value)}
                            placeholder="Date, type, status, or ID…"
                            className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <p className="shrink-0 text-sm text-slate-500">
                        Showing {filteredSessions.length} of {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
                        <h3 className="text-sm font-bold text-slate-800">All sessions</h3>
                        <p className="text-xs text-slate-500">Click View to see attendees and rectify status.</p>
                      </div>
                      <div className="max-h-[min(480px,70vh)] overflow-x-auto overflow-y-auto">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead className="sticky top-0 border-b border-slate-200 bg-white">
                            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 sm:px-5">Date & time</th>
                              <th className="px-2 py-3">Type</th>
                              <th className="px-2 py-3">Status</th>
                              <th className="px-2 py-3 text-center">P / A / Total</th>
                              <th className="px-4 py-3 text-right sm:px-5">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredSessions.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                                  No sessions match your search.
                                </td>
                              </tr>
                            ) : (
                              filteredSessions.map((s) => {
                                const started = s.startedAt ? new Date(s.startedAt) : null;
                                const c = s.attendanceCount;
                                return (
                                  <tr key={s._id} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3 sm:px-5">
                                      <p className="font-medium text-slate-900">
                                        {started?.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {started?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </td>
                                    <td className="px-2 py-3 text-slate-700">{s.sessionType ?? 'regular'}</td>
                                    <td className="px-2 py-3">
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                                        {s.status}
                                      </span>
                                    </td>
                                    <td className="px-2 py-3 text-center text-xs tabular-nums text-slate-600">
                                      {c?.present ?? 0} / {c?.absent ?? 0} / {c?.total ?? 0}
                                    </td>
                                    <td className="px-4 py-3 text-right sm:px-5">
                                      <button
                                        type="button"
                                        onClick={() => void openViewSession(s._id)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {viewSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Session attendance</h2>
                {viewSessionMeta && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>
                      <strong>Started:</strong>{' '}
                      {viewSessionMeta.startedAt
                        ? new Date(viewSessionMeta.startedAt).toLocaleString()
                        : '—'}
                    </span>
                    <span>
                      <strong>Type:</strong> {viewSessionMeta.sessionType ?? 'regular'}
                    </span>
                    <span>
                      <strong>Status:</strong> {viewSessionMeta.status}
                    </span>
                    {viewSessionMeta.scheduleNote && (
                      <span>
                        <strong>Note:</strong> {viewSessionMeta.scheduleNote}
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Edit2 className="h-3 w-3" /> Rectify: change a student&apos;s status below.
                </p>
              </div>
              <button
                type="button"
                onClick={closeViewSession}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[min(520px,65vh)] overflow-y-auto">
              {viewAttLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                </div>
              ) : viewAttendance.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500">
                  <Users className="mb-3 h-12 w-12 text-slate-200" />
                  <p className="text-sm">No students on file for this class.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-4 py-3 text-center">Scanned at</th>
                      <th className="px-4 py-3 text-center">Location</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewAttendance
                      .slice()
                      .sort((a, b) =>
                        `${a.student.firstName} ${a.student.lastName}`.localeCompare(
                          `${b.student.firstName} ${b.student.lastName}`,
                        ),
                      )
                      .map((entry) => {
                        const cfg = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                        const isEditing = editingId === entry.student._id;
                        return (
                          <tr key={entry.student._id} className="hover:bg-slate-50">
                            <td className="px-5 py-3">
                              <p className="font-semibold text-slate-900">
                                {entry.student.firstName} {entry.student.lastName}
                              </p>
                              <p className="text-xs text-slate-400">{entry.student.studentId || entry.student.email}</p>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500">
                              {entry.scannedAt
                                ? new Date(entry.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-slate-500">
                              {entry.location?.latitude != null && entry.location?.longitude != null ? (
                                <div className="space-y-1">
                                  <p className="font-medium text-slate-700">
                                    {entry.location.latitude.toFixed(5)}, {entry.location.longitude.toFixed(5)}
                                  </p>
                                  <a
                                    href={getGoogleMapsLink(entry.location.latitude, entry.location.longitude)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    Open in Google Maps
                                  </a>
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <div className="flex justify-center">
                                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                                </div>
                              ) : (
                                <select
                                  value={entry.status === 'pending' ? '' : entry.status}
                                  onChange={(e) =>
                                    void handleStatusChange(
                                      entry,
                                      e.target.value as 'present' | 'late' | 'absent',
                                      viewSessionId,
                                    )
                                  }
                                  className={`rounded-lg border-0 px-2.5 py-1.5 text-xs font-bold ${cfg.bg} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                                >
                                  {entry.status === 'pending' && <option value="">Not yet</option>}
                                  {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {STATUS_CONFIG[opt].label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
