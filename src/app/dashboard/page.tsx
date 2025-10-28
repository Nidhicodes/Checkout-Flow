'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Transaction {
  buyer: string;
  product: string;
  amount: number;
  signature: string;
  timestamp: number;
}

export default function Dashboard() {
  const searchParams = useSearchParams();
  const auth = searchParams.get('auth');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [nftReceiptsIssued, setNftReceiptsIssued] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await response.json();
        setTransactions(data.transactions);
        setTotalSales(data.totalSales);
        setNftReceiptsIssued(data.nftReceiptsIssued);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    fetchData(); // Fetch data on initial load
    const interval = setInterval(fetchData, 2000); // Poll every 2 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  if (auth !== 'true') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>Access Denied</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{
        fontSize: '1.875rem',
        fontWeight: 'bold',
        marginBottom: '2rem'
      }}>Merchant Dashboard</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'rgb(75, 85, 99)'
          }}>Total Sales</h2>
          <p style={{
            fontSize: '2.25rem',
            fontWeight: 'bold'
          }}>${totalSales.toFixed(2)}</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'rgb(75, 85, 99)'
          }}>Total Transactions</h2>
          <p style={{
            fontSize: '2.25rem',
            fontWeight: 'bold'
          }}>{transactions.length}</p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'rgb(75, 85, 99)'
          }}>NFT Receipts Issued</h2>
          <p style={{
            fontSize: '2.25rem',
            fontWeight: 'bold'
          }}>{nftReceiptsIssued}</p>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>Recent Transactions</h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgb(229, 231, 235)' }}>
                <th style={{
                  textAlign: 'left',
                  padding: '0.5rem',
                  fontWeight: '600'
                }}>Timestamp</th>
                <th style={{
                  textAlign: 'left',
                  padding: '0.5rem',
                  fontWeight: '600'
                }}>Buyer</th>
                <th style={{
                  textAlign: 'left',
                  padding: '0.5rem',
                  fontWeight: '600'
                }}>Product</th>
                <th style={{
                  textAlign: 'left',
                  padding: '0.5rem',
                  fontWeight: '600'
                }}>Amount</th>
                <th style={{
                  textAlign: 'left',
                  padding: '0.5rem',
                  fontWeight: '600'
                }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index} style={{ borderBottom: '1px solid rgb(229, 231, 235)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td style={{
                    padding: '0.5rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px'
                  }}>
                    {tx.buyer}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    {tx.product}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    ${tx.amount.toFixed(2)}
                  </td>
                  <td style={{
                    padding: '0.5rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px'
                  }}>
                    {tx.signature}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}