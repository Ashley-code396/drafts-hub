"use client";
import React from "react";

export function EditorCanvas() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-4 text-xs uppercase tracking-wide text-zinc-500">Editor</div>
      <div className="min-h-[320px] rounded-lg border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <p className="text-zinc-500">Rich text + media editor coming next (TipTap).</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          "Improve clarity",
          "Fix grammar",
          "Rewrite in friendly tone",
          "Generate image for this idea",
        ].map((label) => (
          <button
            key={label}
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
