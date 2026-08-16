import { request, toQueryString } from "@/lib/api/http";
import type { CourseGroup } from "@/lib/types";

export interface ListCourseGroupsParams {
  courseId?: string;
}

export function listCourseGroups(params?: ListCourseGroupsParams, next?: NextFetchRequestConfig) {
  return request<CourseGroup[]>(`/course-groups${toQueryString(params)}`, {
    skipCredentials: true,
    next: next ?? { revalidate: 60 },
  });
}

export function getCourseGroup(id: string, accessToken?: string) {
  return request<CourseGroup>(`/course-groups/${id}`, { accessToken, skipCredentials: !accessToken });
}

export interface CourseGroupPayload {
  courseId: string;
  title: string;
  startDate: string;
  endDate: string;
  capacity: number;
  telegramGroupChatId?: string;
}

export function createCourseGroup(payload: CourseGroupPayload, accessToken: string) {
  return request<CourseGroup>("/course-groups", { method: "POST", body: payload, accessToken });
}

export function updateCourseGroup(
  id: string,
  payload: Partial<CourseGroupPayload> & { status?: CourseGroup["status"] },
  accessToken: string,
) {
  return request<CourseGroup>(`/course-groups/${id}`, { method: "PATCH", body: payload, accessToken });
}

export function deleteCourseGroup(id: string, accessToken: string) {
  return request<void>(`/course-groups/${id}`, { method: "DELETE", accessToken });
}
