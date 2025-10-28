'use client';
import './globals.css'
import { useEffect, useState } from 'react';
import { initWeb3Auth } from '@/lib/web3auth';
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await initWeb3Auth();
        console.log("Web3Auth initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Web3Auth:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    init();
  }, []);

  if (isInitializing) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh'
          }}>
            <p style={{ fontSize: '1.25rem' }}>Loading...</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}