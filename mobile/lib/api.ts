import { getToken } from "./auth";

const API_BASE = "http://localhost:8001";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, uri: string, extraFields?: Record<string, string>): Promise<T> => {
    const token = await getToken();
    const form = new FormData();
    const filename = uri.split("/").pop() || "file";
    const ext = filename.split(".").pop() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    form.append("file", { uri, name: filename, type: mimeType } as any);
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) form.append(k, v);
    }
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || res.statusText);
    }
    return res.json();
  },
};

/**
 * SSE 流式请求 — RN 的 fetch 不支持 ReadableStream，
 * 用 XMLHttpRequest.onprogress 替代。
 */
export function streamChat(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (text: string) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const token = await getToken();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/chat/send`);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    let lastIndex = 0;
    xhr.onprogress = () => {
      const newText = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      for (const line of newText.split("\n")) {
        if (line.startsWith("data: ")) {
          onChunk(line.slice(6));
        }
      }
    };
    xhr.onload = () => resolve();
    xhr.onerror = () => reject(new Error("SSE 连接失败"));
    xhr.send(JSON.stringify({ message, history }));
  });
}
