import type { CourseGroup, CourseGroupStatus } from '@prisma/client';

export interface CourseGroupWithTelegram extends CourseGroup {
  telegramGroup?: { id: string } | null;
}

export interface CourseGroupResponse {
  id: string;
  courseId: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  schedule: string;
  teacherId: string | null;
  capacity: number | null;
  status: CourseGroupStatus;
  // Derived from the related TelegramGroup row's own id — see the schema
  // comment on TelegramGroup for why the FK lives on that side of the
  // relationship rather than as a literal column here. Null until a
  // TelegramGroup has actually been linked (a future TelegramModule
  // concern, not something this module's create/update DTOs manage).
  telegramGroupId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toCourseGroupResponse(group: CourseGroupWithTelegram): CourseGroupResponse {
  return {
    id: group.id,
    courseId: group.courseId,
    name: group.name,
    startDate: group.startDate,
    endDate: group.endDate,
    schedule: group.schedule,
    teacherId: group.teacherId,
    capacity: group.capacity,
    status: group.status,
    telegramGroupId: group.telegramGroup?.id ?? null,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}
