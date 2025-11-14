"use client";
import { AppShell } from "../components/AppShell";
import { Topbar } from "../components/Topbar";
import { Sidebar } from "../components/Sidebar";
import { EditorCanvas } from "../components/EditorCanvas";
import { RightPanel } from "../components/RightPanel";

export default function Home() {
  const handleCommit = () => {
    // Placeholder for commit flow (Walrus upload)
    alert("Commit flow coming next: serialize draft -> upload to Walrus -> show CID");
  };

  return (
    <AppShell
      topbar={<Topbar onCommit={handleCommit} />}
      sidebar={<Sidebar />}
      right={<RightPanel />}
    >
      <EditorCanvas />
    </AppShell>
  );
}
