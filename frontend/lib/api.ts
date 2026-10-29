import type { Paginated } from "./types";

const ACCESS_KEY = "primeschool.access";
const REFRESH_KEY = "primeschool.refresh";
const LEGACY_ACCESS_KEY = "primex.access";
const LEGACY_REFRESH_KEY = "primex.refresh";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }

  /** Flattens DRF field errors into a single readable line. */
  get readable(): string {
    const detail = this.detail as Record<string, unknown> | string | undefined;
    if (!detail) return this.message;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object") {
      const parts = Object.entries(detail).map(([field, value]) =>
        field === "detail" ? String(value) : `${field}: ${Array.isArray(value) ? value.join(", ") : value}`
      );
      if (parts.length) return parts.join(" · ");
    }
    return this.message;
  }
}

export const tokens = {
  get access() {
    if (typeof window === "undefined") return null;
    const access = window.localStorage.getItem(ACCESS_KEY) ?? window.localStorage.getItem(LEGACY_ACCESS_KEY);
    if (access) {
      window.localStorage.setItem(ACCESS_KEY, access);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
    }
    return access;
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    const refresh = window.localStorage.getItem(REFRESH_KEY) ?? window.localStorage.getItem(LEGACY_REFRESH_KEY);
    if (refresh) {
      window.localStorage.setItem(REFRESH_KEY, refresh);
      window.localStorage.removeItem(LEGACY_REFRESH_KEY);
    }
    return refresh;
  },
  save(access: string, refresh?: string) {
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.removeItem(LEGACY_ACCESS_KEY);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
    window.localStorage.removeItem(LEGACY_REFRESH_KEY);
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(LEGACY_ACCESS_KEY);
    window.localStorage.removeItem(LEGACY_REFRESH_KEY);
  },
};

function buildUrl(path: string, params?: Record<string, unknown>) {
  const url = path.startsWith("/api") ? path : `/api${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${url}${url.includes("?") ? "&" : "?"}${query}` : url;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  const response = await fetch("/api/auth/token/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  tokens.save(data.access);
  return true;
}

async function request<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const access = tokens.access;
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return request<T>(method, path, body, params, false);
  }
  if (response.status === 204) return undefined as T;
  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}

export const api = {
  get: <T,>(path: string, params?: Record<string, unknown>) => request<T>("GET", path, undefined, params),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T,>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T,>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: (path: string) => request<void>("DELETE", path),
  /** Fetches a list endpoint and unwraps DRF pagination. */
  list: async <T,>(path: string, params?: Record<string, unknown>) => {
    const data = await request<Paginated<T> | T[]>("GET", path, undefined, { page_size: 500, ...params });
    return Array.isArray(data) ? data : data.results;
  },
};

export async function login(username: string, password: string) {
  const response = await fetch("/api/auth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload);
  tokens.save(payload.access, payload.refresh);
  return payload.user;
}

export async function signupOwner(data: {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}) {
  const response = await fetch("/api/auth/owner-signup/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload.user;
}
