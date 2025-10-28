import { NextRequest, NextResponse } from 'next/server';
import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';
import * as fcl from '@onflow/fcl';
import * as sdk from '@onflow/sdk';
import * as t from '@onflow/types';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const ec = new EC('p256');

// FCL Configuration
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'flow.network': 'testnet',
});

// In-memory storage for demo purposes
const accountMapping = new Map<string, string>();

const signWithKey = (privateKey: string, digest: string): string => {
  const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
  const sig = key.sign(Buffer.from(digest, 'hex'));
  const n = 32;
  const r = sig.r.toArrayLike(Buffer, 'be', n);
  const s = sig.s.toArrayLike(Buffer, 'be', n);
  return Buffer.concat([r, s]).toString('hex');
};

export async function POST(req: NextRequest) {
  try {
    const { privateKey } = await req.json();
    
    if (!privateKey) {
      return NextResponse.json({ error: 'Private key is required' }, { status: 400 });
    }
    
    // Check if we already have an account for this key
    const existingAddress = accountMapping.get(privateKey);
    if (existingAddress) {
      console.log('Returning existing account:', existingAddress);
      return NextResponse.json({ address: existingAddress });
    }
    
    // Derive public key from private key
    const cleanPrivateKey = privateKey.replace('0x', '');
    const keyPair = ec.keyFromPrivate(cleanPrivateKey, 'hex');
    const publicKey = keyPair.getPublic('hex').slice(2); // Remove '04' prefix
    
    console.log('Creating account for public key:', publicKey);
    
    // Get admin credentials
    const adminAddress = process.env.FLOW_ADMIN_ADDRESS;
    const adminPrivateKey = process.env.FLOW_ADMIN_PRIVATE_KEY;
    
    if (!adminAddress || !adminPrivateKey) {
      throw new Error('Admin credentials not configured');
    }
    
    // Step 1: Create the Flow account using admin as payer
    const createAccountTx = `
      transaction(publicKey: String) {
        prepare(signer: auth(BorrowValue) &Account) {
          let account = Account(payer: signer)
          
          // Add the public key to the new account
          let key = PublicKey(
            publicKey: publicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
          )
          
          account.keys.add(
            publicKey: key,
            hashAlgorithm: HashAlgorithm.SHA2_256,
            weight: 1000.0
          )
        }
      }
    `;
    
    const adminAuthFunction = (account: any = {}) => ({
      ...account,
      tempId: 'admin-key',
      addr: fcl.sansPrefix(adminAddress),
      keyId: 0,
      signingFunction: async (signable: any) => {
        // Add the FLOW domain tag for user signatures
        const rightPaddedHexBuffer = (data: string): string =>
          Buffer.from(data.padEnd(32 * 2, '0'), "hex").toString("hex");
        
        const USER_DOMAIN_TAG = rightPaddedHexBuffer(
          Buffer.from("FLOW-V0.0-user").toString("hex")
        );
        
        const hasher = new SHA3(256);
        hasher.update(Buffer.from(USER_DOMAIN_TAG + signable.message, 'hex'));
        const digest = hasher.digest('hex');
        const signature = signWithKey(adminPrivateKey, digest);
        
        return {
          addr: fcl.sansPrefix(adminAddress),
          keyId: 0,
          signature,
        };
      },
    });
    
    console.log('Submitting account creation transaction...');
    
    const createResponse = await fcl.send([
      sdk.transaction(createAccountTx),
      sdk.args([
        sdk.arg(publicKey, t.String),
      ]),
      sdk.proposer(adminAuthFunction),
      sdk.payer(adminAuthFunction as any),
      sdk.authorizations([adminAuthFunction] as any),
      sdk.limit(999),
    ]);
    
    const createTxId = createResponse.transactionId;
    console.log('Account creation transaction ID:', createTxId);
    
    // Wait for transaction to be sealed
    const txResult = await fcl.tx(createTxId).onceSealed();
    console.log('Transaction sealed:', txResult);
    
    // Extract the created account address from events
    const accountCreatedEvent = txResult.events.find(
      (e: any) => e.type === 'flow.AccountCreated'
    );
    
    if (!accountCreatedEvent) {
      throw new Error('Account creation event not found');
    }
    
    const newAddress = accountCreatedEvent.data.address;
    console.log('New account created:', newAddress);
    
    // Store the mapping immediately - vault setup will happen on first faucet use
    accountMapping.set(privateKey, newAddress);
    
    console.log('Account creation successful. USDC vault will be set up on first use.');
    
    return NextResponse.json({ 
      address: newAddress,
      message: 'Account created successfully. USDC vault will be initialized on first token request.'
    });
  } catch (error) {
    console.error('Account creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}