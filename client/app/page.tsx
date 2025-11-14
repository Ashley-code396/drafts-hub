"use client";
import { useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Topbar } from "../components/Topbar";
import { Sidebar } from "../components/Sidebar";
import { EditorCanvas } from "../components/EditorCanvas";
import { RightPanel, type Version } from "../components/RightPanel";

export default function Home() {
  const [versions, setVersions] = useState<Version[]>([]);
  const snapshotProviderRef = useRef<null | (() => { text: string; doc: any; media: { type: string; src: string; title?: string }[] })>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleCommit = async () => {
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
            },
          });
          counter += 1;
        } catch {
          // skip any media that can't be fetched
        }
      }
      // Attach Walrus-native metadata JSON under reserved field name `_metadata`
      try {
        fd.append("_metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      } catch {
        // Fallback: append as simple string
        fd.append("_metadata", JSON.stringify(metadata));
      }
      const qs = new URLSearchParams({ epochs: "1", permanent: "true" }).toString();
      const walrusRes = await fetch(`${publisher}/v1/quilts?${qs}`, { method: "PUT", body: fd });
      if (!walrusRes.ok) {
        // Fallback to stub route to ensure demo flow continues
        const stub = await fetch("/api/commit", { method: "POST" }).then((r) => r.json());
        alert(`Committed (stub fallback)\nCID: ${stub.cid}\nHash: ${stub.hash}`);
      } else {
        const out = await walrusRes.json();
        const quiltId = out?.blobStoreResult?.newlyCreated?.blobObject?.blobId || out?.alreadyCertified?.blobId || out?.blobId;
        const patchesArr: Array<{ identifier: string; quiltPatchId: string }> = Array.isArray(out?.storedQuiltBlobs)
          ? out.storedQuiltBlobs
          : [];
        const patches = patchesArr.length ? patchesArr.map((p: any) => `${p.identifier}: ${p.quiltPatchId}`).join("\n") : "";
        // Store Quilt IDs into the latest version entry
        if (latestVersionId) {
          setVersions((prev) => prev.map((it) => (it.id === latestVersionId ? { ...it, quiltId, patches: patchesArr } as any : it)));
        }
        alert(`Committed to Walrus\nQuilt ID: ${quiltId || "(see console)"}\n${patches ? `Patches:\n${patches}` : ""}`);
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
      right={<RightPanel versions={versions} />}
    >
      <EditorCanvas
        registerSnapshotProvider={(fn) => {
          snapshotProviderRef.current = fn;
        }}
      />
    </AppShell>
  );
}
