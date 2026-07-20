'use client'

import { useState, useRef, useEffect, CSSProperties } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  className?: string
  containerClassName?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  onLoad?: () => void
  onError?: () => void
  fallback?: string
  lazy?: boolean
  threshold?: number
  rootMargin?: string
  aspectRatio?: number
  responsive?: boolean
}

/**
 * Optimized image component with lazy loading, blur placeholder, and error handling
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  containerClassName,
  objectFit = 'cover',
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  fallback = '/placeholder.svg',
  lazy = true,
  threshold = 0.1,
  rootMargin = '200px',
  aspectRatio,
  responsive = false
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate blur data URL if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL
    // Default blur placeholder
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority, threshold, rootMargin])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Calculate dimensions for responsive images
  const getDimensions = () => {
    if (responsive && aspectRatio) {
      return {
        width: width || 800,
        height: height || Math.round((width || 800) / aspectRatio)
      }
    }
    return { width: width || 400, height: height || 300 }
  }

  // Generate sizes attribute for responsive images
  const getSizes = () => {
    if (sizes) return sizes
    if (responsive) {
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    }
    return undefined
  }

  const dimensions = getDimensions()
  const containerStyle: CSSProperties = responsive
    ? { position: 'relative', width: '100%', paddingBottom: `${(dimensions.height / dimensions.width) * 100}%` }
    : {}

  const imageStyle: CSSProperties = responsive
    ? { objectFit }
    : { width: dimensions.width, height: dimensions.height, objectFit }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        containerClassName
      )}
      style={containerStyle}
    >
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse',
            className
          )}
          style={imageStyle}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800',
            className
          )}
          style={imageStyle}
        >
          {fallback ? (
            <Image
              src={fallback}
              alt={alt}
              width={dimensions.width}
              height={dimensions.height}
              className={className}
              style={{ objectFit }}
            />
          ) : (
            <div className="text-center p-4">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-gray-500">Failed to load image</p>
            </div>
          )}
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <Image
          src={src}
          alt={alt}
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={placeholder === 'blur' ? getBlurDataURL() : undefined}
          sizes={getSizes()}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          style={responsive ? { ...imageStyle, position: 'absolute', inset: 0, width: '100%', height: '100%' } : imageStyle}
        />
      )}
    </div>
  )
}

/**
 * Preload images for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage))
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(src: string, widths: number[]): string {
  return widths
    .map(width => {
      const url = src.includes('?')
        ? `${src}&w=${width}`
        : `${src}?w=${width}`
      return `${url} ${width}w`
    })
    .join(', ')
}

/**
 * Hook to detect WebP support
 */
export function useWebPSupport(): boolean {
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const webP = new window.Image()
    webP.onload = webP.onerror = () => {
      setSupported(webP.height === 2)
    }
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  }, [])

  return supported
}

/**
 * Hook to detect AVIF support
 */
export function useAVIFSupport(): boolean {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const avif = new window.Image()
    avif.onload = () => setSupported(true)
    avif.onerror = () => setSupported(false)
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg'
  }, [])

  return supported
}