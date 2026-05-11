import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import type { Class, Session, AttendanceListEntry, SessionType } from '@/types';
import { api } from '@/lib/api';
import { ensureTimetable, classMeetsOnDay } from '@/lib/classTimetable';
import {
  AlertTriangle, CheckCircle, Clock, MapPin, QrCode, RefreshCw, StopCircle, Timer, Users, XCircle,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import TeacherLayout from '@/components/TeacherLayout';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  regular: 'Regular Class',
  lab: 'Lab Session',
  exam: 'Exam',
  extra: 'Extra Class',
  adjustment: 'Adjustment / Make-up Class',
};

const START_SESSION_TYPES: SessionType[] = ['regular', 'lab', 'exam', 'extra'];

const SESSION_TYPE_COLORS: Record<string, string> = {
  regular: 'bg-blue-100 text-blue-800',
  lab: 'bg-purple-100 text-purple-800',
  exam: 'bg-red-100 text-red-800',
  extra: 'bg-orange-100 text-orange-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-slate-100 text-slate-600',
};

const STATUS_CONFIG = {
  present: { label: 'Present', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  late: { label: 'Late', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  absent: { label: 'Absent', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  pending: { label: 'Not yet', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
};

function QrTimer({ expiresAt, validDurationSec }: { expiresAt: string; validDurationSec: number }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }, 100);
    return () => clearInterval(id);
  }, [expiresAt]);

  const total = Math.max(1, validDurationSec);
  const pct = Math.min(100, (secs / total) * 100);
  const greenOver = total > 120 ? 60 : Math.ceil(total * 0.4);
  const orangeOver = total > 120 ? 20 : Math.max(0, Math.ceil(total * 0.15));
  const color = secs > greenOver ? 'text-green-600' : secs > orangeOver ? 'text-orange-500' : 'text-red-600';
  const barColor = secs > greenOver ? 'bg-green-500' : secs > orangeOver ? 'bg-orange-500' : 'bg-red-500';
  const m = Math.floor(secs / 60);
  const s = secs % 60;

  return (
    <div className="mt-3 w-full">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> QR valid for</span>
        <span className={`font-mono text-sm font-extrabold ${color}`}>{m}:{String(s).padStart(2, '0')}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SessionPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<Class[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [qrData, setQrData] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [duration, setDuration] = useState(300);
  const [geoFenceEnabled, setGeoFenceEnabled] = useState(false);
  const [geoFenceRadius, setGeoFenceRadius] = useState(100);
  const [teacherLocation, setTeacherLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingTeacherLocation, setLoadingTeacherLocation] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('regular');
  const [scheduleNote, setScheduleNote] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'details' | 'students'>('details');
  const [attendanceList, setAttendanceList] = useState<AttendanceListEntry[]>([]);
  const [endWizardStep, setEndWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [physicalHeadCount, setPhysicalHeadCount] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const todayDow = new Date().getDay();
  const todayClasses = classes.filter((c) => classMeetsOnDay(c, todayDow));
  const selectedClassObj = classes.find((c) => c._id === selectedClass);
  const todaySlotsForSelected = selectedClassObj
    ? ensureTimetable(selectedClassObj).filter((s) => s.dayOfWeek === todayDow)
    : [];
  const weekSlotsSorted = selectedClassObj
    ? ensureTimetable(selectedClassObj)
        .slice()
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
    : [];

  const loadData = useCallback(async () => {
    const [classesRes, sessionsRes] = await Promise.all([api.classes.getAll(), api.sessions.getActive()]);
    let nextClasses: Class[] = [];
    if (classesRes.success && classesRes.data) {
      nextClasses = classesRes.data.classes;
      setClasses(nextClasses);
    }
    if (sessionsRes.success && sessionsRes.data) {
      const active = sessionsRes.data.sessions.find((s) => s.status === 'active');
      if (active) {
        setActiveSession(active);
        setQrData(`${active.class?.code}:${active.qrCode.uniqueCode}:${active._id}`);
      }
    }
    setLoading(false);
  }, []);

  const loadAttendance = useCallback(async (sessionId: string) => {
    const res = await api.sessions.getAttendance(sessionId);
    if (res.success && res.data) {
      if (res.data.session) setActiveSession(res.data.session as Session);
      setAttendanceList(res.data.attendanceList);
    }
  }, []);

  const handleRefreshQr = useCallback(async () => {
    const id = activeSession?._id;
    if (!id) return;
    const res = await api.sessions.refreshQr(id);
    if (res.success && res.data) {
      setQrData(res.data.qrData);
      setActiveSession((s) => (s ? { ...s, qrCode: res.data!.qrCode } : s));
    }
  }, [activeSession?._id]);

  // When the QR reaches its expiry time, request a new code automatically
  useEffect(() => {
    if (!activeSession?._id || !activeSession.qrCode?.expiresAt) return;
    const exp = new Date(activeSession.qrCode.expiresAt).getTime();
    const delay = exp - Date.now();
    if (delay <= 0) {
      void handleRefreshQr();
      return;
    }
    const t = window.setTimeout(() => { void handleRefreshQr(); }, delay);
    return () => clearTimeout(t);
  }, [activeSession?._id, activeSession?.qrCode?.expiresAt, activeSession?.qrCode?.uniqueCode, handleRefreshQr]);

  useEffect(() => { if (!authLoading && !user) navigate('/login'); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) void loadData(); }, [user, loadData]);

  // Real-time polling every 5 seconds when session is active
  useEffect(() => {
    if (activeSession?._id) {
      void loadAttendance(activeSession._id);
      pollRef.current = setInterval(() => void loadAttendance(activeSession._id), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeSession?._id, loadAttendance]);

  const handleStart = async () => {
    if (!selectedClass) { setError('Please select a class'); return; }
    if (geoFenceEnabled && !teacherLocation) { setError('Please capture teacher location for geo-fence'); return; }
    setError('');
    setStarting(true);
    const res = await api.sessions.create({
      classId: selectedClass,
      duration,
      sessionType,
      scheduleNote: scheduleNote.trim(),
      geoFence: geoFenceEnabled ? {
        enabled: true,
        radiusMeters: geoFenceRadius,
        teacherLocation: teacherLocation!,
      } : {
        enabled: false,
      },
    });
    setStarting(false);
    if (res.success && res.data) {
      setActiveSession(res.data.session as Session);
      setQrData(res.data.qrData || `${res.data.session.class?.code}:${res.data.session.qrCode.uniqueCode}:${res.data.session._id}`);
    } else {
      setError(res.error ?? 'Failed to start session');
    }
  };

  const handleCaptureTeacherLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }
    setLoadingTeacherLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTeacherLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoadingTeacherLocation(false);
      },
      (geoError) => {
        setLoadingTeacherLocation(false);
        setError(geoError.message || 'Unable to capture teacher location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleStatusChange = async (entry: AttendanceListEntry, newStatus: 'present' | 'late' | 'absent') => {
    setEditingStatus(entry.student._id);
    if (entry.attendanceId) {
      await api.attendance.update(entry.attendanceId, newStatus);
    } else {
      await api.attendance.createManual(activeSession!._id, entry.student._id, newStatus);
    }
    if (activeSession) await loadAttendance(activeSession._id);
    setEditingStatus(null);
  };

  const absentCount = activeSession ? (activeSession.attendanceCount?.total ?? 0) - (activeSession.attendanceCount?.present ?? 0) : 0;
  const notCheckedList = activeSession
    ? attendanceList.filter((e) => e.status === 'pending')
    : [];
  const rosterEnrolled = activeSession?.attendanceCount?.total ?? attendanceList.length;
  const scannedInCount = attendanceList.filter((e) => e.status === 'present' || e.status === 'late').length;
  const parsedHeadCount =
    physicalHeadCount.trim() === '' ? Number.NaN : Number(physicalHeadCount);
  const headCountMatchesPresentLate =
    Number.isFinite(parsedHeadCount) && Math.round(parsedHeadCount) === scannedInCount;
  const openEndWizard = () => {
    setPhysicalHeadCount(String(scannedInCount));
    setEndWizardStep(1);
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    if (!headCountMatchesPresentLate) return;
    setEnding(true);
    await api.sessions.end(activeSession._id);
    setActiveSession(null);
    setQrData('');
    setAttendanceList([]);
    setEndWizardStep(0);
    setPhysicalHeadCount('');
    setEnding(false);
    void loadData();
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <TeacherLayout>
      <div className="flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">QR Attendance Session</h1>
            <p className="mt-0.5 text-slate-500">Start a session and let students scan to mark attendance.</p>
          </div>
          {activeSession && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Session Live
            </div>
          )}
        </div>

        {activeSession ? (
          /* ── Active Session UI ── */
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            {/* Left — QR + Timer */}
            <div className="flex flex-col items-center rounded-2xl border border-green-200 bg-white p-7 shadow-sm">
              <span className={`mb-4 rounded-full px-3 py-1 text-xs font-bold capitalize ${SESSION_TYPE_COLORS[activeSession.sessionType ?? 'regular']}`}>
                {SESSION_TYPE_LABELS[activeSession.sessionType as SessionType] ?? activeSession.sessionType}
              </span>

              <div className="rounded-2xl border-4 border-blue-600 bg-white p-4 shadow-xl">
                <QRCodeCanvas value={qrData || 'loading'} size={220} level="H" includeMargin />
              </div>

              {activeSession.qrCode?.expiresAt && (
                <QrTimer
                  expiresAt={activeSession.qrCode.expiresAt}
                  validDurationSec={activeSession.validDuration > 0 ? activeSession.validDuration : 300}
                />
              )}

              <button
                onClick={() => void handleRefreshQr()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" /> Refresh QR
              </button>

              <p className="mt-2 text-center text-xs text-slate-400">Students scan this in the Attendify app</p>

              <button
                onClick={openEndWizard}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
              >
                <StopCircle className="h-5 w-5" /> End Session
              </button>
            </div>

            {/* Right — Details / Students */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {(['details', 'students'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3.5 text-sm font-bold capitalize transition ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t === 'students' ? `Students (${attendanceList.length})` : 'Details'}
                  </button>
                ))}
              </div>

              {tab === 'details' && (
                <div className="p-6 space-y-5">
                  {[
                    ['Class', activeSession.class?.name],
                    ['Code', activeSession.class?.code],
                    ['Type', SESSION_TYPE_LABELS[activeSession.sessionType as SessionType] ?? activeSession.sessionType ?? 'Regular'],
                    ['Started', activeSession.startedAt ? new Date(activeSession.startedAt).toLocaleTimeString() : '—'],
                    ['Geo-fence', activeSession.geoFence?.enabled ? `Enabled (${activeSession.geoFence.radiusMeters ?? 0}m)` : 'Disabled'],
                    ...(activeSession.scheduleNote ? [['Note', activeSession.scheduleNote]] : []),
                  ].map(([label, val]) => (
                    <div key={String(label)} className="flex items-start justify-between gap-4">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-right text-sm font-semibold text-slate-900">{val}</span>
                    </div>
                  ))}

                  <div className="mt-2 grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                    {[
                      { label: 'Present', value: activeSession.attendanceCount?.present ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
                      { label: 'Absent', value: absentCount, color: 'text-red-500', bg: 'bg-red-50' },
                      { label: 'Total', value: activeSession.attendanceCount?.total ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-xl p-4 text-center ${s.bg}`}>
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'students' && (
                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {attendanceList.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-slate-400">
                      <Users className="mb-3 h-10 w-10 text-slate-200" />
                      <p className="text-sm">No students yet</p>
                    </div>
                  ) : (
                    attendanceList
                      .sort((a, b) => {
                        const order = { present: 0, late: 1, pending: 2, absent: 3 };
                        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                      })
                      .map((entry) => {
                        const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.pending;
                        const isEditing = editingStatus === entry.student._id;
                        return (
                          <div key={entry.student._id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {entry.student.firstName} {entry.student.lastName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {entry.student.studentId || entry.student.email}
                                {entry.scannedAt ? ` · ${new Date(entry.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                {entry.location?.latitude != null && entry.location?.longitude != null
                                  ? ` · ${entry.location.latitude.toFixed(5)}, ${entry.location.longitude.toFixed(5)}`
                                  : ''}
                              </p>
                            </div>
                            {isEditing ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                            ) : (
                              <select
                                value={entry.status === 'pending' ? '' : entry.status}
                                onChange={(e) => void handleStatusChange(entry, e.target.value as 'present' | 'late' | 'absent')}
                                className={`rounded-lg border-0 px-2 py-1 text-xs font-bold ${cfg.cls} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                              >
                                {entry.status === 'pending' && <option value="">Not yet</option>}
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent">Absent</option>
                              </select>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Start Session Form ── */
          <div className="max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-slate-900">Start New Attendance Session</h2>
              <p className="mb-6 text-sm text-slate-500">
                Select the class and session type. Students who don't scan will be marked <strong>absent</strong> when you end the session.
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}

              {classes.length === 0 ? (
                <p className="py-6 text-center text-slate-500">No classes found. <a href="/courses" className="text-blue-600 hover:underline">Create a course first.</a></p>
              ) : (
                <div className="space-y-5">
                  {/* Class Picker with today's classes highlighted */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Class
                      {todayClasses.length > 0 && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {todayClasses.length} scheduled today
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select a class…</option>
                      {todayClasses.length > 0 && (
                        <optgroup label={`📅 Today — ${DAYS[todayDow]}`}>
                          {todayClasses.map((cls) => {
                            const t = ensureTimetable(cls).filter((s) => s.dayOfWeek === todayDow);
                            const timeLabel = t.map((s) => `${s.startTime}–${s.endTime}`).join(', ');
                            return (
                            <option key={cls._id} value={cls._id}>
                              {cls.name} ({cls.code}){timeLabel ? ` · ${timeLabel}` : ''}
                            </option>
                            );
                          })}
                        </optgroup>
                      )}
                      {classes.filter((c) => !classMeetsOnDay(c, todayDow)).length > 0 && (
                        <optgroup label="Other classes">
                          {classes.filter((c) => !classMeetsOnDay(c, todayDow)).map((cls) => (
                            <option key={cls._id} value={cls._id}>
                              {cls.name} ({cls.code}) · {ensureTimetable(cls).map((s) => DAYS[s.dayOfWeek]).join(', ')}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Schedule info card */}
                    {selectedClassObj && (
                      <div className="mt-2 space-y-3 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                          <div className="min-w-0 flex-1 space-y-2">
                            {todaySlotsForSelected.length > 0 ? (
                              <p className="font-bold text-blue-950">Today ({DAYS[todayDow]})</p>
                            ) : (
                              <>
                                <p className="font-bold text-blue-950">Not on today&apos;s timetable</p>
                                <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
                                  Extra / make-up likely
                                </span>
                              </>
                            )}
                            {todaySlotsForSelected.length > 0 && (
                              <ul className="list-inside list-disc text-blue-900">
                                {todaySlotsForSelected.map((s, i) => (
                                  <li key={i}>
                                    {s.startTime}–{s.endTime}
                                    {s.room ? (
                                      <span className="text-blue-800"> — Room {s.room}</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800/90">
                                Weekly timetable
                              </p>
                              {weekSlotsSorted.length === 0 ? (
                                <p className="text-xs text-blue-700/80">No meeting times on file.</p>
                              ) : (
                                <div className="overflow-hidden rounded-lg border border-blue-200/90 bg-white shadow-sm">
                                  <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:text-xs">
                                        <th className="px-2.5 py-2 sm:px-3">Day</th>
                                        <th className="px-2.5 py-2 sm:px-3">Time</th>
                                        <th className="px-2.5 py-2 sm:px-3">Room</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800">
                                      {weekSlotsSorted.map((row, i) => (
                                        <tr key={i} className="bg-white">
                                          <td className="px-2.5 py-2 font-medium sm:px-3">{DAYS[row.dayOfWeek]}</td>
                                          <td className="px-2.5 py-2 tabular-nums sm:px-3">
                                            {row.startTime} – {row.endTime}
                                          </td>
                                          <td className="px-2.5 py-2 sm:px-3">
                                            {row.room ? (
                                              <span className="inline-flex items-center gap-1 text-slate-700">
                                                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                                {row.room}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session Type */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Session Type</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                      {START_SESSION_TYPES.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSessionType(val)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                            sessionType === val
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {SESSION_TYPE_LABELS[val]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional note (extra class) */}
                  {sessionType === 'extra' && (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Note <span className="font-normal text-slate-400">(optional — visible in reports)</span>
                      </label>
                      <input
                        value={scheduleNote}
                        onChange={(e) => setScheduleNote(e.target.value)}
                        placeholder="e.g. Make-up for 22 April class…"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* QR Duration */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">QR Valid Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                      <option value={900}>15 minutes</option>
                      <option value={1800}>30 minutes</option>
                    </select>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      Require student geo-location check
                      <input
                        type="checkbox"
                        checked={geoFenceEnabled}
                        onChange={(e) => {
                          setGeoFenceEnabled(e.target.checked);
                          if (!e.target.checked) setTeacherLocation(null);
                        }}
                        className="h-4 w-4"
                      />
                    </label>
                    {geoFenceEnabled && (
                      <>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Allowed radius</label>
                          <select
                            value={geoFenceRadius}
                            onChange={(e) => setGeoFenceRadius(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          >
                            <option value={50}>50 meters</option>
                            <option value={100}>100 meters</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleCaptureTeacherLocation}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {loadingTeacherLocation ? 'Capturing location...' : (teacherLocation ? 'Refresh teacher location' : 'Capture teacher location')}
                        </button>
                        <p className="text-xs text-slate-500">
                          {teacherLocation
                            ? `Teacher location: ${teacherLocation.latitude.toFixed(5)}, ${teacherLocation.longitude.toFixed(5)}`
                            : 'Capture your current location before starting this geo-fenced session.'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Info box */}
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <p>Students who scan within <strong>10 minutes</strong> of session start are marked <strong>present</strong>. After that they're marked <strong>late</strong>. Those who never scan are marked <strong>absent</strong> when you end the session.</p>
                  </div>

                  <button
                    onClick={() => void handleStart()}
                    disabled={starting || !selectedClass}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
                  >
                    {starting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <QrCode className="h-5 w-5" />
                    )}
                    Start Attendance Session
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* End Session Wizard */}
        {endWizardStep > 0 && activeSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span className={endWizardStep === 1 ? 'text-blue-600' : ''}>1. Absent</span>
                  <span>→</span>
                  <span className={endWizardStep === 2 ? 'text-blue-600' : ''}>2. Head count</span>
                  <span>→</span>
                  <span className={endWizardStep === 3 ? 'text-blue-600' : ''}>3. Confirm</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setEndWizardStep(0); setPhysicalHeadCount(''); }}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
              </div>

              {endWizardStep === 1 && (
                <>
                  <h2 className="mb-2 text-lg font-extrabold text-slate-900">Who will be marked absent</h2>
                  <p className="mb-4 text-sm text-slate-600">
                    The following {notCheckedList.length} student{notCheckedList.length !== 1 ? 's have' : ' has'} not checked in and will be marked <span className="font-bold text-red-600">absent</span> when you end the session.
                  </p>
                  <div className="mb-4 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
                    {notCheckedList.length === 0 ? (
                      <p className="p-4 text-sm text-slate-600">Every enrolled student has already scanned in.</p>
                    ) : (
                      <ul className="divide-y divide-slate-200 text-sm">
                        {notCheckedList.map((e) => (
                          <li key={e.student._id} className="flex items-center justify-between px-3 py-2.5">
                            <span>
                              <span className="font-semibold text-slate-900">{e.student.firstName} {e.student.lastName}</span>
                              <span className="ml-2 text-slate-500">{e.student.studentId || e.student.email}</span>
                            </span>
                            <span className="text-xs font-bold text-red-600">No scan</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setEndWizardStep(0); setPhysicalHeadCount(''); }}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndWizardStep(2)}
                      className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}

              {endWizardStep === 2 && (
                <>
                  <h2 className="mb-2 text-lg font-extrabold text-slate-900">Physical head count</h2>
                  <p className="mb-4 text-sm text-slate-600">
                    Count how many people are in the room. The number you enter must <strong>exactly match</strong> students marked{' '}
                    <strong>Present</strong> or <strong>Late</strong> in the app ({scannedInCount}). If someone is in the room but did not scan, update attendance in the student list first.
                  </p>
                  <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p><strong>Present + Late in app (target):</strong> {scannedInCount}</p>
                    <p><strong>On roster (enrolled):</strong> {rosterEnrolled}</p>
                    <p><strong>Not scanned yet (will be absent):</strong> {notCheckedList.length}</p>
                  </div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Physical head count in the room</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={physicalHeadCount}
                    onChange={(e) => setPhysicalHeadCount(e.target.value)}
                    className={`mb-1 w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none ${
                      headCountMatchesPresentLate || physicalHeadCount.trim() === ''
                        ? 'border-slate-300 focus:border-blue-500'
                        : 'border-red-300 bg-red-50/50 focus:border-red-500'
                    }`}
                    placeholder={String(scannedInCount)}
                  />
                  {physicalHeadCount.trim() !== '' && !headCountMatchesPresentLate && (
                    <p className="mb-2 text-xs font-semibold text-red-600">
                      Head count does not match Present + Late ({scannedInCount}). Fix the number or update attendance in the Students tab, then try again.
                    </p>
                  )}
                  {headCountMatchesPresentLate && (
                    <p className="mb-2 text-xs font-medium text-green-700">Head count matches Present + Late in the app.</p>
                  )}
                  <div className="mb-1 h-1" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setEndWizardStep(1)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndWizardStep(3)}
                      disabled={!headCountMatchesPresentLate}
                      className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}

              {endWizardStep === 3 && (
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="mb-2 text-lg font-extrabold text-slate-900">End session and save attendance?</h2>
                  <p className="mb-4 text-sm text-slate-600">
                    {notCheckedList.length > 0
                      ? `Not checked in will be marked absent (${notCheckedList.length} students).`
                      : 'All students have a scan record; no new absent records will be created.'}
                    {physicalHeadCount !== '' && !Number.isNaN(Number(physicalHeadCount)) && (
                      <span className="mt-2 block">
                        Head count: <strong>{physicalHeadCount}</strong> (Present + Late in app: {scannedInCount}).
                      </span>
                    )}
                  </p>
                  {!headCountMatchesPresentLate && (
                    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      You cannot end the session until the physical head count matches Present + Late ({scannedInCount}). Go back and correct it.
                    </p>
                  )}
                  <div className="mb-5 flex gap-3">
                    <button type="button" onClick={() => setEndWizardStep(2)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleEnd()}
                      disabled={ending || !headCountMatchesPresentLate}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <StopCircle className="h-4 w-4" />}
                      End session
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
