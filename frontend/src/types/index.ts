export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  studentId?: string;
  teacherId?: string;
  profilePhoto?: string;
  authProvider?: 'local' | 'google';
}

export type ClassTimetableSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
};

export interface Class {
  _id: string;
  name: string;
  code: string;
  description?: string;
  teacher: User;
  students: User[];
  semester: string;
  year: number;
  maxStudents?: number;
  /** Set by API: current user is the course teacher */
  isOwner?: boolean;
  /** First meeting slot; derived from `timetable[0]` when using multi-day timetables. */
  schedule?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string;
  };
  /** Full weekly timetable; preferred when set. */
  timetable?: ClassTimetableSlot[];
}

export type SessionType = 'regular' | 'lab' | 'exam' | 'extra' | 'adjustment';

export interface Session {
  _id: string;
  class: Class;
  sessionType?: SessionType;
  scheduleNote?: string;
  qrCode: {
    uniqueCode: string;
    expiresAt: string;
  };
  geoFence?: {
    enabled: boolean;
    radiusMeters?: number | null;
    teacherLocation?: {
      latitude: number;
      longitude: number;
    } | null;
  };
  status: 'active' | 'ended' | 'expired' | 'cancelled';
  validDuration: number;
  startedAt: string;
  endedAt?: string;
  attendanceCount: {
    present: number;
    absent: number;
    total: number;
  };
}

export interface AttendanceListEntry {
  student: Pick<User, '_id' | 'firstName' | 'lastName' | 'studentId' | 'email'>;
  status: 'present' | 'late' | 'absent' | 'pending';
  scannedAt: string | null;
  attendanceId: string | null;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
  } | null;
}

export interface Attendance {
  _id: string;
  student: User;
  class: Class;
  session: Session;
  status: 'present' | 'late' | 'absent';
  scannedAt: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
  } | null;
}

export interface Material {
  _id: string;
  class: string | Class;
  title: string;
  description?: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: User;
  createdAt: string;
}

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  classCode: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: string;
}
