import { SealClient, KeyServerConfig } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

export function hexlify(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function strip0x(h: string): string {
  return h.startsWith('0x') ? h.slice(2) : h;
}

let client: SealClient | null = null;

function getSuiClient(): SuiClient {
  const url = process.env.NEXT_PUBLIC_SUI_FULLNODE || getFullnodeUrl('testnet');
  return new SuiClient({ url });
}

export function getSealClient(): SealClient {
  if (client) return client;
  const keyServersEnv = process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS || '';
  const ids = keyServersEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const serverConfigs: KeyServerConfig[] = ids.map((id) => ({ objectId: id, weight: 1 }));
  client = new SealClient({ suiClient: getSuiClient(), serverConfigs, verifyKeyServers: false });
  return client;
}

export async function encryptBytes(
  data: Uint8Array,
  opts: { packageIdHex: string; idHex?: string; threshold?: number }
): Promise<{ encrypted: Uint8Array; idHex: string; backupKey: Uint8Array }> {
  const { packageIdHex, idHex, threshold = 2 } = opts;
  const pkgHex = `0x${strip0x(packageIdHex)}`;
  const idBytes = (() => {
    if (idHex) return null; // we'll use the provided hex string directly
    const rnd = new Uint8Array(32);
    crypto.getRandomValues(rnd);
    return rnd;
  })();
  const idHexStr = idHex ? `0x${strip0x(idHex)}` : `0x${hexlify(idBytes!)}`;
  const seal = getSealClient();
  const { encryptedObject, key } = await seal.encrypt({ threshold, packageId: pkgHex, id: idHexStr, data });
  return { encrypted: encryptedObject, idHex: strip0x(idHexStr), backupKey: key };
}
