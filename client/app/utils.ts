import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type { SessionKey } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';

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
  sealClient: any, // Using 'any' since we don't have the exact type
  moveCallConstructor: MoveCallConstructor,
  setError: (error: string | null) => void,
  setDecryptedFileUrls: (urls: string[]) => void,
  setIsDialogOpen: (open: boolean) => void,
  setReloadKey: (key: number) => void
): Promise<void> {
  try {
    const decryptedFiles: string[] = [];
    
    for (const blobId of blobIds) {
      try {
        // 1. Get the encrypted blob
        const blob = await suiClient.getObject({
          id: blobId,
          options: { showBcs: true },
        });

        if (!blob.data?.bcs?.bcsBytes) {
          throw new Error(`No data found for blob ${blobId}`);
        }

        // 2. Decrypt the blob using the session key
        const decrypted = await sessionKey.decrypt(blob.data.bcs.bcsBytes);
        
        // 3. Create a URL for the decrypted blob
        const blobUrl = URL.createObjectURL(new Blob([decrypted]));
        decryptedFiles.push(blobUrl);
        
      } catch (error) {
        console.error(`Error processing blob ${blobId}:`, error);
        setError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }

    // 4. Update state with decrypted files
    setDecryptedFileUrls(decryptedFiles);
    setIsDialogOpen(true);
    setReloadKey(prev => prev + 1);
    
  } catch (error) {
    console.error('Error in downloadAndDecrypt:', error);
    setError(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
