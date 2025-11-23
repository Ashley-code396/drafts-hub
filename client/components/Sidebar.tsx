"use client";
import React from "react";
import { CreateAllowlist } from "../app/allowlist/CreateAllowlist";

export function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          <input type="file" multiple className="hidden" />
          <span className="inline-block h-4 w-4 rounded bg-black dark:bg-white" />
          Upload
        </label>
      </div>
      
      {/* Allowlist Section */}
      <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-500">Allowlist</h3>
        <CreateAllowlist />
      </div>
      <nav className="px-2 pb-4 text-sm">
        <div className="px-2 py-1.5 font-medium text-zinc-500">Filters</div>
        <ul className="space-y-1">
          {[
            { key: "all", label: "All" },
            { key: "text", label: "Text" },
            { key: "images", label: "Images" },
            { key: "video", label: "Video" },
            { key: "audio", label: "Audio" },
            { key: "revival", label: "Revival" },
          ].map((f) => (
            <li key={f.key}>
              <button className="w-full rounded-md px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900/60">
                {f.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="px-2 py-2 font-medium text-zinc-500">Smart folders</div>
        <ul className="space-y-1">
          {[
            { key: "recent", label: "Recent" },
            { key: "clusters", label: "Suggested clusters" },
          ].map((f) => (
            <li key={f.key}>
              <button className="w-full rounded-md px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900/60">
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
