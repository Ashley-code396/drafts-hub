import type { SuiClient, SuiObjectResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type { SessionKey } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';
import { decryptBytes } from './seal';

export type MoveCallConstructor = (tx: Transaction, id: string) => void;

export function constructMoveCall(packageId: string, allowlistId: string): MoveCallConstructor {
  return (tx: Transaction, id: string) => {
    tx.moveCall({
      target: `${packageId}::allowlist::seal_approve`,
      arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(allowlistId)],
    });
  };
}

export function getObjectExplorerLink(objectId: string): string {
  return `https://suiexplorer.com/object/${objectId}?network=testnet`;
}

export async function downloadAndDecrypt(
  blobIds: string[],
  sessionKey: SessionKey,
  suiClient: SuiClient,
  sealClient: any,
  moveCallConstructor: MoveCallConstructor,
  setError: (error: string | null) => void,
  setDecryptedFileUrls: (urls: string[]) => void,
  setIsDialogOpen: (open: boolean) => void,
  setReloadKey: (value: number | ((prev: number) => number)) => void
): Promise<void> {
  try {
    const decryptedFiles: string[] = [];

    for (const blobId of blobIds) {
      try {
        const blob = await suiClient.getObject({
          id: blobId,
          options: { showBcs: true },
        }) as SuiObjectResponse & {
          data: { bcs?: { bcsBytes: Uint8Array } };
        };

        if (!blob.data?.bcs?.bcsBytes) {
          throw new Error(`No data found for blob ${blobId}`);
        }

        const decrypted = await decryptBytes(
          {
            encryptedData: blob.data.bcs.bcsBytes,
            sessionKey,
            txBytes: new Uint8Array(),
            threshold: 1,
          },
          suiClient
        );

        let decryptedData: Uint8Array;

        if (typeof decrypted === "string") {
          decryptedData = new TextEncoder().encode(decrypted);
        } else if (decrypted instanceof ArrayBuffer) {
          decryptedData = new Uint8Array(decrypted);
        } else if ("buffer" in decrypted) {
          decryptedData = new Uint8Array(
            decrypted.buffer,
            decrypted.byteOffset ?? 0,
            decrypted.byteLength
          );
        } else if (decrypted && typeof decrypted === 'object' && 'byteLength' in decrypted) {
          // This is a more type-safe way to check for ArrayBuffer-like objects
          decryptedData = new Uint8Array(decrypted as ArrayBuffer);
        } else {
          throw new Error("Unsupported decrypted data type");
        }

      const buffer = decryptedData.buffer.slice(
        decryptedData.byteOffset,
        decryptedData.byteOffset + decryptedData.byteLength
      );

      const decryptedBlob = new Blob([buffer as ArrayBuffer], {
        type: "application/octet-stream",
      });

      const blobUrl = URL.createObjectURL(decryptedBlob);
      decryptedFiles.push(blobUrl);

    } catch (error) {
      console.error(`Error processing blob ${blobId}:`, error);
      setError(`Failed to process file: ${error instanceof Error ? error.message : "Unknown error"
        }`);
      return;
    }
  }

    setDecryptedFileUrls(decryptedFiles);
  setIsDialogOpen(true);
  setReloadKey(prev => prev + 1);

} catch (error) {
  console.error("Error in downloadAndDecrypt:", error);
  setError(`Decryption failed: ${error instanceof Error ? error.message : "Unknown error"
    }`);
}
}
