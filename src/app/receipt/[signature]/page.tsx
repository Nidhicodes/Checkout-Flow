'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Transaction } from '@/lib/db';
import ImageGenerationModal from '@/components/ImageGenerationModal';
import { GeneratedImage } from '@/lib/ai-image-generator';

export default function Receipt() {
  const pathname = usePathname();
  const signature = pathname.split('/').pop();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [customImage, setCustomImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    if (signature) {
      fetch(`/api/get-transaction/${signature}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.error) {
            console.error('API Error:', data);
            setTransaction(null);
          } else {
            console.log('🧾 Transaction loaded:', data);
            console.log('🏷️ Product name:', data.product);
            setTransaction(data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Fetch error:', err);
          setTransaction(null);
          setLoading(false);
        });
    }
  }, [signature]);

  const handleImageGenerated = (image: GeneratedImage) => {
    setCustomImage(image);
  };

  const handleOpenImageModal = () => {
    console.log('🎨 Opening image modal');
    console.log('🏷️ Product name being passed:', transaction?.product);
    console.log('🧾 Full transaction:', transaction);
    setShowImageModal(true);
  };

  const currentImage = customImage?.dataUrl || transaction?.imageUrl;

  return (
    <div style={{
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: '#111827',
      color: '#f3f4f6'
    }}>
      <header style={{
        width: '100%',
        maxWidth: '56rem',
        margin: '0 auto',
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 'bold',
          color: 'transparent',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          backgroundImage: 'linear-gradient(to right, #c084fc, #22d3ee)'
        }}>
          {loading ? 'Loading Receipt...' : transaction ? 'Payment Successful!' : 'Receipt Not Found'}
        </h1>
        {transaction && <p style={{
          fontSize: '1.125rem',
          color: '#9ca3af',
          marginTop: '0.5rem'
        }}>Here is your unique, AI-generated NFT receipt.</p>}
      </header>

      <main style={{
        width: '100%',
        maxWidth: '32rem',
        margin: '0 auto',
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
        padding: '2rem',
        borderRadius: '0.5rem',
        border: '1px solid #374151'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '24rem'
          }}>
            <div style={{
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
              borderRadius: '9999px',
              height: '2rem',
              width: '2rem',
              borderBottom: '2px solid #22d3ee'
            }}></div>
          </div>
        ) : transaction ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative' }}>
              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={`${transaction.product} NFT Receipt`}
                  width={400}
                  height={400}
                  style={{
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  priority
                />
              ) : (
                <img
                  src="https://placehold.co/400x400/1A202C/FFFFFF?text=Image%0ANot%0AAvailable"
                  alt="Placeholder image"
                  width={400}
                  height={400}
                  style={{
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              )}
              
              {!currentImage && (
                <button
                  onClick={handleOpenImageModal}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.5rem',
                    transition: 'opacity 0.3s',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎨</div>
                    <div style={{ color: 'white', fontWeight: '600' }}>Generate AI Image</div>
                  </div>
                </button>
              )}
            </div>

            {currentImage && (
              <button
                onClick={handleOpenImageModal}
                style={{
                  fontSize: '0.875rem',
                  color: '#22d3ee',
                  marginBottom: '1rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#67e8f9'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#22d3ee'}
              >
                Generate New AI Image
              </button>
            )}

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'white'
            }}>{transaction.product}</h2>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#22d3ee',
              marginTop: '0.25rem'
            }}>{transaction.amount} FLOW</p>

            <div style={{
              width: '100%',
              marginTop: '1.5rem',
              borderTop: '1px solid #374151',
              paddingTop: '1.5rem',
              fontSize: '0.875rem',
              color: '#9ca3af'
            }}>
              <p style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Status:</span> 
                <span style={{ fontWeight: '600', color: '#4ade80' }}>Confirmed</span>
              </p>
              <p style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.5rem'
              }}>
                <span>Transaction ID:</span>
              </p>
              <p style={{
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                color: '#6b7280'
              }}>{signature}</p>
              
              {customImage && (
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #374151'
                }}>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>AI Generated Image</p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#4b5563',
                    wordBreak: 'break-all'
                  }}>
                    Prompt: {customImage.prompt.substring(0, 100)}...
                  </p>
                </div>
              )}
            </div>

            <p style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '1.5rem'
            }}>
              This is a demo NFT receipt. {customImage ? 'Image generated by Stability AI.' : 'Click above to generate a unique AI image.'}
            </p>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            paddingTop: '2rem',
            paddingBottom: '2rem'
          }}>
            <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>❌</div>
            <p style={{
              fontSize: '1.25rem',
              color: '#d1d5db',
              marginBottom: '0.5rem'
            }}>Transaction Not Found</p>
            <p style={{ color: '#6b7280' }}>We could not find a transaction for this signature.</p>
            <p style={{
              fontSize: '0.75rem',
              color: '#4b5563',
              marginTop: '1rem',
              wordBreak: 'break-all'
            }}>{signature}</p>
          </div>
        )}
      </main>

      <footer style={{
        width: '100%',
        maxWidth: '56rem',
        margin: '0 auto',
        textAlign: 'center',
        marginTop: '2rem'
      }}>
        <Link 
          href="/" 
          style={{
            color: '#22d3ee',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          Back to store
        </Link>
      </footer>

      {transaction && (
        <ImageGenerationModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          productName={transaction.product || 'Purchased Product'}
          onImageGenerated={handleImageGenerated}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}