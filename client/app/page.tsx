"use client";
import { useRef, useState, useEffect } from "react";
import { AppShell } from "../components/AppShell";
import { Topbar } from "../components/Topbar";
import { Sidebar } from "../components/Sidebar";
import { EditorCanvas } from "../components/EditorCanvas";
import { RightPanel, type Version } from "../components/RightPanel";
import { useNetworkVariable } from "./networkConfig";
import { generateFileHash, arrayBufferToBase64, base64ToArrayBuffer } from "./crypto";
import { getSealClient, encryptBytes, decryptBytes, createSessionKey } from "./seal";
import { SuiClient } from '@mysten/sui/client';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { Button } from '@radix-ui/themes';

export default function Home() {
  const [versions, setVersions] = useState<Version[]>([]);
  const snapshotProviderRef = useRef<null | (() => { text: string; doc: any; media: { type: string; src: string; title?: string }[] })>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const STORAGE_KEY = "draftshub_versions_v1";
  const suiClient = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null);
  const packageId = useNetworkVariable('packageId');
  
  // Wallet connection
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const isConnected = !!account?.address;

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
    } catch { }
  }, []);

  // Persist versions on change
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
      }
    } catch { }
  }, [versions]);

  const handleCommit = async (opts?: { epochs?: number; permanent?: boolean }) => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!snapshotProviderRef.current) return;
    const snap = snapshotProviderRef.current();
    if (!snap) return;

    let latestVersionId: string | null = null;
    try {
      setIsCommitting(true);
      const publisher = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";
      const fd = new FormData();
      const metadata: Array<{ identifier: string; tags: Record<string, string> }> = [];
      // Add draft text as a file in the quilt (encrypted with Seal)
      {
        const raw = new TextEncoder().encode(snap.text || "");
        const blob = new Blob([raw], { type: "text/plain" });
        const file = new File([blob], "draft.txt");
        const fileHash = await generateFileHash(file);

        // Encrypt the file
        const sealClient = getSealClient(suiClient);
        const sessionKey = account?.address ? await createSessionKey(
          suiClient,
          account.address,
          packageId,
          'allowlist',
          60 // 1 hour TTL
        ) : null;
        if (!sessionKey) throw new Error('Failed to create session key');

        const { encrypted, id: encryptionId } = await encryptBytes(
          { data: new Uint8Array(await file.arrayBuffer()) },
          suiClient
        );
        // Normalize Uint8Array<ArrayBufferLike> → Uint8Array<ArrayBuffer>
        const normalizedEncrypted = new Uint8Array(encrypted);

        // OR safer:
        // const normalizedEncrypted = new Uint8Array(encrypted.buffer.slice(0));

        const encryptedBlob = new Blob([normalizedEncrypted], {
          type: 'application/octet-stream',
        });

        const encryptedFileName = `draft.txt.enc`;

        fd.append(encryptedFileName, encryptedBlob, encryptedFileName);
        metadata.push({
          identifier: encryptedFileName,
          tags: {
            type: "text",
            mime: "application/octet-stream",
            createdAt: String(Date.now()),
            permanent: String(opts?.permanent ?? true),
            epochs: String(opts?.epochs ?? 1),
            fileHash: fileHash,
            encryptionId: encryptionId,
            isEncrypted: "true",
            originalName: "draft.txt"
          },
        });
      }
      // Attach media files
      let counter = 0;
      for (const m of snap.media) {
        try {
          const blob = await fetch(m.src).then((r) => r.blob());
          const ext = blob.type.startsWith("image/") ? (blob.type.split("/")[1] || "img") : blob.type.startsWith("video/") ? (blob.type.split("/")[1] || "mp4") : blob.type.startsWith("audio/") ? (blob.type.split("/")[1] || "mp3") : "bin";
          const base = m.title?.replace(/[^a-z0-9-_]/gi, "_") || `${m.type}-${counter}`;
          const filename = `${base || m.type}-${counter}.${ext}`;
          const file = new File([blob], filename, { type: blob.type });
          const fileHash = await generateFileHash(file);

          // Encrypt the media file
          const sealClient = getSealClient(suiClient);
          const sessionKey = await createSessionKey(
            suiClient,
            account.address, // Use the connected wallet's address
            packageId,
            'allowlist',
            60 // 1 hour TTL
          );

          const { encrypted, id: encryptionId } = await encryptBytes(
            { data: new Uint8Array(await file.arrayBuffer()) },
            suiClient
          );
          // Normalize Uint8Array<ArrayBufferLike> → Uint8Array<ArrayBuffer>
          const normalizedEncrypted = new Uint8Array(encrypted);

          // OR safer:
          // const normalizedEncrypted = new Uint8Array(encrypted.buffer.slice(0));

          const encryptedBlob = new Blob([normalizedEncrypted], {
            type: 'application/octet-stream',
          });

          const encryptedFileName = `${filename}.enc`;

          fd.append(encryptedFileName, encryptedBlob, encryptedFileName);
          metadata.push({
            identifier: encryptedFileName,
            tags: {
              type: m.type,
              mime: 'application/octet-stream',
              createdAt: String(Date.now()),
              permanent: String(opts?.permanent ?? true),
              epochs: String(opts?.epochs ?? 1),
              fileHash: fileHash,
              encryptionId: encryptionId,
              isEncrypted: "true",
              originalName: filename,
              originalMime: blob.type
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
        } catch { }
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
        const deletable = (out?.blobStoreResult?.newlyCreated?.blobObject?.deletable ?? out?.alreadyCertified?.deletable) as boolean | undefined;
        const permanentFlag = deletable === false;
        const startEpoch = out?.blobStoreResult?.newlyCreated?.blobObject?.storage?.startEpoch;
        const endEpoch = out?.blobStoreResult?.newlyCreated?.blobObject?.storage?.endEpoch;
        const epochsFromStorage = typeof startEpoch === 'number' && typeof endEpoch === 'number' ? Math.max(0, endEpoch - startEpoch) : undefined;
        const epochsFromOp = out?.blobStoreResult?.newlyCreated?.resourceOperation?.registerFromScratch?.epochsAhead;
        const epochsCount = (typeof opts?.epochs === 'number' ? opts?.epochs : undefined) ?? (typeof epochsFromOp === 'number' ? epochsFromOp : undefined) ?? epochsFromStorage;
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
                  permanent: permanentFlag ?? ver.permanent,
                  epochs: typeof epochsCount === 'number' ? epochsCount : ver.epochs,
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

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Welcome to DraftsHub</h1>
          <p className="mb-6">Connect your wallet to get started</p>
          <div className="w-64 mx-auto">
            <ConnectButton connectText="Connect Wallet" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      topbar={<Topbar onCommit={handleCommit} isCommitting={isCommitting} walletAddress={account?.address} onDisconnect={disconnect} />}
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
