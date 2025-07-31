/**
 * Image compression and optimization utilities
 * Helps stay within Supabase free tier limits
 */

/**
 * Compress image to stay within size limits
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width (default 1200px)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Calculate new dimensions
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }
        
        // Set canvas dimensions
        canvas.width = width
        canvas.height = height
        
        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target.result
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image before upload
 * @param {File} file - File to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateImage(file) {
  // Max 5MB after compression
  const maxSize = 5 * 1024 * 1024
  
  // Allowed types
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Please upload a valid image (JPEG, PNG, GIF, or WebP)' 
    }
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'Image must be less than 5MB' 
    }
  }
  
  return { valid: true }
}

/**
 * Generate unique filename
 * @param {string} userId - User ID
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
export function generateImageFilename(userId, originalName) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  
  return `${userId}/${timestamp}-${random}.${extension}`
}

/**
 * Get image dimensions for display
 * @param {string} url - Image URL
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}