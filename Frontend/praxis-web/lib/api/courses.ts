import { request, toQueryString } from "@/lib/api/http";
import type { Course, CourseStatus, CourseTrack, PaginatedResult } from "@/lib/types";

// Field names and pagination params mirror QueryCoursesDto exactly — the
// backend's ValidationPipe runs with `forbidNonWhitelisted: true`, so any
// property here that isn't in the DTO (e.g. a `pageSize` instead of
// `limit`) gets the whole request rejected with a 400, not silently
// ignored.
export interface ListCoursesParams {
  track?: CourseTrack;
  search?: string;
  page?: number;
  limit?: number;
}

import {
  findCatalogCourseBySlugOrId,
  getCatalogCoursesByTrack,
  mergeCourseWithCatalog,
} from "@/lib/courses-data";

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

/**
 * Loads a course by its slug or ID. First attempts to fetch from the API;
 * enriches with full catalog curriculum if found, or falls back to the static
 * catalog if the API is unreachable or course is not yet in the DB.
 */
export async function getCourseWithFallback(
  idOrSlug: string,
  next?: NextFetchRequestConfig,
): Promise<Course | null> {
  try {
    const apiCourse = await getCourse(idOrSlug, next);
    if (apiCourse) {
      return mergeCourseWithCatalog(apiCourse);
    }
  } catch {
    // API request failed (e.g. 404 or backend down) — check catalog
  }

  const catalogCourse = findCatalogCourseBySlugOrId(idOrSlug);
  return catalogCourse ?? null;
}

/**
 * Lists courses with fallback to the rich catalog if the API returns no items
 * or cannot be reached.
 */
export async function listCoursesWithFallback(
  params?: ListCoursesParams,
  next?: NextFetchRequestConfig,
): Promise<Course[]> {
  try {
    const result = await listCourses(params, next);
    if (result.data && result.data.length > 0) {
      return result.data.map(mergeCourseWithCatalog);
    }
  } catch {
    // API failed — fall back to catalog
  }

  return getCatalogCoursesByTrack(params?.track);
}

// Mirrors CreateCourseDto exactly. `slug` is optional (auto-derived from
// `title` server-side when omitted); `currency`/`status` are optional and
// default server-side to the course's base currency and DRAFT respectively.
export interface CoursePayload {
  title: string;
  slug?: string;
  description: string;
  track: CourseTrack;
  monthlyPrice: number;
  currency?: string;
  durationDays: number;
  status?: CourseStatus;
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
