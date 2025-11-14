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

  const handleCommit = async () => {
    try {
      const snap = snapshotProviderRef.current?.();
      if (snap) {
        const v: Version = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          text: snap.text,
          media: snap.media,
        };
        setVersions((prev) => [...prev, v]);
      }
      const res = await fetch("/api/commit", { method: "POST" });
      if (!res.ok) throw new Error("Commit failed");
      const data = await res.json();
      alert(`Committed to Walrus (stub)\nCID: ${data.cid}\nHash: ${data.hash}`);
    } catch (e: any) {
      alert(e?.message || "Commit failed");
    }
  };

  return (
    <AppShell
      topbar={<Topbar onCommit={handleCommit} />}
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
