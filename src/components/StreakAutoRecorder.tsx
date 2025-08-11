import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStreakTracker } from "@/hooks/useStreakTracker";

// Automatically records a daily streak activity when a logged-in user visits the site.
// Uses localStorage to avoid duplicate calls within the same day, while the
// database function ensures idempotency if called multiple times.
const StreakAutoRecorder = () => {
  const { user } = useAuth();
  const { recordActivity } = useStreakTracker();
  const mountedOnce = useRef(false);

  useEffect(() => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const storageKey = `streak:lastRecord:${user.id}`;

    const recordIfNeeded = async () => {
      const last = localStorage.getItem(storageKey);
      if (last !== today) {
        try {
          await recordActivity();
        } finally {
          localStorage.setItem(storageKey, today);
        }
      }
    };

    // Prevent double-run on React StrictMode dev mounts
    if (!mountedOnce.current) {
      mountedOnce.current = true;
      void recordIfNeeded();
    }

    // Also handle when the user brings the tab to foreground on a new day
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const nowDay = new Date().toISOString().split("T")[0];
      const last = localStorage.getItem(storageKey);
      if (last !== nowDay) {
        recordActivity().finally(() => localStorage.setItem(storageKey, nowDay));
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user]);

  return null;
};

export default StreakAutoRecorder;
