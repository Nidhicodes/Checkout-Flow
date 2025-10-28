import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.resolve('./cadence/transactions/purchase.cdc');
    const transaction = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Failed to read transaction file:', error);
    return new NextResponse('Failed to read transaction file', { status: 500 });
  }
}
