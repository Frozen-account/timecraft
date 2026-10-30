"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ALL_WORKSPACES, type WorkspaceFilter } from "@/lib/types";
import { isWorkspaceFilter } from "@/lib/workspaces";

const STORAGE_KEY = "timecraft:workspace:v1";
const PARAM = "workspace";
const CHANGE_EVENT = "timecraft:workspace-change";

function readUrl(): WorkspaceFilter | null {
  const v = new URLSearchParams(window.location.search).get(PARAM);
  return isWorkspaceFilter(v) ? v : null;
}

function readStorage(): WorkspaceFilter | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isWorkspaceFilter(v) ? v : null;
  } catch {
    return null; // private mode / blocked site data
  }
}

// The URL wins over localStorage so a shared link opens in the workspace it names.
// Deliberately not useSearchParams: reading it would opt every page out of static
// prerendering, and the param is only ever consumed by client-side filtering.
const getSnapshot = (): WorkspaceFilter => readUrl() ?? readStorage() ?? ALL_WORKSPACES;

// Prerender and hydration both start from the aggregate view; useSyncExternalStore
// re-reads the real value right after hydration, so there is no markup mismatch.
const getServerSnapshot = (): WorkspaceFilter => ALL_WORKSPACES;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange); // back/forward
  window.addEventListener(CHANGE_EVENT, onChange); // this tab
  window.addEventListener("storage", onChange); // another tab
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// replaceState, not push: switching workspace should not add history entries.
function writeUrl(next: WorkspaceFilter) {
  const url = new URL(window.location.href);
  if (next === ALL_WORKSPACES) url.searchParams.delete(PARAM);
  else url.searchParams.set(PARAM, next);
  if (url.href !== window.location.href) window.history.replaceState(null, "", url);
}

/**
 * Active workspace, shared by every component through the URL + localStorage pair rather than
 * React state — so a page can read it without a context provider above it in the tree.
 */
export function useWorkspace(): { workspace: WorkspaceFilter; setWorkspace: (next: WorkspaceFilter) => void } {
  const workspace = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setWorkspace = useCallback((next: WorkspaceFilter) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the workspace just will not persist across reloads.
    }
    writeUrl(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { workspace, setWorkspace };
}

/**
 * Keeps the URL in step with a workspace restored from localStorage, so the address bar is
 * always shareable. Mounted once in the layout; it updates an external system (history) and
 * holds no state of its own.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { workspace } = useWorkspace();

  useEffect(() => {
    writeUrl(workspace);
  }, [workspace]);

  return <>{children}</>;
}
