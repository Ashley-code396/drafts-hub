"use client";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "../components/AppShell";
import { Topbar } from "../components/Topbar";
import { Sidebar } from "../components/Sidebar";
import { EditorCanvas } from "../components/EditorCanvas";
import { RightPanel, type Version } from "../components/RightPanel";
import { useNetworkVariables } from "./networkConfig";
import { generateFileHash } from "./crypto";
import { encryptBytes } from "./seal";
import { SuiClient } from '@mysten/sui/client';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';

export default function Home() {
  // Wallet connection
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const isConnected = !!account?.address;
  
  const [versions, setVersions] = useState<Version[]>([]);
  const snapshotProviderRef = useRef<null | (() => { text: string; doc: any; media: { type: string; src: string; title?: string }[] })>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const STORAGE_KEY = "draftshub_versions_v1";
  const suiClient = useMemo(() => new SuiClient({ url: 'https://fullnode.testnet.sui.io' }), []);
  const [autoExpandId, setAutoExpandId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-connect wallet if previously connected
  useEffect(() => {
    const savedWallet = localStorage.getItem('connectedWallet');
    if (savedWallet && !isConnected) {
      // Trigger wallet connection here if your wallet provider supports auto-connect
      // This depends on your wallet provider's API
      console.log('Auto-connecting wallet...');
    }
  }, [isConnected]);

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

  const handleCommit = useCallback(async (opts?: { epochs?: number; permanent?: boolean }) => {
    if (!account?.address) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!snapshotProviderRef.current) {
      setError('No snapshot provider available');
      return;
    }

    const snap = snapshotProviderRef.current();
    if (!snap) {
      setError('Failed to create document snapshot');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const fd = new FormData();
      const metadata: Array<{ identifier: string; tags: Record<string, string> }> = [];
      
      // Handle text content
      const rawText = new TextEncoder().encode(snap.text || "");
      const textBlob = new Blob([rawText], { type: "text/plain" });
      const textFile = new File([textBlob], "draft.txt");
      const textHash = await generateFileHash(textFile);
      
      // Encrypt the text content
      const { encrypted: encryptedText, id: textEncryptionId } = await encryptBytes(
        { data: rawText },
        suiClient
      );
      
      // Convert Uint8Array to ArrayBuffer for Blob
      const encryptedTextArray = new Uint8Array(encryptedText);
      const encryptedTextBlob = new Blob([encryptedTextArray], {
        type: 'application/octet-stream',
      });
      
      const encryptedTextName = `draft_${Date.now()}.txt.enc`;
      fd.append(encryptedTextName, encryptedTextBlob, encryptedTextName);
      
      metadata.push({
        identifier: encryptedTextName,
        tags: {
          type: "seal-encrypted",
          mime: 'text/plain',
          createdAt: new Date().toISOString(),
          permanent: String(opts?.permanent ?? true),
          epochs: String(opts?.epochs ?? 1),
          fileHash: textHash,
          encryptionId: textEncryptionId,
          isEncrypted: "true",
          originalName: "draft.txt",
          originalMime: 'text/plain',
          encryptionMethod: 'seal',
          encryptionTimestamp: String(Date.now())
        }
      });
      
      // Handle media files
      for (const [index, media] of snap.media.entries()) {
        try {
          const response = await fetch(media.src);
          if (!response.ok) throw new Error(`Failed to fetch media: ${response.statusText}`);
          
          const blob = await response.blob();
          const fileExt = media.src.split('.').pop() || 'bin';
          const fileName = media.title ? 
            `${media.title.replace(/[^\w.-]/g, '_')}.${fileExt}` : 
            `media_${Date.now()}_${index}.${fileExt}`;
            
          const file = new File([blob], fileName, { type: blob.type });
          const fileHash = await generateFileHash(file);
          
          // Encrypt the media file
          const fileContent = await file.arrayBuffer();
          const fileBytes = new Uint8Array(fileContent);
          
          const { encrypted, id: mediaEncryptionId } = await encryptBytes(
            { data: fileBytes },
            suiClient
          );
          
          // Convert Uint8Array to ArrayBuffer for Blob
          const encryptedArray = new Uint8Array(encrypted);
          const encryptedBlob = new Blob([encryptedArray], {
            type: 'application/octet-stream',
          });
          
          const encryptedFileName = `${fileName}.enc`;
          
          fd.append(encryptedFileName, encryptedBlob, encryptedFileName);
          
          metadata.push({
            identifier: encryptedFileName,
            tags: {
              type: media.type,
              mime: 'application/octet-stream',
              createdAt: new Date().toISOString(),
              permanent: String(opts?.permanent ?? true),
              epochs: String(opts?.epochs ?? 1),
              fileHash: fileHash,
              encryptionId: mediaEncryptionId,
              isEncrypted: "true",
              originalName: fileName,
              originalMime: blob.type,
              encryptionMethod: 'seal',
              encryptionTimestamp: String(Date.now())
            }
          });
        } catch (error) {
          console.error('Error processing media file:', error);
          // Continue with other files even if one fails
        }
      }
      
      // Add metadata
      fd.append(
        "_metadata",
        new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" }),
        "_metadata"
      );
      
      // Build query params
      const qs = new URLSearchParams({
        epochs: String(opts?.epochs ?? 1),
        permanent: String(opts?.permanent ?? true),
      }).toString();
      
      // Make the API call to Walrus
      const response = await fetch(`/api/walrus/quilts${qs ? `?${qs}` : ""}`, {
        method: "PUT",
        body: fd,
        headers: {
          'X-Wallet-Address': account.address,
        }
      });
      
      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to commit draft: ${error}`);
      }
      
      const result = await response.json();
      const quiltId = result?.blobStoreResult?.newlyCreated?.blobObject?.blobId || 
                     result?.alreadyCertified?.blobId || 
                     result?.blobId || 
                     result?.quiltId;
      
      if (quiltId) {
        const newVersion: Version = {
          id: `v${Date.now()}`,
          createdAt: Date.now(),
          quiltId,
          text: snap.text,
          media: snap.media,
          patches: [],
          permanent: opts?.permanent ?? true,
          epochs: opts?.epochs ?? 1
        };
        
        setVersions(prev => [newVersion, ...prev]);
        setAutoExpandId(newVersion.id);
        return { success: true, quiltId };
      }
      
      return { success: false, error: 'No quilt ID returned' };
    } catch (error) {
      console.error('Commit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to commit draft';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCommitting(false);
    }
  }, [account?.address, suiClient]);

  const handleVersionSelect = (versionId: string) => {
    // Implementation for version selection
    console.log('Selected version:', versionId);
  };

  const handleVersionDelete = (versionId: string) => {
    setVersions(prev => prev.filter(v => v.id !== versionId));
  };

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Welcome to DraftsHub</h1>
          <p className="mb-6">Connect your wallet to get started</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <AppShell
      topbar={
        <Topbar 
          onCommit={handleCommit} 
          isCommitting={isCommitting} 
          walletAddress={account.address} 
          onDisconnect={disconnect} 
        />
      }
      sidebar={
        <Sidebar 
          versions={versions} 
          onVersionSelect={handleVersionSelect}
          onVersionDelete={handleVersionDelete}
          autoExpandId={autoExpandId}
        />
      }
      right={
        <RightPanel 
          versions={versions} 
          onVersionSelect={handleVersionSelect}
          onVersionDelete={handleVersionDelete}
          autoExpandVersionId={autoExpandId || undefined} 
        />
      }
    >
      {error && (
        <div className="fixed top-20 right-4 z-50 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
      <EditorCanvas
        registerSnapshotProvider={(fn) => {
          snapshotProviderRef.current = fn;
        }}
      />
    </AppShell>
  );
}