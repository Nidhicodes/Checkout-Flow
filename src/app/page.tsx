'use client';

import { useState, useEffect, FC, ReactNode } from 'react';
import Image from 'next/image';
import { fclInstance as fcl } from './fcl.config';
import * as t from "@onflow/types";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getWeb3Auth } from '@/lib/web3auth';
import { SHA3 } from 'sha3';
import { ec as EC } from 'elliptic';
import { getAddressFromPrivateKey } from '@/lib/flow';
import { initWeb3Auth } from '@/lib/web3auth';

const ec = new EC('p256');

// --- Data and Types ---
type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
};

const products: Product[] = [
  {
    id: 'prod_1',
    name: 'Hackathon Hoodie',
    price: 0.5, // 0.5 Flow instead of 20 USDC
    image: 'linear-gradient(to bottom right, #a855f7, #3b82f6, #22d3ee)',
  },
  {
    id: 'prod_2',
    name: 'Dev Tee',
    price: 0.3, // 0.3 Flow instead of 15 USDC
    image: 'linear-gradient(to bottom right, #4ade80, #3b82f6)',
  },
  {
    id: 'prod_3',
    name: 'WAGMI Cap',
    price: 0.2, // 0.2 Flow instead of 10 USDC
    image: 'linear-gradient(to bottom right, #facc15, #ef4444, #ec4899)',
  },
];

export default function Home() {
  const [user, setUser] = useState<{ loggedIn: boolean; addr?: string }>({ loggedIn: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<ReactNode>('');
  const [flowBalance, setFlowBalance] = useState<number | null>(null);
const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [purchaseTx, setPurchaseTx] = useState('');
  const [isFaucetProcessing, setIsFaucetProcessing] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const router = useRouter();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fcl.currentUser.subscribe((currentUser: any) => {
      setUser({ loggedIn: currentUser.loggedIn ?? false, addr: currentUser.addr });
    });
    fetch('/api/read-transaction').then(res => res.json()).then(data => setPurchaseTx(data.transaction));
  }, []);

useEffect(() => {
  if (user.loggedIn) {
    fetchFlowBalance();
  }
}, [user]);

const fetchFlowBalance = async () => {
  if (!user.addr) return;
  setIsBalanceLoading(true);
  try {
    const balance = await fcl.query({
      cadence: `
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868
        
        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(/public/flowTokenBalance)
            ?? panic("Could not borrow Balance capability")
          return vaultRef.balance
        }
      `,
      args: (arg: any, t: any) => [arg(user.addr, t.Address)],
    });
    setFlowBalance(parseFloat(balance));
  } catch (error) {
    console.error("Could not fetch Flow balance:", error);
    setFlowBalance(null);
  } finally {
    setIsBalanceLoading(false);
  }
};


const handleLogin = async () => {
  try {
    setStatusMessage("Initializing...");
    
    const web3auth = await initWeb3Auth();
    
    if (!web3auth) {
      setStatusMessage("Web3Auth initialization failed");
      return;
    }
    
    setStatusMessage("Connecting...");
    const web3authProvider = await web3auth.connect();
    
    if (!web3authProvider) {
      setStatusMessage("Web3Auth connection failed");
      return;
    }
    
    setStatusMessage("Getting credentials...");
    const privateKey = await web3authProvider.request({
      method: "private_key",
    });
    
    setPrivateKey(privateKey as string);
    
    setStatusMessage("Creating Flow account...");
    
    const response = await fetch('/api/create-flow-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privateKey: privateKey as string }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create Flow account');
    }
    
    const { address } = await response.json();
    
    setUser({ loggedIn: true, addr: address });
    setStatusMessage("");
  } catch (error) {
    console.error("Login failed:", error);
    setStatusMessage(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

  const handleLogout = () => {
    fcl.unauthenticate();
    setPrivateKey(null);
  };

const handlePayment = async () => {
  if (!selectedProduct) {
    setStatusMessage("Please select a product first.");
    return;
  }

  if (!user.loggedIn || !privateKey || !user.addr) {
    setStatusMessage("Please log in to pay");
    return;
  }

  setIsProcessing(true);
  setStatusMessage('Creating transaction...');

  try {
    const paymentTransaction = `
      import FungibleToken from 0x9a0766d93b6608b7
      import FlowToken from 0x7e60df042a9c0868

      transaction(recipient: Address, amount: UFix64) {
        
        let sentVault: @{FungibleToken.Vault}

        prepare(signer: auth(BorrowValue) &Account) {
          let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow reference to the owner's Vault!")

          self.sentVault <- vaultRef.withdraw(amount: amount)
        }

        execute {
          let receiverRef = getAccount(recipient)
            .capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            ?? panic("Could not borrow receiver reference to the recipient's Vault")

          receiverRef.deposit(from: <-self.sentVault)
        }
      }
    `;

    const cleanPrivateKey = privateKey.replace('0x', '');
    
    const authorizationFunction = (account: any = {}) => ({
      ...account,
      tempId: 'web3auth-key',
      addr: fcl.sansPrefix(user.addr!),
      keyId: 0,
      signingFunction: async (signable: any) => {
        const hasher = new SHA3(256);
        hasher.update(Buffer.from(signable.message, 'hex'));
        const digest = hasher.digest('hex');
        
        const key = ec.keyFromPrivate(cleanPrivateKey, 'hex');
        const sig = key.sign(Buffer.from(digest, 'hex'));
        const n = 32;
        const r = sig.r.toArrayLike(Buffer, 'be', n);
        const s = sig.s.toArrayLike(Buffer, 'be', n);
        const signature = Buffer.concat([r, s]).toString('hex');

        return {
          addr: fcl.sansPrefix(user.addr!),
          keyId: 0,
          signature,
        };
      },
    });

    const merchantAddress = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS || "0x3fe32988f9457b01";

    const response = await fcl.send([
      fcl.transaction(paymentTransaction),
      fcl.args([
        fcl.arg(merchantAddress, t.Address),
        fcl.arg(selectedProduct.price.toFixed(8), t.UFix64),
      ]),
      fcl.proposer(authorizationFunction),
      fcl.payer(authorizationFunction as any),
      fcl.authorizations([authorizationFunction] as any),
      fcl.limit(999),
    ]);

    const transactionId = response.transactionId;
    console.log('Transaction submitted:', transactionId);

    setStatusMessage('Transaction submitted! Waiting for confirmation...');

    // POLLING APPROACH: Check transaction status every 2 seconds
    const pollTransaction = async (txId: string, maxAttempts = 30): Promise<boolean> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          setStatusMessage(`Confirming transaction... (${attempt + 1}/${maxAttempts})`);
          
          const txStatus = await fcl.send([
            fcl.getTransactionStatus(txId)
          ]).then(fcl.decode);

          console.log('Transaction status:', txStatus);

          // Status codes: 0=Unknown, 1=Pending, 2=Finalized, 3=Executed, 4=Sealed, 5=Expired
          if (txStatus.status >= 4) {
            // Transaction is sealed
            if (txStatus.statusCode === 0) {
              // Success
              return true;
            } else {
              // Error
              throw new Error(`Transaction failed: ${txStatus.errorMessage}`);
            }
          }

          if (txStatus.status === 5) {
            // Expired
            throw new Error('Transaction expired');
          }

          // Wait 2 seconds before next poll
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error('Error polling transaction:', error);
          if (attempt === maxAttempts - 1) {
            throw error;
          }
          // Continue polling on error (might be temporary network issue)
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      throw new Error('Transaction confirmation timeout');
    };

    await pollTransaction(transactionId);
    
    setStatusMessage('Transaction confirmed! Recording payment...');
    
    await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, product: selectedProduct }),
    });
    
    // Refresh balance
    await fetchFlowBalance();
    
    setStatusMessage('Payment successful!');
    setTimeout(() => {
      router.push(`/receipt/${transactionId}`);
    }, 1500);
  } catch (error) {
    console.error("Payment failed:", error);
    setStatusMessage(`Payment failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsProcessing(false);
  }
};

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    setStatusMessage('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const ProductCard: FC<{ product: Product; onSelect: (product: Product) => void }> = ({ product, onSelect }) => (
    <div
      style={{
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid rgb(55, 65, 81)',
        cursor: 'pointer',
        transition: 'all 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgb(34, 211, 238)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgb(55, 65, 81)';
      }}
      onClick={() => onSelect(product)}
    >
      <div style={{
        width: '100%',
        height: '16rem',
        background: product.image,
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '1rem'
      }}>
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgb(229, 231, 235)' }}>{product.name}</h2>
      <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'rgb(34, 211, 238)', marginTop: '0.25rem' }}>{product.price} FLOW</p>
      <button style={{
        width: '100%',
        marginTop: '1rem',
        backgroundColor: 'rgb(55, 65, 81)',
        color: 'white',
        fontWeight: 'bold',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(34, 211, 238)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(55, 65, 81)';
      }}>
        Buy Now
      </button>
    </div>
  );

const BalanceDisplay: FC<{ balance: number | null; isLoading: boolean }> = ({ balance, isLoading }) => {
  if (isLoading) {
    return <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'rgb(251, 191, 36)' }}>Loading balance...</p>;
  }
  
  if (balance === null) {
    return <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'rgb(248, 113, 113)' }}>Unable to load balance</p>;
  }
  
  return (
    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
      <p style={{ color: balance > 0 ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)' }}>
        Flow Balance: {balance.toFixed(4)} FLOW
      </p>
      {balance < 1 && (
        <p style={{ color: 'rgb(251, 191, 36)', fontSize: '0.675rem', marginTop: '0.25rem' }}>
          Low balance - contact support for more tokens
        </p>
      )}
    </div>
  );
};


  const CheckoutModal: FC<{ product: Product | null; onClose: () => void }> = ({ product, onClose }) => {
    if (!product) return null;

    const isAffordable = flowBalance !== null && flowBalance >= product.price;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 50
      }}>
        <div style={{
          backgroundColor: 'rgb(31, 41, 55)',
          padding: '2rem',
          borderRadius: '0.5rem',
          border: '1px solid rgb(55, 65, 81)',
          width: '100%',
          maxWidth: '32rem',
          position: 'relative'
        }}>
          <button 
            onClick={onClose} 
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              color: 'rgb(156, 163, 175)',
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              lineHeight: 1
            }}>&times;</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                width: '100%',
                height: '12rem',
                background: product.image,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                marginBottom: '1rem'
              }}>
              </div>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white' }}>{product.name}</h2>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'rgb(34, 211, 238)', marginTop: '0.25rem' }}>{product.price} FLOW</p>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!user.loggedIn ? (
                <div style={{ width: '100%' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgb(209, 213, 219)', marginBottom: '1rem' }}>Login to Purchase</h3>
                  <button
                    onClick={handleLogin}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(99, 102, 241))',
                      color: 'white',
                      fontWeight: 'bold',
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    Login with Social
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'rgb(209, 213, 219)', marginBottom: '0.5rem' }}>Welcome, <span style={{ fontWeight: '600', color: 'white' }}>{user.addr}</span>!</p>

                  <div style={{ color: 'rgb(156, 163, 175)', marginBottom: '1rem' }}>
                    <p style={{ fontWeight: '600', color: 'rgb(209, 213, 219)' }}>Your Flow Address:</p>
                    <div style={{
                      fontSize: '0.875rem',
                      wordBreak: 'break-all',
                      backgroundColor: 'rgb(17, 24, 39)',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid rgb(55, 65, 81)',
                      color: 'rgb(156, 163, 175)'
                    }}>
                      {user.addr}
                    </div>
                    <BalanceDisplay 
                      balance={flowBalance} 
                      isLoading={isBalanceLoading} 
                    />
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={isProcessing || isBalanceLoading || !isAffordable}
                    style={{
                      width: '100%',
                      background: (isProcessing || isBalanceLoading || !isAffordable) 
                        ? 'rgb(75, 85, 99)' 
                        : 'linear-gradient(to right, rgb(34, 197, 94), rgb(20, 184, 166))',
                      color: 'white',
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      fontSize: '1.125rem',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: (isProcessing || isBalanceLoading || !isAffordable) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      marginBottom: '1rem'
                    }}
                  >
                    {isProcessing ? 'Processing...' : `Pay ${product.price} FLOW`}
                  </button>

                  {!isAffordable && !isBalanceLoading && flowBalance !== null && (
                    <p style={{ color: 'rgb(248, 113, 113)', fontSize: '0.75rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                      Insufficient FLOW balance to purchase this item.
                    </p>
                  )}

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgb(220, 38, 38)',
                      color: 'white',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(185, 28, 28)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(220, 38, 38)';
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}

              {statusMessage && (
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid',
                  ...(typeof statusMessage === 'string' && (statusMessage.includes('successful') || statusMessage.includes('Confirming'))
                    ? { backgroundColor: 'rgba(20, 83, 45, 0.5)', color: 'rgb(134, 239, 172)', borderColor: 'rgb(21, 128, 61)' }
                    : typeof statusMessage === 'string' && (statusMessage.includes('failed') || statusMessage.includes('error'))
                      ? { backgroundColor: 'rgba(127, 29, 29, 0.5)', color: 'rgb(252, 165, 165)', borderColor: 'rgb(185, 28, 28)' }
                      : { backgroundColor: 'rgba(30, 58, 138, 0.5)', color: 'rgb(147, 197, 253)', borderColor: 'rgb(29, 78, 216)' })
                }}>
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: 'rgb(17, 24, 39)',
      color: 'rgb(243, 244, 246)'
    }}>
      <header style={{
        width: '100%',
        maxWidth: '80rem',
        margin: '0 auto',
        textAlign: 'center',
        marginBottom: '3rem'
      }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 'bold',
          background: 'linear-gradient(to right, rgb(192, 132, 252), rgb(34, 211, 238))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          The Modern Merchant
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'rgb(156, 163, 175)', marginTop: '0.5rem' }}>Select a product to begin the walletless checkout experience.</p>
      </header>

      <main style={{ width: '100%', maxWidth: '80rem', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          {products.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onSelect={handleSelectProduct}
            />
          ))}
        </div>
      </main>
      
      {isModalOpen && (
        <CheckoutModal
          product={selectedProduct}
          onClose={handleCloseModal}
        />
      )}

      <footer style={{
        width: '100%',
        maxWidth: '64rem',
        margin: '0 auto',
        textAlign: 'center',
        marginTop: '3rem',
        color: 'rgb(156, 163, 175)'
      }}>
        <p>Powered by Flow and blockchain technology.</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/dashboard?auth=true" style={{ color: 'rgb(34, 211, 238)', textDecoration: 'underline' }}>
            View Merchant Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}