"use client";
import React from "react";

export function CommitButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
    >
      Commit draft
    </button>
  );
}
