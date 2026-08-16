import { request, toQueryString } from "@/lib/api/http";
import type { Course, PaginatedResult } from "@/lib/types";

export interface ListCoursesParams {
  track?: string;
  page?: number;
  pageSize?: number;
}

export function listCourses(params?: ListCoursesParams, next?: NextFetchRequestConfig) {
  return request<PaginatedResult<Course>>(`/courses${toQueryString(params)}`, {
    skipCredentials: true,
    next: next ?? { revalidate: 60 },
  });
}

export function getCourse(id: string, next?: NextFetchRequestConfig) {
  return request<Course>(`/courses/${id}`, {
    skipCredentials: true,
    next: next ?? { revalidate: 60 },
  });
}

export interface CoursePayload {
  title: string;
  slug: string;
  track: string;
  summary: string;
  description: string;
  priceMinor: number;
  currency: string;
  durationWeeks: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export function createCourse(payload: CoursePayload, accessToken: string) {
  return request<Course>("/courses", { method: "POST", body: payload, accessToken });
}

export function updateCourse(id: string, payload: Partial<CoursePayload>, accessToken: string) {
  return request<Course>(`/courses/${id}`, { method: "PATCH", body: payload, accessToken });
}

export function deleteCourse(id: string, accessToken: string) {
  return request<void>(`/courses/${id}`, { method: "DELETE", accessToken });
}
