import { request, toQueryString } from "@/lib/api/http";
import type { CourseGroup, CourseGroupStatus, PaginatedResult } from "@/lib/types";

export interface ListCourseGroupsParams {
  courseId?: string;
  page?: number;
  limit?: number;
}

// GET /course-groups is paginated on the backend (PaginatedResult<...>),
// not a bare array — see CourseGroupsController.findPublished.
export function listCourseGroups(params?: ListCourseGroupsParams, next?: NextFetchRequestConfig) {
  return request<PaginatedResult<CourseGroup>>(`/course-groups${toQueryString(params)}`, {
    skipCredentials: true,
    next: next ?? { revalidate: 60 },
  });
}

export function getCourseGroup(id: string, accessToken?: string) {
  return request<CourseGroup>(`/course-groups/${id}`, { accessToken, skipCredentials: !accessToken });
}

// Mirrors CreateCourseGroupDto exactly. There is no Telegram field on this
// resource at all — a group is linked to a Telegram chat separately via
// POST /telegram/admin/link-group (see lib/api/telegram.ts), because the
// FK lives on the TelegramGroup row, not on CourseGroup.
export interface CourseGroupPayload {
  courseId: string;
  name: string;
  startDate: string;
  endDate?: string;
  schedule: string;
  teacherId?: string;
  capacity?: number;
}

export function createCourseGroup(payload: CourseGroupPayload, accessToken: string) {
  return request<CourseGroup>("/course-groups", { method: "POST", body: payload, accessToken });
}

export function updateCourseGroup(
  id: string,
  payload: Partial<Omit<CourseGroupPayload, "courseId">> & { status?: CourseGroupStatus },
  accessToken: string,
) {
  return request<CourseGroup>(`/course-groups/${id}`, { method: "PATCH", body: payload, accessToken });
}

export function deleteCourseGroup(id: string, accessToken: string) {
  return request<void>(`/course-groups/${id}`, { method: "DELETE", accessToken });
}
