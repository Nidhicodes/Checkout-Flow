// Create this: scripts/check-created-account.ts
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

fcl.config({
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'flow.network': 'testnet',
});

async function checkAccount() {
  const address = '0xeaa5f9c5b51bd6b7'; // Use the latest created account
  
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
    args: (arg: any, t: any) => [arg(address, t.Address)],
  });

  console.log('Account Keys:');
  console.log(JSON.stringify(accountInfo, null, 2));
  
  const keys = accountInfo as any[];
  if (keys.length > 0) {
    const key0 = keys[0];
    console.log('\n=== Key 0 Details ===');
    console.log('Public Key:', key0.publicKey);
    console.log('Sign Algorithm:', key0.signAlgo === 2 ? 'ECDSA_P256' : key0.signAlgo === 3 ? 'ECDSA_secp256k1' : 'Unknown');
    console.log('Hash Algorithm:', key0.hashAlgo === 1 ? 'SHA2_256' : key0.hashAlgo === 3 ? 'SHA3_256' : 'Unknown');
    console.log('Weight:', key0.weight);
    console.log('Is Revoked:', key0.isRevoked);
  }
}

checkAccount().catch(console.error);