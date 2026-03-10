export const API_BASE = "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const body = await parseJsonSafe<{ detail?: string } & T>(res);
  if (!res.ok) {
    throw new ApiError(body?.detail || "请求失败", res.status);
  }
  return body as T;
}

export function toErrorMessage(err: unknown, fallback = "未知错误") {
  if (err instanceof Error) return err.message;
  return fallback;
}
