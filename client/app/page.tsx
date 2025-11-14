"use client";
import { useRef, useState, useEffect } from "react";
import { AppShell } from "../components/AppShell";
import { Topbar } from "../components/Topbar";
import { Sidebar } from "../components/Sidebar";
import { EditorCanvas } from "../components/EditorCanvas";
import { RightPanel, type Version } from "../components/RightPanel";

export default function Home() {
  const [versions, setVersions] = useState<Version[]>([]);
  const snapshotProviderRef = useRef<null | (() => { text: string; doc: any; media: { type: string; src: string; title?: string }[] })>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const STORAGE_KEY = "draftshub_versions_v1";
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null);

  // Load persisted versions on first mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setVersions(parsed as Version[]);
        }
      }
    } catch {}
  }, []);

  // Persist versions on change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
      }
    } catch {}
  }, [versions]);

  const handleCommit = async (opts?: { epochs?: number; permanent?: boolean }) => {
    try {
      setIsCommitting(true);
      const snap = snapshotProviderRef.current?.();
      let latestVersionId: string | null = null;
      if (snap) {
        const v: Version = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          text: snap.text,
          media: snap.media,
        };
        setVersions((prev) => [...prev, v]);
        // Keep reference to update with Walrus IDs post-upload
        latestVersionId = v.id;
      }
      // Attempt real Walrus upload as a quilt using the public publisher HTTP API
      // Requires images/audio/video to be accessible via object URLs -> we fetch to get Blob
      const publisher = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";
      if (!snap) throw new Error("Nothing to commit");
      const fd = new FormData();
      // Add draft text as a file in the quilt
      fd.append("draft.txt", new Blob([snap.text || ""], { type: "text/plain" }), "draft.txt");
      const metadata: Array<{ identifier: string; tags: Record<string, string> }> = [];
      metadata.push({
        identifier: "draft.txt",
        tags: {
          type: "text",
          mime: "text/plain",
          createdAt: String(Date.now()),
          permanent: String(opts?.permanent ?? true),
          epochs: String(opts?.epochs ?? 1),
        },
      });
      // Attach media files
      let counter = 0;
      for (const m of snap.media) {
        try {
          const blob = await fetch(m.src).then((r) => r.blob());
          const ext = blob.type.startsWith("image/") ? (blob.type.split("/")[1] || "img") : blob.type.startsWith("video/") ? (blob.type.split("/")[1] || "mp4") : blob.type.startsWith("audio/") ? (blob.type.split("/")[1] || "mp3") : "bin";
          const base = m.title?.replace(/[^a-z0-9-_]/gi, "_") || `${m.type}-${counter}`;
          const filename = `${base || m.type}-${counter}.${ext}`;
          fd.append(filename, blob, filename);
          metadata.push({
            identifier: filename,
            tags: {
              type: m.type,
              mime: blob.type || "application/octet-stream",
              title: m.title || filename,
              createdAt: String(Date.now()),
              permanent: String(opts?.permanent ?? true),
              epochs: String(opts?.epochs ?? 1),
            },
          });
          counter += 1;
        } catch {
          // skip any media that can't be fetched
        }
      }
      // Attach Walrus-native metadata JSON under reserved field name `_metadata`
      // Must be a JSON sequence (array) per Walrus schema
      fd.append(
        "_metadata",
        new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
        "_metadata"
      );
      // Build query params from user commit options
      const qsObj: Record<string, string> = {
        epochs: String(opts?.epochs ?? 1),
        permanent: String(opts?.permanent ?? true),
      };
      const qs = new URLSearchParams(qsObj).toString();
      const walrusRes = await fetch(`/api/walrus/quilts${qs ? `?${qs}` : ""}`, { method: "PUT", body: fd });
      if (!walrusRes.ok) {
        // Prefer surfacing real Walrus errors to avoid fake IDs
        let msg = `Walrus error ${walrusRes.status}`;
        try {
          const ct = walrusRes.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await walrusRes.json();
            msg += `\n${JSON.stringify(j, null, 2)}`;
          } else {
            const t = await walrusRes.text();
            msg += `\n${t}`;
          }
        } catch {}
        // Optional dev fallback via env flag
        if (process.env.NEXT_PUBLIC_WALRUS_FALLBACK === "1") {
          const stub = await fetch("/api/commit", { method: "POST" }).then((r) => r.json());
          alert(`Committed (stub fallback)\nCID: ${stub.cid}\nHash: ${stub.hash}`);
        } else {
          throw new Error(msg);
        }
      } else {
        const out = await walrusRes.json();
        const quiltId = out?.blobStoreResult?.newlyCreated?.blobObject?.blobId || out?.alreadyCertified?.blobId || out?.blobId || out?.quiltId;
        const patchesArr: Array<{ identifier: string; quiltPatchId: string }> = Array.isArray(out?.storedQuiltBlobs)
          ? out.storedQuiltBlobs.map((b: any) => ({ identifier: b.identifier || b.name || "", quiltPatchId: b.quiltPatchId || b.patchId || b.blobId || "" }))
          : (Array.isArray(out?.patches) ? out.patches : []);
        if (latestVersionId && (quiltId || patchesArr.length)) {
          setVersions((prev) =>
            prev.map((ver) =>
              ver.id === latestVersionId
                ? {
                    ...ver,
                    quiltId: quiltId || ver.quiltId,
                    patches: Array.isArray(patchesArr) ? patchesArr : ver.patches,
                  }
                : ver
            )
          );
          setAutoExpandId(latestVersionId);
        }
        alert(`Committed to Walrus\nQuilt ID: ${quiltId || "(see console)"}\n${patchesArr.length ? `Patches:\n${patchesArr.map((p) => `${p.identifier}: ${p.quiltPatchId}`).join("\n")}` : ""}`);
        console.log("Walrus response", out);
      }
    } catch (e: any) {
      alert(e?.message || "Commit failed");
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <AppShell
      topbar={<Topbar onCommit={handleCommit} isCommitting={isCommitting} />}
      sidebar={<Sidebar />}
      right={<RightPanel versions={versions} autoExpandVersionId={autoExpandId || undefined} />}
    >
      <EditorCanvas
        registerSnapshotProvider={(fn) => {
          snapshotProviderRef.current = fn;
        }}
      />
    </AppShell>
  );
}
