import { 
  SealClient, 
  SessionKey, 
  type ExportedSessionKey,
  type SealCompatibleClient,
  type KeyServerConfig
} from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromHex, toHex } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';

type MoveCallConstructor = (tx: Transaction, id: string) => void;

export interface DownloadAndDecryptOptions {
  blobIds: string[];
  sessionKey: SessionKey;
  suiClient: SuiClient;
  moveCallConstructor: MoveCallConstructor;
  setError: (error: string | null) => void;
  setDecryptedFileUrls: (urls: string[]) => void;
  setIsDialogOpen: (open: boolean) => void;
  setReloadKey: (updater: (prev: number) => number) => void;
}

export function hexlify(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function strip0x(h: string): string {
  return h.startsWith('0x') ? h.slice(2) : h;
}

export const SEAL_KEY_SERVERS: KeyServerConfig[] = [
  {
    objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
    weight: 1,
  },
  {
    objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
    weight: 1,
  }
];

let sealClientInstance: SealClient | null = null;

export function getSealClient(suiClient?: SuiClient): SealClient {
  if (!sealClientInstance) {
    if (!suiClient) {
      throw new Error('SuiClient is required for first-time SealClient initialization');
    }
    sealClientInstance = new SealClient({
      suiClient,
      serverConfigs: SEAL_KEY_SERVERS,
      verifyKeyServers: false,
    });
  }
  return sealClientInstance;
}

export interface EncryptOptions {
  data: Uint8Array;
  id?: string;
  threshold?: number;
}

export async function encryptBytes(
  options: EncryptOptions,
  suiClient: SuiClient
): Promise<{ encrypted: Uint8Array; id: string; key: Uint8Array }> {
  const seal = getSealClient(suiClient);
  
  // Generate a random ID if not provided
  const id = options.id || toHex(crypto.getRandomValues(new Uint8Array(32)));
  const threshold = options.threshold || 2;
  
  try {
    // Import the package ID from constants
    const { TESTNET_PACKAGE_ID } = await import('./constants');
    
    const { encryptedObject, key } = await seal.encrypt({
      threshold,
      id,
      data: options.data,
      packageId: TESTNET_PACKAGE_ID,
    });
    
    return { 
      encrypted: encryptedObject, 
      id,
      key 
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Failed to encrypt data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface DecryptOptions {
  encryptedData: Uint8Array;
  sessionKey: SessionKey;
  txBytes: Uint8Array;
  threshold: number;
}

export async function decryptBytes(
  options: DecryptOptions,
  suiClient: SuiClient
): Promise<Uint8Array> {
  const seal = getSealClient(suiClient);
  const id = toHex(options.encryptedData.slice(0, 32)); // Extract ID from encrypted data
  
  try {
    // First, fetch the required keys from the key servers
    await seal.fetchKeys({
      ids: [id],
      txBytes: options.txBytes,
      sessionKey: options.sessionKey,
      threshold: options.threshold || 2,
    });
    
    // Then decrypt the data
    return await seal.decrypt({
      data: options.encryptedData,
      sessionKey: options.sessionKey,
      txBytes: options.txBytes,
      checkShareConsistency: true,
      checkLEEncoding: false,
    });
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to determine if a file is Seal-encrypted based on its metadata
 */
export function isSealEncrypted(metadata: Record<string, string> | undefined): boolean {
  return metadata?.seal === 'true';
}

// Session key management
export async function createSessionKey(
  suiClient: SuiClient,
  address: string,
  packageId: string,
  ttlMin: number = 10
): Promise<SessionKey> {
  return await SessionKey.create({
    address,
    packageId,
    ttlMin,
    suiClient: suiClient as unknown as SealCompatibleClient,
  });
}

export function exportSessionKey(sessionKey: SessionKey): ExportedSessionKey {
  return sessionKey.export();
}

export async function importSessionKey(
  exported: ExportedSessionKey,
  suiClient: SuiClient
): Promise<SessionKey> {
  return SessionKey.import(exported, suiClient as unknown as SealCompatibleClient);
}

/**
 * Creates a Move call constructor for allowlist access
 * @param packageId - The package ID of the allowlist module
 * @param allowlistId - The object ID of the allowlist
 * @returns A MoveCallConstructor function that can be used to create allowlist approval transactions
 */
/**
 * Downloads and decrypts multiple files using Seal encryption
 */
export async function downloadAndDecrypt({
  blobIds,
  sessionKey,
  suiClient,
  moveCallConstructor,
  setError,
  setDecryptedFileUrls,
  setIsDialogOpen,
  setReloadKey,
}: DownloadAndDecryptOptions): Promise<void> {
  // Get aggregator endpoints from environment variables
  const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';
  const WALRUS_PUBLISHER = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space';
  
  const aggregators = [
    WALRUS_AGGREGATOR,
    // Add any additional fallback aggregators if needed
    // 'https://fallback-aggregator1.example.com',
    // 'https://fallback-aggregator2.example.com',
  ];

  try {
    setError(null);
    
    // 1. Download all encrypted blobs first
    const downloadPromises = blobIds.map(async (blobId) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_WALRUS_PUBLISHER}/download?blobId=${blobId}`);
      if (!response.ok) {
        throw new Error(`Failed to download blob ${blobId}: ${response.statusText}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    });

    const encryptedDataList = await Promise.all(downloadPromises);
    const decryptedFileUrls: string[] = [];
    const seal = getSealClient(suiClient);

    // 2. Process each downloaded blob
    for (const encryptedData of encryptedDataList) {
      try {
        const fullId = toHex(encryptedData.slice(0, 32)); // Extract ID from encrypted data
        
        // Create transaction for key fetching
        const tx = new Transaction();
        moveCallConstructor(tx as any, fullId);
        const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });

        // Decrypt the data
        const decryptedFile = await seal.decrypt({
          data: encryptedData,
          sessionKey,
          txBytes,
        });

        // Create object URL for the decrypted data
        const blob = new Blob([decryptedFile.buffer as ArrayBuffer], { type: 'application/octet-stream' });
        decryptedFileUrls.push(URL.createObjectURL(blob));
      } catch (err) {
        console.error(`Error processing blob:`, err);
        const errorMsg = err instanceof Error && 'name' in err && err.name === 'NoAccessError'
          ? 'No access to decryption keys'
          : 'Unable to decrypt files, try again';
        
        console.error(errorMsg, err);
        setError(errorMsg);
        return;
      }
    }

    // 3. Update state with decrypted files
    if (decryptedFileUrls.length > 0) {
      setDecryptedFileUrls(decryptedFileUrls);
      setIsDialogOpen(true);
      setReloadKey(prev => prev + 1);
    }
  } catch (error) {
    console.error('Download and decrypt error:', error);
    setError(`Failed to download and decrypt files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a move call constructor for allowlist access
 */
export function createAllowlistMoveCallConstructor(
  packageId: string,
  allowlistId: string
): MoveCallConstructor {
  return (tx: Transaction, id: string) => {
    tx.moveCall({
      target: `${packageId}::allowlist::seal_approve`,
      arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(allowlistId)],
    });
  };
}
