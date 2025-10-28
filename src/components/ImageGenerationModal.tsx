'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GeneratedImage } from '@/lib/ai-image-generator';

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  onImageGenerated: (image: GeneratedImage) => void;
}

export default function ImageGenerationModal({ 
  isOpen, 
  onClose, 
  productName, 
  onImageGenerated 
}: ImageGenerationModalProps) {
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<'futuristic' | 'realistic' | 'artistic' | 'minimal'>('futuristic');
  const [selectedMood, setSelectedMood] = useState<'dark' | 'bright' | 'neon' | 'elegant'>('dark');
  const [error, setError] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<number | null>(null);

  const generateImages = async () => {
    setLoading(true);
    setGeneratedImages([]);
    setError(null);

    const requestPayload = {
      productName,
      style: selectedStyle,
      mood: selectedMood
    };

    console.log('🚀 Sending request to /api/generate-nft-image');
    console.log('📦 Request payload:', requestPayload);

    try {
      const response = await fetch('/api/generate-nft-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Success response data:', data);

      if (data.success && data.image) {
        console.log('🖼️ Image data received:', {
          hasBase64: !!data.image.base64,
          hasDataUrl: !!data.image.dataUrl,
          prompt: data.image.prompt,
          timestamp: data.image.timestamp
        });
        
        setGeneratedImages([data.image]);
        console.log('✨ Images set in state');
      } else {
        console.error('❌ Unexpected response format:', data);
        throw new Error(data.message || data.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('💥 Error generating images:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectImage = (image: GeneratedImage) => {
    console.log('🎯 Image selected:', {
      hasBase64: !!image.base64,
      hasDataUrl: !!image.dataUrl,
      prompt: image.prompt
    });
    onImageGenerated(image);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '0.5rem',
        maxWidth: '56rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #374151'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: 'white'
            }}>Generate NFT Receipt Image</h2>
            <button
              onClick={onClose}
              style={{
                color: '#9ca3af',
                fontSize: '2rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
            >
              ×
            </button>
          </div>
          <p style={{
            color: '#9ca3af',
            marginTop: '0.5rem'
          }}>Creating AI image for: {productName}</p>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Style and Mood Selection */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#d1d5db',
                marginBottom: '0.75rem'
              }}>Style</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                {(['futuristic', 'realistic', 'artistic', 'minimal'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '2px solid',
                      borderColor: selectedStyle === style ? '#22d3ee' : '#4b5563',
                      backgroundColor: selectedStyle === style ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                      color: selectedStyle === style ? '#22d3ee' : '#d1d5db',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedStyle !== style) {
                        e.currentTarget.style.borderColor = '#6b7280';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedStyle !== style) {
                        e.currentTarget.style.borderColor = '#4b5563';
                      }
                    }}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#d1d5db',
                marginBottom: '0.75rem'
              }}>Mood</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                {(['dark', 'bright', 'neon', 'elegant'] as const).map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '2px solid',
                      borderColor: selectedMood === mood ? '#c084fc' : '#4b5563',
                      backgroundColor: selectedMood === mood ? 'rgba(192, 132, 252, 0.1)' : 'transparent',
                      color: selectedMood === mood ? '#c084fc' : '#d1d5db',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedMood !== mood) {
                        e.currentTarget.style.borderColor = '#6b7280';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMood !== mood) {
                        e.currentTarget.style.borderColor = '#4b5563';
                      }
                    }}
                  >
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={generateImages}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                backgroundImage: 'linear-gradient(to right, #a855f7, #06b6d4)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundImage = 'linear-gradient(to right, #9333ea, #0891b2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundImage = 'linear-gradient(to right, #a855f7, #06b6d4)';
                }
              }}
            >
              {loading ? 'Generating...' : 'Generate AI Image'}
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(127, 29, 29, 0.2)',
              border: '1px solid #ef4444',
              color: '#f87171',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontWeight: '600' }}>Generation Failed</p>
              <p style={{
                fontSize: '0.875rem',
                marginTop: '0.25rem'
              }}>{error}</p>
              <button 
                onClick={() => setError(null)}
                style={{
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'none'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'underline'}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              textAlign: 'center',
              paddingTop: '2rem',
              paddingBottom: '2rem'
            }}>
              <div style={{
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
                borderRadius: '9999px',
                height: '2rem',
                width: '2rem',
                borderBottom: '2px solid #22d3ee'
              }}></div>
              <p style={{
                color: '#9ca3af',
                marginTop: '1rem'
              }}>Creating your unique NFT image...</p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                marginTop: '0.5rem'
              }}>This may take 10-30 seconds</p>
            </div>
          )}

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'white',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>Select Your NFT Image</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                {generatedImages.map((image, index) => (
                  <div 
                    key={index} 
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredImage(index)}
                    onMouseLeave={() => setHoveredImage(null)}
                  >
                    <Image
                      src={image.dataUrl}
                      alt={`Generated NFT ${index + 1}`}
                      width={300}
                      height={300}
                      style={{
                        borderRadius: '0.5rem',
                        width: '100%',
                        height: 'auto',
                        cursor: 'pointer',
                        transition: 'transform 0.3s',
                        transform: hoveredImage === index ? 'scale(1.05)' : 'scale(1)'
                      }}
                      onClick={() => selectImage(image)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      backgroundColor: hoveredImage === index ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0)',
                      borderRadius: '0.5rem',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <button
                        onClick={() => selectImage(image)}
                        style={{
                          opacity: hoveredImage === index ? 1 : 0,
                          backgroundColor: '#06b6d4',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          fontWeight: '600',
                          transition: 'opacity 0.3s',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Select This Image
                      </button>
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.5rem',
                      textAlign: 'center'
                    }}>
                      {selectedStyle} • {selectedMood}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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