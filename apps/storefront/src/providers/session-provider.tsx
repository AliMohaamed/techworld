"use client";

import { createContext, useContext, ReactNode, useSyncExternalStore } from "react";
import { v4 as uuidv4 } from "uuid";

interface SessionContextType {
  sessionId: string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

function subscribe() {
  return () => {};
}

function getSnapshot(): string {
  let id = localStorage.getItem("store_session_id");
  if (!id) {
    id = uuidv4();
    localStorage.setItem("store_session_id", id);
  }
  return id;
}

function getServerSnapshot(): string {
  return "";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const sessionId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!sessionId) {
    return null;
  }

  return (
    <SessionContext.Provider value={{ sessionId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}