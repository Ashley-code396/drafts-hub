"use client";
import React from "react";

export function Topbar({ onCommit }: { onCommit?: () => void }) {
  return (
    <div className="flex h-14 items-center gap-3 px-4">
      <div className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="inline-block h-6 w-6 rounded bg-black dark:bg-white" />
        <span>Drafts Hub</span>
      </div>
      <div className="mx-4 flex-1">
        <input
          type="text"
          placeholder="Search drafts by meaning..."
          className="w-full rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/50 dark:focus:border-white/20"
        />
      </div>
      <button
        onClick={onCommit}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
      >
        Commit draft
      </button>
      <button className="ml-2 h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" aria-label="Account" />
    </div>
  );
}
