import {
  ArrowRight,
  BadgeCheck,
  BarChart,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  Globe,
  Lock,
  QrCode,
  Server,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const APK_URL = import.meta.env.VITE_ANDROID_APK_URL || '/app/student.apk';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* ── NAV ── */}
      <nav className="fixed z-50 w-full border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="flex shrink-0 items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2 text-white shadow-lg shadow-blue-600/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                Attendify
              </span>
            </Link>
            <div className="hidden items-center space-x-8 md:flex">
              <a href="#features" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                Features
              </a>
              <a href="#app" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                Mobile App
              </a>
              <a href="#download" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                Download
              </a>
              <Link to="/login" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                Teacher Login
              </Link>
              <a
                href={APK_URL}
                download
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-black"
              >
                <Download className="h-4 w-4" />
                Get the App
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white pb-20 pt-32 sm:pb-32 sm:pt-48">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white opacity-80" />
        <div className="absolute -right-40 -top-40 h-96 w-96 animate-blob rounded-full bg-blue-400 opacity-10 blur-3xl" />
        <div className="animation-delay-2000 absolute -left-40 top-40 h-96 w-96 animate-blob rounded-full bg-indigo-400 opacity-10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="items-center lg:grid lg:grid-cols-12 lg:gap-16">
            <div className="max-w-2xl text-left lg:col-span-6">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                Enterprise Grade Attendance + LMS Platform
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
                Smart{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  QR Attendance
                </span>{' '}
                &amp; Course Management.
              </h1>
              <p className="mb-10 text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">
                Teachers manage classes, upload notes, and run attendance sessions from a
                powerful web dashboard. Students scan QR codes, view course materials, and
                track their attendance from the Android app.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/40 sm:w-auto"
                >
                  Teacher Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <a
                  href={APK_URL}
                  download
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-4 text-base font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50 sm:w-auto"
                >
                  <Download className="h-5 w-5" />
                  Download Student App
                </a>
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-500">
                {[
                  'QR verified sessions',
                  'Course materials',
                  'Real-time attendance',
                  'Course-wise reports',
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative mt-16 hidden md:block lg:col-span-6 lg:mt-0">
              <div className="relative mx-auto flex aspect-square w-full max-w-lg items-center justify-center overflow-hidden rounded-[2.5rem] border-8 border-slate-800 bg-slate-900 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-dashed border-blue-400/50 bg-blue-900/20 backdrop-blur-sm">
                    <div className="absolute left-0 top-0 h-1 w-full animate-[scan_2s_ease-in-out_infinite] rounded bg-blue-500 shadow-[0_0_15px_3px_rgba(59,130,246,0.6)]" />
                    <QrCode className="h-32 w-32 text-white/90" />
                    <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-4 border-t-4 border-blue-500" />
                    <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-4 border-t-4 border-blue-500" />
                    <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-blue-500" />
                    <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-blue-500" />
                  </div>
                  <div className="mt-8 flex items-center gap-3 rounded-full border border-green-400 bg-green-500/90 px-6 py-3 font-mono text-sm font-semibold text-white backdrop-blur-md">
                    <CheckCircle className="h-4 w-4" />
                    Attendance session active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="border-t border-slate-200 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              A complete attendance &amp; LMS platform
            </h2>
            <p className="text-xl leading-relaxed text-slate-600">
              Everything teachers and students need — attendance, course notes, rosters, and
              real-time session management — in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: QrCode,
                title: 'QR Attendance',
                body: 'Start a session, display a rotating QR code, and students mark themselves present from the mobile app in seconds.',
                color: 'text-blue-600',
                bg: 'bg-blue-100',
              },
              {
                icon: BookOpen,
                title: 'Course Materials',
                body: 'Upload PDFs, slides, and notes per course. Students download materials straight from the Android app.',
                color: 'text-violet-600',
                bg: 'bg-violet-100',
              },
              {
                icon: Users,
                title: 'Roster Management',
                body: 'Add or remove students from courses, track enrollment, and see per-student attendance statistics.',
                color: 'text-rose-600',
                bg: 'bg-rose-100',
              },
              {
                icon: BarChart,
                title: 'Attendance Reports',
                body: 'View class-wise and student-wise attendance summaries, with present, late, and absent breakdowns.',
                color: 'text-orange-600',
                bg: 'bg-orange-100',
              },
              {
                icon: Clock,
                title: 'Live Sessions',
                body: 'Monitor who has checked in as it happens. End sessions manually or let them expire automatically.',
                color: 'text-teal-600',
                bg: 'bg-teal-100',
              },
              {
                icon: Zap,
                title: 'Instant Setup',
                body: 'Create a class, add your students, and run your first attendance session in under five minutes.',
                color: 'text-amber-600',
                bg: 'bg-amber-100',
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="leading-relaxed text-slate-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP SCREENSHOTS ── */}
      <section id="app" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
              <Smartphone className="h-4 w-4" />
              Android App
            </div>
            <h2 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Everything students need, in their pocket
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-600">
              The Attendify student app handles QR scanning, timetable, course-wise
              attendance history, and note downloads.
            </p>
          </div>

          {/* Phone mockup row */}
          <div className="flex flex-wrap items-start justify-center gap-6">
            {[
              { label: 'QR Scanner', icon: QrCode, desc: 'Scan the session QR to mark attendance instantly' },
              { label: 'Timetable', icon: Clock, desc: 'View today\'s schedule at a glance' },
              { label: 'Attendance', icon: BarChart, desc: 'Track attendance per course with detailed stats' },
              { label: 'Materials', icon: BookOpen, desc: 'Download notes and slides uploaded by teachers' },
            ].map((screen) => (
              <div key={screen.label} className="flex flex-col items-center gap-4">
                <div className="flex h-[380px] w-[190px] flex-col items-center justify-between rounded-[2rem] border-4 border-slate-800 bg-slate-950 p-4 shadow-2xl">
                  <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-slate-900">
                    <screen.icon className="h-16 w-16 text-blue-400" />
                    <span className="text-center text-xs font-semibold text-slate-400 px-3">{screen.desc}</span>
                  </div>
                  <div className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    {screen.label}
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700">{screen.label}</span>
              </div>
            ))}
          </div>

          {/* Feature bullets */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: QrCode, text: 'One-tap QR check-in' },
              { icon: Clock, text: 'Day-by-day timetable' },
              { icon: BarChart, text: 'Course-wise attendance %' },
              { icon: BookOpen, text: 'Download class notes' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="rounded-lg bg-blue-600 p-2">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative overflow-hidden bg-slate-950 py-24 text-slate-50">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-20">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-500">How it works</h2>
            <h3 className="mb-6 text-3xl font-extrabold text-white sm:text-5xl">One platform, two user journeys.</h3>
            <p className="max-w-3xl text-xl leading-relaxed text-slate-400">
              Teachers operate from the web dashboard. Students use the Android app. Both connect
              to the same backend so data stays in sync.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Server,
                title: 'Teacher creates course',
                body: 'Log in to the web dashboard, create a course, upload materials, and add students to the roster.',
              },
              {
                icon: QrCode,
                title: 'Start attendance session',
                body: 'Hit "Take Attendance" to generate a rotating QR code. Share your screen — students scan from the app.',
              },
              {
                icon: BarChart,
                title: 'View results live',
                body: 'The dashboard shows who has checked in as it happens. Generate per-student reports any time.',
              },
            ].map((step) => (
              <div key={step.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
                <step.icon className="mb-6 h-10 w-10 text-blue-500" />
                <h4 className="mb-4 text-2xl font-bold text-white">{step.title}</h4>
                <p className="text-lg leading-relaxed text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ROW ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {[
              [Lock, 'JWT + Google Auth', 'Industry-standard secure login for teachers and students'],
              [Zap, 'Instant session start', 'Start and display a QR attendance session in under 3 seconds'],
              [Globe, 'Single deployment', 'Landing, dashboard, and API served from one monorepo'],
              [Star, 'Built for classrooms', 'Designed for real teaching workflows, not generic enterprise'],
            ].map(([Icon, title, body]) => (
              <div key={String(title)}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2.5">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD CTA ── */}
      <section id="download" className="border-y border-indigo-500/30 bg-gradient-to-br from-blue-700 to-indigo-900 py-24">
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center text-white sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Download the Student App
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl font-medium text-blue-100">
            Free Android app. No Play Store account needed — just download and install the APK.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={APK_URL}
              download
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-10 py-4 text-base font-bold text-blue-700 shadow-2xl transition hover:bg-blue-50"
            >
              <Download className="h-5 w-5" />
              Download APK for Android
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Teacher Login
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <p className="mt-8 text-sm text-blue-200">
            Requires Android 8.0+. Enable "Install unknown apps" in your device settings before installing.
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-900 bg-slate-950 pb-10 pt-16 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col items-start justify-between gap-8 md:flex-row">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xl font-bold text-white">
                <ShieldCheck className="h-6 w-6 text-blue-500" />
                Attendify
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-slate-500">
                QR-based attendance management with course materials and roster management for modern classrooms.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#features" className="transition hover:text-white">Features</a></li>
                  <li><a href="#app" className="transition hover:text-white">Mobile App</a></li>
                  <li><a href={APK_URL} download className="transition hover:text-white">Download APK</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Teachers</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/login" className="transition hover:text-white">Sign In</Link></li>
                  <li><Link to="/register" className="transition hover:text-white">Create Account</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-900 pt-8 text-xs font-medium text-slate-600 md:flex-row">
            <p>© {new Date().getFullYear()} Attendify. All rights reserved.</p>
            <Link to="/login" className="transition hover:text-white">Teacher Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
