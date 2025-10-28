import { NextRequest, NextResponse } from 'next/server';
import * as fcl from '@onflow/fcl';
import * as sdk from '@onflow/sdk';
import * as t from '@onflow/types';
import { promises as fs } from 'fs';
import path from 'path';
import { SHA3 } from 'sha3';
import { ec as EC } from 'elliptic';

const ec = new EC('p256');

// FCL Configuration
fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'flow.network': 'testnet',
});

const signWithKey = (privateKey: string, msgHex: string): string => {
  const key = ec.keyFromPrivate(privateKey, "hex");
  const sig = key.sign(msgHex);
  return sig.toDER('hex');
};

// Handler for the faucet endpoint
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const mintTxPath = path.join(process.cwd(), 'cadence', 'transactions', 'mint_usdc.cdc');
    const mintTxCode = await fs.readFile(mintTxPath, 'utf-8');

    const adminAddress = process.env.FLOW_ADMIN_ADDRESS;
    const adminPrivateKey = process.env.FLOW_ADMIN_PRIVATE_KEY;

    if (!adminAddress || !adminPrivateKey) {
      throw new Error('Admin credentials are not configured');
    }

    const rightPaddedHexBuffer = (data: string): string =>
      Buffer.from(data.padEnd(32 * 2, '0'), "hex").toString("hex");
    
    const USER_DOMAIN_TAG = rightPaddedHexBuffer(
      Buffer.from("FLOW-V0.0-user").toString("hex")
    );

    const digest = new SHA3(256).update(Buffer.from(USER_DOMAIN_TAG + mintTxCode, "hex")).digest("hex");
    const signature = signWithKey(adminPrivateKey, digest);

    const authorizationFunction = (account: any = {}) => ({
      ...account,
      tempId: 'admin-key',
      addr: fcl.sansPrefix(adminAddress),
      keyId: 0,
      signingFunction: async (signable: any) => {
        return {
          addr: fcl.sansPrefix(adminAddress),
          keyId: 0,
          signature,
        };
      },
    });

    const response = await fcl.send([
      sdk.transaction(mintTxCode),
      sdk.args([
        sdk.arg(address, t.Address),
        sdk.arg('100.0', t.UFix64),
      ]),
      sdk.proposer(authorizationFunction),
      sdk.payer(authorizationFunction as any),
      sdk.authorizations([authorizationFunction] as any),
      sdk.limit(999),
    ]);

    const transactionId = response.transactionId;

    await fcl.tx(transactionId).onceSealed();

    return NextResponse.json({ transactionId });
  } catch (error) {
    console.error('Faucet error:', error);
    return NextResponse.json({ error: 'Failed to mint tokens' }, { status: 500 });
  }
}