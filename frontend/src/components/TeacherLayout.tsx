import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import {
  BarChart2,
  BookOpen,
  GraduationCap,
  Layout,
  LogOut,
  QrCode,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: Layout, label: 'Overview' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
  { to: '/students', icon: GraduationCap, label: 'Students' },
  { to: '/session', icon: QrCode, label: 'QR Session' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    user
      ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
      : 'T';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col bg-slate-950 text-white">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-800 px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-1.5">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Attendify</span>
          </div>
          {user?.role === 'admin' && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Admin
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-800 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
