import { SealClient } from '@mysten/seal';

// Extend the Window interface to include the seal property
declare global {
  interface Window {
    seal: SealClient & {
      decrypt: (encryptedContent: string, address?: string) => Promise<Uint8Array | null>;
      // Add other methods from SealClient that you're using
    };
  }
}

export {}; // This file needs to be a module
