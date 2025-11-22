"use client";
import React from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "@radix-ui/themes";

type TopbarProps = {
  onCommit?: (opts: { epochs?: number; permanent?: boolean }) => void;
  isCommitting?: boolean;
  walletAddress?: string;
  onDisconnect?: () => void;
};

export function Topbar({ onCommit, isCommitting = false, walletAddress, onDisconnect }: TopbarProps) {
  const [open, setOpen] = React.useState(false);
  const [epochs, setEpochs] = React.useState<number | ''>("");
  const [permanent, setPermanent] = React.useState(true);
  return (
    <div className="flex h-14 items-center gap-3 px-4">
      <div className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="inline-block h-6 w-6 rounded bg-black dark:bg-white" />
        <span>DraftsHub</span>
      </div>
      <div className="mx-4 flex-1">
        <input
          type="text"
          placeholder="Search drafts by meaning..."
          className="w-full rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/50 dark:focus:border-white/20"
        />
      </div>
      
      {walletAddress ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
          </span>
          <Button 
            variant="soft" 
            size="1" 
            onClick={onDisconnect}
            className="text-xs"
          >
            Disconnect
          </Button>
        </div>
      ) : null}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-black/10 bg-white px-2 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Commit options
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-black/10 bg-white p-3 text-sm shadow-lg dark:border-white/10 dark:bg-zinc-900">
            <div className="mb-2 font-medium text-zinc-700 dark:text-zinc-200">Commit options</div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-zinc-600 dark:text-zinc-300">Permanent</label>
              <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} />
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-zinc-600 dark:text-zinc-300">Epochs (optional)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-zinc-800"
                value={epochs}
                onChange={(e) => {
                  const v = e.target.value;
                  setEpochs(v === '' ? '' : Math.max(1, Number(v)));
                }}
                placeholder="e.g. 10"
              />
            </div>
            <div className="text-[11px] text-zinc-500">Stored in metadata. Actual permanence depends on Walrus policy.</div>
          </div>
        )}
      </div>
      <button
        onClick={() => onCommit?.({ epochs: epochs === '' ? undefined : Number(epochs), permanent })}
        disabled={isCommitting}
        aria-busy={isCommitting}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
      >
        {isCommitting ? "Committing…" : "Commit draft"}
      </button>
      <button className="ml-2 h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" aria-label="Account" />
    </div>
  );
}
