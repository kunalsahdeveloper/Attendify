import type { Class, ClassTimetableSlot } from '@/types';

/** Effective meeting times for a class (prefers `timetable`, falls back to legacy `schedule`). */
export function ensureTimetable(cls: Class | undefined | null): ClassTimetableSlot[] {
  if (!cls) return [];
  if (cls.timetable && cls.timetable.length > 0) {
    return cls.timetable.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room ?? '',
    }));
  }
  if (cls.schedule && cls.schedule.dayOfWeek != null) {
    return [
      {
        dayOfWeek: cls.schedule.dayOfWeek,
        startTime: cls.schedule.startTime,
        endTime: cls.schedule.endTime,
        room: cls.schedule.room ?? '',
      },
    ];
  }
  return [];
}

export function classMeetsOnDay(cls: Class, day: number) {
  return ensureTimetable(cls).some((s) => s.dayOfWeek === day);
}

export function formatTimetableLine(slot: ClassTimetableSlot, dayNames: string[]) {
  const d = dayNames[slot.dayOfWeek] ?? '—';
  return `${d} ${slot.startTime}–${slot.endTime}${slot.room ? ` · ${slot.room}` : ''}`;
}
