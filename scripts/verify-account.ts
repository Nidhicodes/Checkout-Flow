// Create this file: scripts/verify-account.ts
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { ec as EC } from 'elliptic';
import 'dotenv/config';

const ec = new EC('p256');

fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'flow.network': 'testnet',
});

async function verifyAccount() {
  const adminAddress = process.env.FLOW_ADMIN_ADDRESS;
  const adminPrivateKey = process.env.FLOW_ADMIN_PRIVATE_KEY;

  if (!adminAddress || !adminPrivateKey) {
    console.error('Missing admin credentials');
    return;
  }

  console.log('Admin Address:', adminAddress);
  console.log('Private Key Length:', adminPrivateKey.length);

  // Get the public key from the private key
  const key = ec.keyFromPrivate(Buffer.from(adminPrivateKey, 'hex'));
  const publicKey = key.getPublic('hex');
  console.log('\nPublic Key (from private key):', publicKey);

  // Query the account to see what keys are registered
  const accountInfo = await fcl.query({
    cadence: `
      access(all) fun main(address: Address): AnyStruct {
        let account = getAccount(address)
        let keys: [AnyStruct] = []
        
        var i = 0
        while i < 10 {
          if let key = account.keys.get(keyIndex: i) {
            keys.append({
              "index": i,
              "publicKey": String.encodeHex(key.publicKey.publicKey),
              "signAlgo": key.publicKey.signatureAlgorithm.rawValue,
              "hashAlgo": key.hashAlgorithm.rawValue,
              "weight": key.weight,
              "isRevoked": key.isRevoked
            })
          }
          i = i + 1
        }
        
        return keys
      }
    `,
    args: (arg: any, t: any) => [arg(adminAddress, t.Address)],
  });

  console.log('\nAccount Keys on Chain:');
  console.log(JSON.stringify(accountInfo, null, 2));

  // Check if our derived public key matches
  const accountKeys = accountInfo as any[];
  if (accountKeys.length > 0) {
    const key0 = accountKeys[0];
    console.log('\n=== Key 0 Analysis ===');
    console.log('Public Key on Chain:', key0.publicKey);
    console.log('Public Key from Private Key:', publicKey);
    console.log('Match:', key0.publicKey === publicKey);
    console.log('Sign Algorithm:', key0.signAlgo === 2 ? 'ECDSA_P256' : 'Unknown');
    console.log('Hash Algorithm:', key0.hashAlgo === 3 ? 'SHA3_256' : 'Unknown');
    console.log('Is Revoked:', key0.isRevoked);
  }
}

verifyAccount().catch(console.error);