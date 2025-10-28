import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';

const ec = new EC('p256');

export async function getAddressFromPrivateKey(privateKey: string): Promise<string> {
  try {
    // Remove '0x' prefix if present
    const cleanPrivateKey = privateKey.replace('0x', '');
    
    // Get the key pair from private key
    const keyPair = ec.keyFromPrivate(cleanPrivateKey, 'hex');
    
    // Get the public key in uncompressed format
    const publicKey = keyPair.getPublic();
    const pubKeyHex = publicKey.encode('hex', false); // false = uncompressed
    
    // Remove the '04' prefix from uncompressed public key
    const pubKeyWithoutPrefix = pubKeyHex.slice(2);
    
    // Hash the public key using SHA3-256
    const hash = new SHA3(256);
    hash.update(Buffer.from(pubKeyWithoutPrefix, 'hex'));
    const hashedPubKey = hash.digest('hex');
    
    // Take last 20 bytes (40 hex characters) as the address
    const address = hashedPubKey.slice(-40);
    
    // Add '0x' prefix
    return `0x${address}`;
  } catch (error) {
    console.error('Error deriving Flow address:', error);
    throw new Error('Failed to derive Flow address from private key');
  }
}

export function signMessage(privateKey: string, message: string): string {
  const cleanPrivateKey = privateKey.replace('0x', '');
  const key = ec.keyFromPrivate(cleanPrivateKey, 'hex');
  const sig = key.sign(message);
  return sig.toDER('hex');
}