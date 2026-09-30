"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "techworld:recently-viewed";
const CHANGE_EVENT = "techworld:recently-viewed-change";
const MAX_ITEMS = 12;
const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedIds: string[] = EMPTY;

function readIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedIds;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedRaw = raw;
    cachedIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : EMPTY;
  } catch {
    cachedIds = EMPTY;
  }
  return cachedIds;
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked (private mode, quota): the section simply stays hidden.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Moves a product to the front of this browser's viewing history. */
export function recordRecentlyViewed(productId: string) {
  const next = [productId, ...readIds().filter((id) => id !== productId)].slice(0, MAX_ITEMS);
  writeIds(next);
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Per-browser product history. Empty during SSR so markup never mismatches. */
export function useRecentlyViewed() {
  const ids = useSyncExternalStore(subscribe, readIds, () => EMPTY);
  const clear = useCallback(() => writeIds([]), []);
  return { ids, clear };
}
