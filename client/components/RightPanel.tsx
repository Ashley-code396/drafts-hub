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

export function RightPanel({ versions, autoExpandVersionId }: { versions: Version[]; autoExpandVersionId?: string }) {
  const sorted = [...versions].sort((a, b) => b.createdAt - a.createdAt);
  const AGG = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
  const [expanded, setExpanded] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (autoExpandVersionId) setExpanded(autoExpandVersionId);
  }, [autoExpandVersionId]);
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
            <div
              key={v.id}
              className="rounded-md border border-black/10 bg-white p-3 text-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span>v{sorted.length - idx}</span>
                <div className="flex items-center gap-2">
                  <span>{new Date(v.createdAt).toLocaleTimeString()}</span>
                  <button
                    className="rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setExpanded((e) => (e === v.id ? null : v.id))}
                  >
                    {expanded === v.id ? "Hide media" : "Load from Walrus"}
                  </button>
                </div>
              </div>
              {v.quiltId && (
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <span className="text-zinc-500 shrink-0">Quilt:</span>
                    <code
                      className="block max-w-full truncate rounded bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                      title={v.quiltId}
                    >
                      {v.quiltId}
                    </code>
                  </div>
                  <a
                    href={`${AGG}/v1/blobs/by-quilt-id/${encodeURIComponent(v.quiltId)}/draft.txt`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded border border-black/10 px-2 py-1 text-[11px] hover:bg-zinc-100 dark:border-white/10 dark:hover:bg-zinc-800"
                  >
                    View draft.txt
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
              {expanded === v.id ? (
                v.patches && v.patches.length > 0 ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {v.patches.slice(0, 9).map((p) => {
                      const id = p.identifier || "";
                      const lower = id.toLowerCase();
                      const isImg = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) => lower.endsWith(ext));
                      const isVideo = [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((ext) => lower.endsWith(ext));
                      const isAudio = [".mp3", ".wav", ".ogg", ".m4a", ".flac"].some((ext) => lower.endsWith(ext));
                      const byIdUrl = `${AGG}/v1/blobs/by-quilt-id/${encodeURIComponent(v.quiltId || "")}/${encodeURIComponent(p.identifier)}`;
                      const byPatchUrl = `${AGG}/v1/blobs/by-quilt-patch-id/${encodeURIComponent(p.quiltPatchId)}`;
                      const src = byIdUrl;
                      return (
                        <div key={p.quiltPatchId} className="overflow-hidden rounded border border-black/10 dark:border-white/10">
                          {isImg && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={p.identifier} className="h-16 w-full object-cover" />
                          )}
                          {isVideo && (
                            <video src={src} className="h-16 w-full object-cover" muted controls={false} />
                          )}
                          {isAudio && (
                            <audio src={src} className="w-full" controls />
                          )}
                          <a
                            href={isImg || isVideo || isAudio ? src : byPatchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate px-2 py-1 text-center text-[11px] underline"
                            title={p.identifier}
                          >
                            View on Walrus
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  v.media?.length ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {v.media.slice(0, 9).map((m, i) => (
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
                  ) : null
                )
              ) : null}
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
