import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fcl from '@onflow/sdk';
import * as t from '@onflow/types';

const MERCHANT_WALLET = "0x3fe32988f9457b01";

function apiLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [TRANSACTION-VERIFY] [${level.toUpperCase()}] ${message}${logData}`);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  apiLog('info', 'Transaction verification request received');

  try {
    const { transactionId, product } = await req.json();
    
    if (!transactionId || !product) {
      apiLog('error', 'Missing transactionId or product', { transactionId: !!transactionId, product: !!product });
      return new NextResponse('Missing transactionId or product', { status: 400 });
    }

    apiLog('info', 'Processing transaction verification', { 
      transactionId: transactionId.substring(0, 12) + '...',
      product: product.name,
      price: product.price
    });

    fcl.config().put("accessNode.api", "https://rest-testnet.onflow.org");
    const tx = await fcl.send([fcl.getTransaction(transactionId)]).then(fcl.decode);
    
    if (tx) {
      const merchantIncluded = tx.events.some((e: any) => e.data.to === MERCHANT_WALLET);
      
      apiLog('info', 'Transaction analysis', {
        merchantIncluded,
        merchantWallet: MERCHANT_WALLET,
        transactionId: transactionId.substring(0, 12) + '...'
      });

      if (merchantIncluded) {
        let imageUrl = null;
        try {
          const { AIImageGenerator } = await import('@/lib/ai-image-generator');
          const imageGenerator = new AIImageGenerator(process.env.STABILITY_API_KEY!);
          
          const generatedImage = await imageGenerator.generateImage({
            productName: product.name,
            style: 'futuristic',
            mood: 'dark'
          });
          
          imageUrl = generatedImage.dataUrl;
          
          apiLog('info', 'AI image generation successful', {
            productName: product.name,
            imageSize: generatedImage.base64.length
          });

        } catch (aiError) {
          apiLog('error', 'AI image generation failed', { 
            error: (aiError as Error).message,
            productName: product.name 
          });
        }
        
        const newTransaction = {
          buyer: tx.events[0].data.from,
          product: product.name,
          amount: product.price,
          signature: transactionId,
          timestamp: Date.now(),
          imageUrl: imageUrl,
        };
        
        db.transactions.push(newTransaction);
        db.totalSales += product.price;
        db.nftReceiptsIssued += 1;

        const processingTime = Date.now() - startTime;
        apiLog('info', 'Transaction verification completed successfully', {
          processingTimeMs: processingTime,
          totalSales: db.totalSales,
          nftReceiptsIssued: db.nftReceiptsIssued,
        });

        return NextResponse.json({ 
          status: 'ok',
          details: {
            processingTimeMs: processingTime,
            imageGenerated: !!imageUrl
          }
        });
      } else {
        apiLog('warn', 'Transaction does not include merchant wallet', {
          transactionId: transactionId.substring(0, 12) + '...',
          merchantWallet: MERCHANT_WALLET
        });
      }
    } else {
      apiLog('error', 'Transaction not found', {
        transactionId: transactionId.substring(0, 12) + '...',
      });
    }
    
    return new NextResponse('Transaction not valid', { status: 400 });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    apiLog('error', 'Unexpected error in transaction verification', {
      error: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack?.split('\n').slice(0, 5),
      processingTimeMs: processingTime
    });
    
    return NextResponse.json({
      error: 'Internal Server Error',
      message: (error as Error)?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          name: (error as Error)?.name,
          stack: (error as Error)?.stack?.split('\n').slice(0, 10)
        }
      })
    }, { status: 500 });
  }
}
