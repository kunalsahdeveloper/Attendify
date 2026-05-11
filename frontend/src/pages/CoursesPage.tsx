import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import type { Class, ClassTimetableSlot, Material, User } from '@/types';
import { api } from '@/lib/api';
import { ensureTimetable, formatTimetableLine } from '@/lib/classTimetable';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import TeacherLayout from '@/components/TeacherLayout';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SEMESTERS = ['Fall', 'Spring', 'Summer', 'Winter'];

type Tab = 'overview' | 'roster' | 'materials';

export default function CoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterQ, setRosterQ] = useState<Record<string, string>>({});
  const [rosterHits, setRosterHits] = useState<Record<string, User[]>>({});
  const canEdit = (cls: Class) => user?.role === 'admin' || cls.isOwner === true;
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [matLoading, setMatLoading] = useState<Record<string, boolean>>({});
  const [downloadingMaterial, setDownloadingMaterial] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');

  const defaultSlot = (): ClassTimetableSlot => ({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    room: '',
  });
  const emptyForm = {
    name: '',
    code: '',
    description: '',
    semester: 'Fall',
    year: new Date().getFullYear(),
    timetable: [defaultSlot()] as ClassTimetableSlot[],
    maxStudents: 50,
  };
  const [formData, setFormData] = useState(emptyForm);

  const loadClasses = useCallback(async () => {
    const useAll =
      (user?.role === 'teacher' || user?.role === 'admin') && viewMode === 'all';
    const res = useAll ? await api.classes.getAll({ scope: 'all' }) : await api.classes.getAll();
    if (res.success && res.data) setClasses(res.data.classes);
    setLoading(false);
  }, [user, viewMode]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) void loadClasses();
  }, [user, loadClasses]);

  const loadMaterials = async (classId: string) => {
    if (materials[classId]) return;
    setMatLoading((p) => ({ ...p, [classId]: true }));
    const res = await api.materials.list(classId);
    if (res.success && res.data) setMaterials((p) => ({ ...p, [classId]: res.data!.materials }));
    setMatLoading((p) => ({ ...p, [classId]: false }));
  };

  const toggleExpand = (classId: string) => {
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      setActiveTab('overview');
      void loadMaterials(classId);
    }
  };

  const updateTimetableRow = (index: number, patch: Partial<ClassTimetableSlot>) => {
    setFormData((fd) => ({
      ...fd,
      timetable: fd.timetable.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const addTimetableRow = () => {
    setFormData((fd) => ({ ...fd, timetable: [...fd.timetable, defaultSlot()] }));
  };

  const removeTimetableRow = (index: number) => {
    setFormData((fd) => ({
      ...fd,
      timetable: fd.timetable.length <= 1 ? fd.timetable : fd.timetable.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const clean = formData.timetable.filter((s) => s.startTime && s.endTime);
    if (clean.length === 0) {
      setFormError('Add at least one meeting time (start and end) in the timetable.');
      return;
    }
    const body = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      semester: formData.semester,
      year: formData.year,
      timetable: clean,
      maxStudents: formData.maxStudents,
    };
    const res = editingClass
      ? await api.classes.update(editingClass._id, body)
      : await api.classes.create(body);
    if (res.success) {
      setShowForm(false);
      setEditingClass(null);
      setFormData(emptyForm);
      void loadClasses();
    } else {
      setFormError(res.error ?? 'Failed to save course');
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    const slots = ensureTimetable(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      description: cls.description ?? '',
      semester: cls.semester,
      year: cls.year,
      timetable: slots.length > 0 ? slots : [defaultSlot()],
      maxStudents: cls.maxStudents ?? 50,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course and all associated data? This cannot be undone.')) return;
    await api.classes.delete(id);
    void loadClasses();
  };

  const handleUpload = async (classId: string) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!uploadTitle.trim()) { setUploadError('Please enter a title for the file'); return; }
    setUploadError('');
    setUploading(true);
    const res = await api.materials.upload(classId, file, uploadTitle.trim());
    setUploading(false);
    if (res.success) {
      setUploadTitle('');
      if (fileRef.current) fileRef.current.value = '';
      setMaterials((p) => ({
        ...p,
        [classId]: [res.data!.material, ...(p[classId] ?? [])],
      }));
    } else {
      setUploadError(res.error ?? 'Upload failed');
    }
  };

  const handleDeleteMaterial = async (classId: string, materialId: string) => {
    await api.materials.delete(materialId);
    setMaterials((p) => ({
      ...p,
      [classId]: (p[classId] ?? []).filter((m) => m._id !== materialId),
    }));
  };

  const handleDownloadMaterial = async (material: Material) => {
    try {
      setDownloadingMaterial((p) => ({ ...p, [material._id]: true }));
      const token = api.getToken();
      const response = await fetch(api.materials.downloadUrl(material._id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const fallbackMsg = `Download failed (${response.status})`;
        let message = fallbackMsg;
        try {
          const errData = await response.json() as { error?: string };
          message = errData.error || fallbackMsg;
        } catch {
          // keep fallback message
        }
        alert(message);
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = material.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      alert('Unable to download file right now. Please try again.');
    } finally {
      setDownloadingMaterial((p) => ({ ...p, [material._id]: false }));
    }
  };

  const searchStudentsForClass = async (classId: string) => {
    const q = rosterQ[classId] || '';
    const res = await api.users.listStudents(q, 1);
    if (res.success && res.data) {
      setRosterHits((p) => ({ ...p, [classId]: res.data!.students }));
    }
  };

  const addStudentToClass = async (classId: string, studentId: string) => {
    const res = await api.classes.addStudents(classId, [studentId]);
    if (res.success) {
      setRosterHits((p) => ({ ...p, [classId]: [] }));
      setRosterQ((p) => ({ ...p, [classId]: '' }));
      void loadClasses();
    }
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
      <div className="flex-1 px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Courses</h1>
            <p className="mt-0.5 text-slate-500">
              {classes.length} course{classes.length !== 1 ? 's' : ''} · rosters &amp; materials
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('mine')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    viewMode === 'mine' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  My courses
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    viewMode === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All courses
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setEditingClass(null);
                setFormData(emptyForm);
                setShowForm(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New Course
            </button>
          </div>
        </div>

        {/* Course list */}
        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20">
            <BookOpen className="mb-4 h-14 w-14 text-slate-200" />
            <p className="mb-3 font-semibold text-slate-500">No courses yet</p>
            <button
              onClick={() => { setShowForm(true); }}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Create your first course
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => {
              const isOpen = expandedClass === cls._id;
              const editable = canEdit(cls);
              return (
                <div key={cls._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Course header row */}
                  <div className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                      {cls.code.slice(0, 4)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{cls.name}</p>
                        <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 sm:block">
                          {cls.semester} {cls.year}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {cls.students?.length ?? 0} / {cls.maxStudents ?? '∞'} students
                        </span>
                        <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {ensureTimetable(cls).map((s, i) => (
                            <span key={i} className="whitespace-nowrap">
                              {i > 0 ? ' · ' : ''}
                              {formatTimetableLine(s, DAYS)}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editable ? (
                        <>
                          <button
                            onClick={() => handleEdit(cls)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(cls._id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
                          View only
                        </span>
                      )}
                      <button
                        onClick={() => toggleExpand(cls._id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {/* Tabs */}
                      <div className="flex gap-1 border-b border-slate-100 px-6 pt-2">
                        {(['overview', 'roster', 'materials'] as Tab[]).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                              activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      <div className="p-6">
                        {activeTab === 'overview' && (
                          <div className="space-y-4">
                            {cls.description && (
                              <p className="text-slate-600">{cls.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                              {[
                                ['Code', cls.code],
                                ['Semester', `${cls.semester} ${cls.year}`],
                                ['Enrolled', `${cls.students?.length ?? 0} students`],
                                ['Capacity', cls.maxStudents ?? '∞'],
                              ].map(([label, val]) => (
                                <div key={String(label)} className="rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                                  <p className="mt-1 font-bold text-slate-900">{val}</p>
                                </div>
                              ))}
                            </div>
                            <div>
                              <h3 className="mb-2 text-sm font-bold text-slate-800">Weekly timetable</h3>
                              {ensureTimetable(cls).length === 0 ? (
                                <p className="text-sm text-slate-500">No meeting times on file.</p>
                              ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-2.5">Day</th>
                                        <th className="px-4 py-2.5">Time</th>
                                        <th className="px-4 py-2.5">Room</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {ensureTimetable(cls)
                                        .slice()
                                        .sort(
                                          (a, b) =>
                                            a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
                                        )
                                        .map((row: ClassTimetableSlot, i: number) => (
                                          <tr key={i} className="bg-white">
                                            <td className="px-4 py-2.5 font-medium text-slate-900">
                                              {DAYS[row.dayOfWeek] ?? '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-700">
                                              {row.startTime} – {row.endTime}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600">
                                              {row.room ? (
                                                <span className="inline-flex items-center gap-1">
                                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
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
                        )}

                        {activeTab === 'roster' && (
                          <div>
                            {editable && (
                              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                <p className="mb-2 text-sm font-bold text-slate-800">Add students to this course</p>
                                <p className="mb-3 text-xs text-slate-500">Search by name, email, or student ID and click Add.</p>
                                <div className="flex flex-wrap gap-2">
                                  <input
                                    type="search"
                                    placeholder="Search students..."
                                    value={rosterQ[cls._id] || ''}
                                    onChange={(e) => setRosterQ((p) => ({ ...p, [cls._id]: e.target.value }))}
                                    className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && void searchStudentsForClass(cls._id)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void searchStudentsForClass(cls._id)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                                  >
                                    Search
                                  </button>
                                </div>
                                {(rosterHits[cls._id] ?? []).length > 0 && (
                                  <ul className="mt-3 space-y-2">
                                    {(rosterHits[cls._id] ?? []).map((s) => (
                                      <li
                                        key={s._id}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                      >
                                        <span className="truncate">
                                          {s.firstName} {s.lastName} · {s.email}
                                          {s.studentId ? ` · ${s.studentId}` : ''}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => void addStudentToClass(cls._id, s._id)}
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                                        >
                                          <UserPlus className="h-3.5 w-3.5" />
                                          Add
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                            {cls.students?.length === 0 ? (
                              <p className="py-8 text-center font-medium text-slate-400">No students enrolled yet.</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    <th className="pb-2 pr-4">Name</th>
                                    <th className="pb-2 pr-4">Email</th>
                                    <th className="pb-2">Student ID</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {cls.students.map((s) => (
                                    <tr key={s._id}>
                                      <td className="py-2 pr-4 font-medium text-slate-900">
                                        <Link to={`/students/${s._id}`} className="text-blue-600 hover:underline">
                                          {s.firstName} {s.lastName}
                                        </Link>
                                      </td>
                                      <td className="py-2 pr-4 text-slate-500">{s.email}</td>
                                      <td className="py-2 text-slate-500">{s.studentId ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}

                        {activeTab === 'materials' && (
                          <div>
                            {editable && (
                            <div className="mb-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                              <p className="mb-3 text-sm font-semibold text-slate-700">Upload file (PDF, PPTX, DOCX, images — max 25 MB)</p>
                              {uploadError && (
                                <p className="mb-2 text-sm text-red-600">{uploadError}</p>
                              )}
                              <div className="flex gap-3">
                                <input
                                  type="text"
                                  placeholder="Title"
                                  value={uploadTitle}
                                  onChange={(e) => setUploadTitle(e.target.value)}
                                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                  <Paperclip className="h-4 w-4" />
                                  Choose file
                                  <input ref={fileRef} type="file" className="sr-only" />
                                </label>
                                <button
                                  onClick={() => void handleUpload(cls._id)}
                                  disabled={uploading}
                                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                  Upload
                                </button>
                              </div>
                            </div>
                            )}

                            {matLoading[cls._id] ? (
                              <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                              </div>
                            ) : !materials[cls._id] || materials[cls._id].length === 0 ? (
                              <p className="py-8 text-center font-medium text-slate-400">No materials uploaded yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {materials[cls._id].map((m) => (
                                  <div key={m._id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                                      <BookOpen className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate font-semibold text-slate-900">{m.title}</p>
                                      <p className="text-xs text-slate-500">
                                        {m.originalName} · {fmtSize(m.size)} ·{' '}
                                        {new Date(m.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void handleDownloadMaterial(m)}
                                      disabled={Boolean(downloadingMaterial[m._id])}
                                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                                    >
                                      {downloadingMaterial[m._id] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                      Download
                                    </button>
                                    {editable && (
                                    <button
                                      onClick={() => void handleDeleteMaterial(cls._id, m._id)}
                                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Course form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">
                {editingClass ? 'Edit Course' : 'Create New Course'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Course Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Course Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Max Students</label>
                  <input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Weekly timetable</label>
                  <button
                    type="button"
                    onClick={addTimetableRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add another day
                  </button>
                </div>
                <p className="mb-3 text-xs text-slate-500">Each row is one class meeting. Times can differ by day; room is optional.</p>
                <div className="space-y-3">
                  {formData.timetable.map((row, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Day</label>
                        <select
                          value={row.dayOfWeek}
                          onChange={(e) => updateTimetableRow(index, { dayOfWeek: parseInt(e.target.value, 10) })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        >
                          {DAYS.map((d, i) => (
                            <option key={d} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Start</label>
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={(e) => updateTimetableRow(index, { startTime: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">End</label>
                        <input
                          type="time"
                          value={row.endTime}
                          onChange={(e) => updateTimetableRow(index, { endTime: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600">Room</label>
                        <input
                          type="text"
                          value={row.room}
                          onChange={(e) => updateTimetableRow(index, { room: e.target.value })}
                          placeholder="e.g. 32"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                        />
                      </div>
                      <div className="flex justify-end sm:pb-0.5">
                        <button
                          type="button"
                          onClick={() => removeTimetableRow(index)}
                          disabled={formData.timetable.length <= 1}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                          title="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  {editingClass ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
