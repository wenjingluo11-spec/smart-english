import { api } from "@/lib/api";

const MODULE_MAP: Record<string, string> = {
  "/practice": "practice",
  "/reading": "reading",
  "/writing": "writing",
  "/vocabulary": "vocabulary",
  "/exam": "exam",
  "/tutor": "tutor",
  "/story": "story",
  "/grammar": "grammar",
  "/arena": "arena",
  "/clinic": "clinic",
  "/errors": "practice",
  "/textbook": "textbook",
};

let intervalId: ReturnType<typeof setInterval> | null = null;

function getModule(pathname: string): string | null {
  for (const [prefix, module] of Object.entries(MODULE_MAP)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return module;
    }
  }
  return null;
}

export function startTimeTracker() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    const pathname = window.location.pathname;
    const module = getModule(pathname);
    if (module) {
      api.post("/stats/time-log?module=" + encodeURIComponent(module), {}).catch(() => {});
    }
  }, 60_000);
}

export function stopTimeTracker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
