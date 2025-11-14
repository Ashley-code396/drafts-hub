"use client";
import React from "react";

export function AppShell({
  topbar,
  sidebar,
  right,
  children,
}: {
  topbar: React.ReactNode;
  sidebar: React.ReactNode;
  right: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur">
        {topbar}
      </header>
      <div className="grid flex-1 grid-cols-[260px_1fr_320px] gap-0">
        <aside className="border-r border-black/10 dark:border-white/10 overflow-y-auto">
          {sidebar}
        </aside>
        <main className="overflow-y-auto">
          {children}
        </main>
        <aside className="border-l border-black/10 dark:border-white/10 overflow-y-auto">
          {right}
        </aside>
      </div>
    </div>
  );
}
