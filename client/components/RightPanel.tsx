"use client";
import React from "react";

export type Version = {
  id: string;
  createdAt: number;
  text: string;
  media: { type: string; src: string; title?: string }[];
  quiltId?: string;
  patches?: { identifier: string; quiltPatchId: string }[];
};

function diffSnippet(prev: string, curr: string) {
  if (!prev) return { before: "", after: curr.slice(0, 220) };
  let start = 0;
  while (start < prev.length && start < curr.length && prev[start] === curr[start]) start++;
  let endPrev = prev.length - 1;
  let endCurr = curr.length - 1;
  while (endPrev >= start && endCurr >= start && prev[endPrev] === curr[endCurr]) {
    endPrev--; endCurr--;
  }
  const before = prev.slice(Math.max(0, start - 60), Math.min(prev.length, endPrev + 1));
  const after = curr.slice(Math.max(0, start - 60), Math.min(curr.length, endCurr + 1));
  return { before: before.slice(0, 220), after: after.slice(0, 220) };
}

export function RightPanel({ versions }: { versions: Version[] }) {
  const sorted = [...versions].sort((a, b) => b.createdAt - a.createdAt);
  const AGG = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/10 p-3 text-sm font-medium text-zinc-600 dark:border-white/10">Timeline</div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {sorted.length === 0 && (
          <div className="rounded-md border border-dashed border-black/10 p-3 text-sm text-zinc-500 dark:border-white/10">
            No versions yet. Click "Commit draft" to create one.
          </div>
        )}
        {sorted.map((v, idx) => {
          const next = sorted[idx + 1];
          const { before, after } = diffSnippet(next?.text || "", v.text || "");
          return (
            <div key={v.id} className="rounded-md border border-black/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-zinc-900">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span>v{sorted.length - idx}</span>
                <span>{new Date(v.createdAt).toLocaleTimeString()}</span>
              </div>
              {v.quiltId && (
                <div className="mb-2 text-xs">
                  <span className="text-zinc-500">Quilt:</span>{" "}
                  <a
                    href={`${AGG}/v1/blobs/by-quilt-id/${encodeURIComponent(v.quiltId)}/draft.txt`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline dark:text-blue-400"
                  >
                    {v.quiltId}
                  </a>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Prev</div>
                  <div className="rounded-md border border-black/10 p-2 text-zinc-600 dark:border-white/10">
                    {before || <span className="text-zinc-400">—</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Current</div>
                  <div className="rounded-md border border-black/10 p-2 dark:border-white/10">
                    {after || <span className="text-zinc-400">—</span>}
                  </div>
                </div>
              </div>
              {v.media?.length ? (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {v.media.slice(0, 6).map((m, i) => (
                    <div key={`${v.id}-${i}`} className="overflow-hidden rounded border border-black/10 dark:border-white/10">
                      {m.type === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.src} alt={m.title || "image"} className="h-16 w-full object-cover" />
                      )}
                      {m.type === "video" && (
                        <video src={m.src} className="h-16 w-full object-cover" muted />
                      )}
                      {m.type === "audio" && (
                        <div className="p-2 text-[11px] truncate">{m.title || "audio"}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
              {v.patches && v.patches.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {v.patches.slice(0, 6).map((p) => (
                    <div key={p.quiltPatchId} className="truncate">
                      <a
                        href={`${AGG}/v1/blobs/by-quilt-patch-id/${encodeURIComponent(p.quiltPatchId)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline dark:text-blue-400"
                        title={p.identifier}
                      >
                        {p.identifier}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
