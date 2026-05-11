import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import type { User } from '@/types';
import { ArrowLeft, GraduationCap, Search, ChevronRight } from 'lucide-react';
import TeacherLayout from '@/components/TeacherLayout';

export default function StudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.users.listStudents(q, page);
    if (r.success && r.data) {
      setList(r.data.students);
      setTotalPages(r.data.pagination?.pages || 1);
    }
    setLoading(false);
  }, [q, page]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

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
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Students</h1>
            <p className="text-slate-500">Browse profiles. Attendance shows only for students enrolled in your courses.</p>
          </div>
        </div>

        <div className="mb-4 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
              placeholder="Search name, email, student ID…"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {list.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500">No students found.</p>
                <p className="mt-2 text-sm text-slate-400">Students appear here after they create a student account.</p>
                <Link
                  to="/courses"
                  className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Go to Courses and Add Student
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.map((s) => (
                  <li key={s._id}>
                    <Link
                      to={`/students/${s._id}`}
                      className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                        {s.firstName?.charAt(0)}
                        {s.lastName?.charAt(0) || ''}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="truncate text-sm text-slate-500">{s.email}</p>
                        {s.studentId && <p className="text-xs text-slate-400">ID: {s.studentId}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-slate-100 p-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
