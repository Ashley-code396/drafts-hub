"use client";
import React from "react";

export function RightPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/10 p-3 text-sm font-medium text-zinc-600 dark:border-white/10">Timeline</div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {[1, 2, 3].map((v) => (
          <div key={v} className="rounded-md border border-black/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-zinc-900">
            Version v{v}
          </div>
        ))}
      </div>
      <div className="border-t border-black/10 p-3 text-sm dark:border-white/10">
        <div className="mb-2 font-medium text-zinc-600">Tags</div>
        <div className="flex flex-wrap gap-2">
          {["skit", "meme", "b-roll"].map((t) => (
            <span key={t} className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t}</span>
          ))}
        </div>
        <button className="mt-4 w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
          Protect My Draft
        </button>
      </div>
    </div>
  );
}
