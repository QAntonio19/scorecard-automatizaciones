"use client";

import { useEffect, useRef, useState } from "react";

/** Mantiene el panel montado el tiempo suficiente para animar el cierre. */
export function usePopoverPresence(open: boolean, transitionMs = 200): {
  mounted: boolean;
  visible: boolean;
} {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafHandlesRef = useRef<number[]>([]);

  useEffect(() => {
    if (closeTimerRef.current !== undefined) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
    rafHandlesRef.current.forEach(cancelAnimationFrame);
    rafHandlesRef.current = [];

    if (open) {
      setMounted(true);
      const h1 = requestAnimationFrame(() => {
        const h2 = requestAnimationFrame(() => setVisible(true));
        rafHandlesRef.current.push(h2);
      });
      rafHandlesRef.current.push(h1);
      return () => {
        rafHandlesRef.current.forEach(cancelAnimationFrame);
        rafHandlesRef.current = [];
      };
    }

    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = undefined;
      setMounted(false);
    }, transitionMs);

    return () => {
      if (closeTimerRef.current !== undefined) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
    };
  }, [open, transitionMs]);

  return { mounted, visible };
}
