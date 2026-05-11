import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import type { Class, ClassTimetableSlot } from '@/types';
import { api } from '@/lib/api';
import { ensureTimetable, formatTimetableLine } from '@/lib/classTimetable';
import { Plus, Users, Clock, Pencil, Trash2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const defaultSlot = (): ClassTimetableSlot => ({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    room: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    semester: 'Fall',
    year: new Date().getFullYear(),
    timetable: [defaultSlot()] as ClassTimetableSlot[],
    maxStudents: 50,
  });

  const loadClasses = useCallback(async () => {
    try {
      const response = await api.classes.getAll();
      if (response.success && response.data) {
        setClasses(response.data.classes);
      }
    } catch (e) {
      console.error('Failed to load classes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      void loadClasses();
    }
  }, [user, loadClasses]);

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
    const clean = formData.timetable.filter((s) => s.startTime && s.endTime);
    if (clean.length === 0) return;
    const classData = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      semester: formData.semester,
      year: formData.year,
      timetable: clean,
      maxStudents: formData.maxStudents,
    };
    try {
      if (editingClass) {
        await api.classes.update(editingClass._id, classData);
      } else {
        await api.classes.create(classData);
      }
      setShowModal(false);
      setEditingClass(null);
      resetForm();
      void loadClasses();
    } catch (err) {
      console.error('Failed to save class:', err);
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    const slots = ensureTimetable(cls);
    setFormData({
      name: cls.name,
      code: cls.code,
      description: cls.description || '',
      semester: cls.semester,
      year: cls.year,
      timetable: slots.length > 0 ? slots : [defaultSlot()],
      maxStudents: cls.maxStudents || 50,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      try {
        await api.classes.delete(id);
        void loadClasses();
      } catch (e) {
        console.error('Failed to delete class:', e);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      semester: 'Fall',
      year: new Date().getFullYear(),
      timetable: [defaultSlot()],
      maxStudents: 50,
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
                Dashboard
              </Link>
              <Link to="/classes" className="font-semibold text-green-600">
                Classes
              </Link>
            </div>
            <button
              onClick={() => {
                setEditingClass(null);
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Class
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-800">My Classes</h2>
        {classes.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="mb-4 text-gray-500">No classes found. Create your first class!</p>
            <button onClick={() => setShowModal(true)} className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700">
              Create Class
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls._id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{cls.name}</h3>
                    <p className="text-gray-500">{cls.code}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(cls)} className="text-blue-600 hover:text-blue-800" type="button">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => void handleDelete(cls._id)} className="text-red-600 hover:text-red-800" type="button">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {cls.description && <p className="mt-2 text-sm text-gray-600">{cls.description}</p>}
                <div className="mt-4 space-y-2 text-sm">
                  <p className="flex items-center text-gray-600">
                    <Users className="mr-2 h-4 w-4" />
                    {cls.students?.length || 0} students
                  </p>
                  <p className="flex items-start text-gray-600">
                    <Clock className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {ensureTimetable(cls).map((s) => formatTimetableLine(s, DAYS)).join(' · ') || '—'}
                    </span>
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {cls.semester} {cls.year}
                  </span>
                  <span>{cls.maxStudents} max students</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-bold text-gray-800">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-gray-700">Class Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-gray-700">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-gray-700">Max Students</label>
                  <input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value, 10) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-gray-700">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  >
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-gray-700">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-gray-700">Weekly timetable</label>
                  <button type="button" onClick={addTimetableRow} className="text-sm font-semibold text-green-600 hover:text-green-800">
                    + Add day
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.timetable.map((row, index) => (
                    <div key={index} className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4 sm:items-end">
                      <div>
                        <label className="mb-0.5 block text-xs text-gray-600">Day</label>
                        <select
                          value={row.dayOfWeek}
                          onChange={(e) => updateTimetableRow(index, { dayOfWeek: parseInt(e.target.value, 10) })}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                        >
                          {DAYS.map((d, i) => (
                            <option key={d} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-gray-600">Start</label>
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={(e) => updateTimetableRow(index, { startTime: e.target.value })}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-gray-600">End</label>
                        <input
                          type="time"
                          value={row.endTime}
                          onChange={(e) => updateTimetableRow(index, { endTime: e.target.value })}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5"
                        />
                      </div>
                      <div className="flex gap-1">
                        <div className="min-w-0 flex-1">
                          <label className="mb-0.5 block text-xs text-gray-600">Room</label>
                          <input
                            type="text"
                            value={row.room}
                            onChange={(e) => updateTimetableRow(index, { room: e.target.value })}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTimetableRow(index)}
                          disabled={formData.timetable.length <= 1}
                          className="self-end p-1 text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClass(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-green-600 py-2 text-white hover:bg-green-700">
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
