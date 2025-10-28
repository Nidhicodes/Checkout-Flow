import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Flow blockchain RPC endpoints
const FLOW_RPC_ENDPOINTS = [
  'https://rest-testnet.onflow.org',  // Flow Testnet
  'https://access-testnet.onflow.org', // Alternative testnet endpoint
];

// Global connection cache
let cachedEndpoint: string | null = null;

function apiLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [GET-TRANSACTION] [${level.toUpperCase()}] ${message}${logData}`);
}

// Validate Flow transaction ID format (64 character hex string)
function isValidFlowTxId(txId: string): boolean {
  const hexRegex = /^[a-fA-F0-9]{64}$/;
  return hexRegex.test(txId);
}

// Get a working Flow RPC endpoint
async function getWorkingEndpoint(): Promise<string | null> {
  if (cachedEndpoint) {
    try {
      // Test if cached endpoint still works
      const response = await fetch(`${cachedEndpoint}/v1/blocks?height=sealed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        apiLog('info', `Using cached endpoint: ${cachedEndpoint}`);
        return cachedEndpoint;
      }
    } catch (error) {
      apiLog('warn', `Cached endpoint failed: ${cachedEndpoint}`);
      cachedEndpoint = null;
    }
  }

  for (const endpoint of FLOW_RPC_ENDPOINTS) {
    try {
      apiLog('info', `Testing Flow RPC endpoint: ${endpoint}`);
      
      const response = await fetch(`${endpoint}/v1/blocks?height=sealed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        apiLog('info', `Flow RPC endpoint working: ${endpoint}`, { 
          blockHeight: data?.height || 'unknown' 
        });
        
        cachedEndpoint = endpoint;
        return endpoint;
      }
    } catch (error) {
      apiLog('warn', `Flow RPC endpoint failed: ${endpoint}`, { 
        error: (error as Error).message 
      });
      continue;
    }
  }
  
  apiLog('error', 'No working Flow RPC endpoints found');
  return null;
}

// Fetch transaction from Flow blockchain
async function fetchFlowTransaction(txId: string, endpoint: string) {
  const url = `${endpoint}/v1/transactions/${txId}`;
  
  apiLog('info', 'Fetching transaction from Flow', { 
    txId: txId.substring(0, 12) + '...',
    endpoint 
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Flow API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ signature: string }> }
) {
  const startTime = Date.now();
  apiLog('info', 'Get transaction request received');

  try {
    // FIXED: Await params before accessing properties
    const params = await context.params;
    const transactionId = params?.signature;
    
    if (!transactionId) {
      apiLog('error', 'Missing transaction ID parameter');
      return NextResponse.json(
        { 
          error: 'Missing transaction ID parameter',
          details: 'Transaction ID is required to fetch transaction details'
        }, 
        { status: 400 }
      );
    }

    if (typeof transactionId !== 'string' || transactionId.trim().length === 0) {
      apiLog('error', 'Invalid transaction ID parameter', { 
        transactionId: typeof transactionId, 
        length: transactionId?.length 
      });
      return NextResponse.json(
        { 
          error: 'Invalid transaction ID parameter',
          details: 'Transaction ID must be a non-empty string'
        }, 
        { status: 400 }
      );
    }

    const trimmedTxId = transactionId.trim();
    
    // Validate Flow transaction ID format
    if (!isValidFlowTxId(trimmedTxId)) {
      apiLog('error', 'Invalid Flow transaction ID format', { 
        transactionId: trimmedTxId.substring(0, 12) + '...',
        length: trimmedTxId.length
      });
      return NextResponse.json(
        { 
          error: 'Invalid transaction ID format',
          details: 'Transaction ID must be a 64-character hexadecimal string',
          transactionId: trimmedTxId.substring(0, 12) + '...',
          length: trimmedTxId.length
        }, 
        { status: 400 }
      );
    }

    apiLog('info', 'Looking for transaction', { 
      transactionId: trimmedTxId.substring(0, 12) + '...',
      totalTransactions: db.transactions.length
    });

    // First, check local database
    const localTransaction = db.transactions.find(tx => tx.signature === trimmedTxId);
    
    if (localTransaction) {
      const processingTime = Date.now() - startTime;
      apiLog('info', 'Transaction found in local database', {
        transactionId: trimmedTxId.substring(0, 12) + '...',
        product: localTransaction.product,
        amount: localTransaction.amount,
        processingTimeMs: processingTime
      });
      
      return NextResponse.json({
        ...localTransaction,
        source: 'local_database',
        processingTimeMs: processingTime
      });
    }

    // If not found locally, try to fetch from Flow blockchain
    apiLog('info', 'Transaction not found locally, checking Flow blockchain', {
      transactionId: trimmedTxId.substring(0, 12) + '...'
    });

    const endpoint = await getWorkingEndpoint();
    if (!endpoint) {
      apiLog('error', 'No working Flow RPC endpoints available');
      return NextResponse.json(
        { 
          error: 'Failed to connect to Flow blockchain',
          details: 'All RPC endpoints are currently unavailable',
          transactionId: trimmedTxId.substring(0, 12) + '...'
        }, 
        { status: 503 }
      );
    }

    // Try to fetch transaction from Flow blockchain
    let flowTransaction = null;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries && !flowTransaction) {
      try {
        apiLog('info', `Fetching transaction from Flow (attempt ${attempt + 1}/${maxRetries})`, {
          transactionId: trimmedTxId.substring(0, 12) + '...',
          rpcEndpoint: endpoint
        });
        
        flowTransaction = await fetchFlowTransaction(trimmedTxId, endpoint);
        
        if (flowTransaction) {
          apiLog('info', 'Transaction found on Flow blockchain', {
            transactionId: trimmedTxId.substring(0, 12) + '...',
            status: flowTransaction.status
          });
          break;
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        apiLog('error', `Error fetching transaction from Flow (attempt ${attempt + 1}/${maxRetries})`, {
          error: errorMessage,
          transactionId: trimmedTxId.substring(0, 12) + '...'
        });
        
        // If it's a 404 or invalid format, don't retry
        if (errorMessage.includes('404') || errorMessage.includes('Invalid')) {
          apiLog('error', 'Transaction not found on Flow blockchain', { 
            transactionId: trimmedTxId 
          });
          break;
        }
        
        // Try next endpoint if this one failed
        if (attempt < maxRetries - 1) {
          cachedEndpoint = null;
          const newEndpoint = await getWorkingEndpoint();
          if (!newEndpoint) break;
        }
      }
      attempt++;
    }

    if (flowTransaction) {
      // Create a simplified transaction object from Flow data
      const simplifiedTransaction = {
        signature: trimmedTxId,
        buyer: flowTransaction.proposer || 'Unknown',
        amount: 0, // Would need to parse events to get amount
        timestamp: Date.now(), // Flow API might provide this in events
        product: 'Purchased Product',
        status: flowTransaction.status || 'unknown',
        source: 'flow_blockchain',
        processingTimeMs: Date.now() - startTime,
        rpcEndpoint: endpoint,
        blockId: flowTransaction.reference_block_id
      };

      apiLog('info', 'Returning transaction data from Flow blockchain', {
        transactionId: trimmedTxId.substring(0, 12) + '...',
        processingTimeMs: simplifiedTransaction.processingTimeMs
      });

      return NextResponse.json(simplifiedTransaction);
    }

    // Transaction not found anywhere
    const processingTime = Date.now() - startTime;
    apiLog('warn', 'Transaction not found in local database or Flow blockchain', {
      transactionId: trimmedTxId.substring(0, 12) + '...',
      processingTimeMs: processingTime,
      localTransactionCount: db.transactions.length
    });

    return NextResponse.json(
      { 
        error: 'Transaction not found',
        details: 'Transaction was not found in local database or on Flow blockchain',
        transactionId: trimmedTxId.substring(0, 12) + '...',
        searchedLocations: ['local_database', 'flow_blockchain'],
        processingTimeMs: processingTime,
        rpcEndpoint: endpoint
      }, 
      { status: 404 }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    apiLog('error', 'Unexpected error in get transaction API', {
      error: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack?.split('\n').slice(0, 5),
      processingTimeMs: processingTime
    });
    
    return NextResponse.json({
      error: 'Internal Server Error',
      message: (error as Error)?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      processingTimeMs: processingTime,
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          name: (error as Error)?.name,
          stack: (error as Error)?.stack?.split('\n').slice(0, 10)
        }
      })
    }, { status: 500 });
  }
}