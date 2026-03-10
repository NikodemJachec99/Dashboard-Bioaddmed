const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let refreshRequest: Promise<boolean> | null = null;

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.includes("application/json");
}

async function parseError(response: Response) {
  let payload: unknown = null;
  let message = "Request failed";

  if (isJsonResponse(response)) {
    payload = await response.json();
    if (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string") {
      message = payload.detail;
    } else if (payload && typeof payload === "object") {
      const firstValue = Object.values(payload).find((value) => typeof value === "string" || Array.isArray(value));
      if (typeof firstValue === "string") {
        message = firstValue;
      } else if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
        message = firstValue[0];
      }
    }
  } else {
    payload = await response.text();
    if (typeof payload === "string" && payload.trim()) {
      message = payload;
    }
  }

  return new ApiError(response.status, message, payload);
}

function shouldRefresh(path: string) {
  return !path.startsWith("/auth/login/") && !path.startsWith("/auth/refresh/") && !path.startsWith("/auth/password-reset/");
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

async function request<T>(path: string, init?: RequestInit, retryOnUnauthorized = true): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (response.status === 401 && retryOnUnauthorized && shouldRefresh(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, init, false);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJsonResponse(response)) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}
