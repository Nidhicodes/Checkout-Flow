import { NextRequest, NextResponse } from 'next/server';
import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';
import * as fcl from '@onflow/fcl';
import * as sdk from '@onflow/sdk';
import * as t from '@onflow/types';

const ec = new EC('p256');

// FCL Configuration
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'flow.network': 'testnet',
});

// In-memory storage for demo purposes
const accountMapping = new Map<string, string>();

const signWithKey = (privateKey: string, message: string): string => {
  const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
  const sig = key.sign(Buffer.from(message, 'hex'));
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
    
    const adminAuthFunction = (account: any = {}) => ({
      ...account,
      tempId: 'admin-key',
      addr: fcl.sansPrefix(adminAddress),
      keyId: 0,
      signingFunction: async (signable: any) => {
        const hasher = new SHA3(256);
        hasher.update(Buffer.from(signable.message, 'hex'));
        const digest = hasher.digest('hex');
        const signature = signWithKey(adminPrivateKey, digest);
        
        return {
          addr: fcl.sansPrefix(adminAddress),
          keyId: 0,
          signature,
        };
      },
    });
    
    // Create account and fund with Flow tokens in ONE transaction
    // Note: USDC is broken on testnet, so we're just creating the account with Flow
    const createAccountTx = `
      import FungibleToken from 0x9a0766d93b6608b7
      import FlowToken from 0x7e60df042a9c0868

      transaction(publicKey: String, fundingAmount: UFix64) {
        prepare(signer: auth(BorrowValue) &Account) {
          // Create the new account
          let account = Account(payer: signer)
          
          // Add the public key
          let key = PublicKey(
            publicKey: publicKey.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
          )
          
          account.keys.add(
            publicKey: key,
            hashAlgorithm: HashAlgorithm.SHA3_256,
            weight: 1000.0
          )
          
          // Fund with Flow tokens
          let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
          ) ?? panic("Could not borrow Flow vault")
          
          let flowTokens <- flowVault.withdraw(amount: fundingAmount)
          let recipientFlowVault = account.capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            .borrow() ?? panic("Could not borrow recipient Flow receiver")
          
          recipientFlowVault.deposit(from: <-flowTokens)
          
          log("Account created and funded with Flow tokens")
        }
      }
    `;
    
    console.log('Submitting account creation transaction...');
    
    const createResponse = await fcl.send([
      sdk.transaction(createAccountTx),
      sdk.args([
        sdk.arg(publicKey, t.String),
        sdk.arg('1.0', t.UFix64), // Fund with 1 Flow token
      ]),
      sdk.proposer(adminAuthFunction),
      sdk.payer(adminAuthFunction as any),
      sdk.authorizations([adminAuthFunction] as any),
      sdk.limit(9999),
    ]);
    
    const createTxId = createResponse.transactionId;
    console.log('Account creation transaction ID:', createTxId);
    
    // Wait for transaction to be sealed
    const txResult = await fcl.tx(createTxId).onceSealed();
    console.log('Transaction sealed successfully');
    
    // Extract the created account address from events
    const accountCreatedEvent = txResult.events.find(
      (e: any) => e.type === 'flow.AccountCreated'
    );
    
    if (!accountCreatedEvent) {
      throw new Error('Account creation event not found');
    }
    
    const newAddress = accountCreatedEvent.data.address;
    console.log('✅ New account created:', newAddress);
    console.log('✅ Funded with 1.0 Flow tokens');
    
    // Store the mapping
    accountMapping.set(privateKey, newAddress);
    
    return NextResponse.json({ 
      address: newAddress,
      message: 'Account created and funded with Flow tokens',
      balance: '1.0 FLOW',
      note: 'USDC is currently unavailable on testnet due to contract issues'
    });
  } catch (error) {
    console.error('Account creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}