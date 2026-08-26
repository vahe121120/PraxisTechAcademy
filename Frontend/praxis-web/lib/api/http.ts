import type { ApiErrorBody } from "@/lib/types";

const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
const API_URL = RAW_API_URL.endsWith("/api/v1") ? RAW_API_URL : `${RAW_API_URL}/api/v1`;

export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody | null;

  constructor(statusCode: number, body: ApiErrorBody | null, fallbackMessage: string) {
    const message = body
      ? Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message
      : fallbackMessage;
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }

  get isUnauthorized() {
    return this.statusCode === 401;
  }

  get isNotFound() {
    return this.statusCode === 404;
  }

  get isValidation() {
    return this.statusCode === 400 || this.statusCode === 422;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string;
  /** Skip attaching the refresh cookie — only relevant for public reads called from the server. */
  skipCredentials?: boolean;
  /** Next.js fetch cache/revalidate hints, forwarded as-is for SSR/ISR pages. */
  next?: NextFetchRequestConfig;
}

/**
 * Core request function used by every lib/api/*.ts module. Never called
 * directly from components — always through a resource-specific client.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, accessToken, skipCredentials, headers, next, ...rest } = options;

  const finalHeaders: HeadersInit = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: skipCredentials ? "omit" : "include",
      next,
    });
  } catch {
    throw new ApiError(0, null, "Could not reach the server. Check your connection and try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(response.status, payload as ApiErrorBody | null, response.statusText);
  }

  return payload as T;
}

/**
 * Generic rather than `Record<string, ...>` on purpose: TypeScript does not
 * treat a plain params interface (no explicit index signature) as
 * structurally assignable to Record<string, ...> even when every property
 * is compatible. A generic constrained to `object` avoids forcing every
 * params interface in the API layer to carry a redundant index signature.
 */
export function toQueryString<T extends object>(params?: T): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
