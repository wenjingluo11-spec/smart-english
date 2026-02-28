"use client";

import { useState, useRef, useCallback } from "react";

export interface TimelineEvent {
  startMs: number;
  endMs: number;
  data: unknown;
}

export interface Timeline {
  name: string;
  events: TimelineEvent[];
}

interface ActiveEvent {
  timeline: string;
  event: TimelineEvent;
  type: "enter" | "leave";
}

interface UseSyncTimelineOptions {
  onEvent?: (active: ActiveEvent) => void;
}

/**
 * Multi-timeline orchestrator — coordinates named timelines against a single master clock.
 * The master clock can be driven externally via setCurrentMs or via internal play/pause.
 */
export function useSyncTimeline(options?: UseSyncTimelineOptions) {
  const [currentMs, setCurrentMsState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const timelinesRef = useRef<Map<string, TimelineEvent[]>>(new Map());
  const activeEventsRef = useRef<Map<string, Set<number>>>(new Map());
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const checkEvents = useCallback((ms: number) => {
    timelinesRef.current.forEach((events, name) => {
      if (!activeEventsRef.current.has(name)) {
        activeEventsRef.current.set(name, new Set());
      }
      const activeSet = activeEventsRef.current.get(name)!;

      events.forEach((evt, i) => {
        const isInside = ms >= evt.startMs && ms < evt.endMs;
        const wasActive = activeSet.has(i);

        if (isInside && !wasActive) {
          activeSet.add(i);
          onEventRef.current?.({ timeline: name, event: evt, type: "enter" });
        } else if (!isInside && wasActive) {
          activeSet.delete(i);
          onEventRef.current?.({ timeline: name, event: evt, type: "leave" });
        }
      });
    });
  }, []);

  const tick = useCallback(() => {
    const ms = performance.now() - startTimeRef.current + offsetRef.current;
    setCurrentMsState(ms);
    checkEvents(ms);
    rafRef.current = requestAnimationFrame(tick);
  }, [checkEvents]);

  const registerTimeline = useCallback((name: string, events: TimelineEvent[]) => {
    timelinesRef.current.set(name, events);
    activeEventsRef.current.set(name, new Set());
  }, []);

  const unregisterTimeline = useCallback((name: string) => {
    timelinesRef.current.delete(name);
    activeEventsRef.current.delete(name);
  }, []);

  const play = useCallback(() => {
    if (isPlaying) return;
    startTimeRef.current = performance.now();
    offsetRef.current = currentMs;
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, currentMs, tick]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const seek = useCallback((ms: number) => {
    offsetRef.current = ms;
    startTimeRef.current = performance.now();
    setCurrentMsState(ms);
    // Reset active events on seek
    activeEventsRef.current.forEach((set) => set.clear());
    checkEvents(ms);
  }, [checkEvents]);

  const setCurrentMs = useCallback((ms: number) => {
    seek(ms);
  }, [seek]);

  return {
    currentMs,
    isPlaying,
    registerTimeline,
    unregisterTimeline,
    play,
    pause,
    seek,
    setCurrentMs,
  };
}
