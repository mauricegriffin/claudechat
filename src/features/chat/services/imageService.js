import { supabase } from '@/supabaseClient'
import { compressImage, validateImage, generateImageFilename } from '@/lib/imageUtils'

export const imageService = {
  /**
   * Upload image to Supabase Storage
   * @param {File} file - Image file to upload
   * @param {string} userId - User ID
   * @returns {Promise<string>} Public URL of uploaded image
   */
  async uploadImage(file, userId) {
    try {
      // Validate image
      const validation = validateImage(file)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      // Compress image to save bandwidth
      console.log('Compressing image...')
      const compressedBlob = await compressImage(file)
      console.log(`Compressed from ${(file.size / 1024).toFixed(2)}KB to ${(compressedBlob.size / 1024).toFixed(2)}KB`)
      
      // Generate unique filename
      const fileName = generateImageFilename(userId, file.name)
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        })
      
      if (error) {
        console.error('Upload error:', error)
        throw error
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  },
  
  /**
   * Send message with image
   * @param {string} imageUrl - URL of uploaded image
   * @param {string} userId - User ID
   * @param {string} caption - Optional caption
   * @returns {Promise<Object>} Created message
   */
  async sendImageMessage(imageUrl, userId, caption = null) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          content: caption,
          image_url: imageUrl,
          message_type: 'image'
        })
        .select()
        .single()
      
      if (error) throw error
      
      console.log('Image message sent:', data)
      return data
    } catch (error) {
      console.error('Error sending image message:', error)
      throw error
    }
  },
  
  /**
   * Delete image from storage
   * @param {string} imageUrl - Full URL of image
   * @param {string} userId - User ID (for verification)
   */
  async deleteImage(imageUrl, userId) {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/storage/v1/object/public/chat-images/')
      if (urlParts.length !== 2) {
        throw new Error('Invalid image URL')
      }
      
      const filePath = urlParts[1]
      
      // Verify user owns the image (path starts with userId)
      if (!filePath.startsWith(userId)) {
        throw new Error('Unauthorized to delete this image')
      }
      
      const { error } = await supabase.storage
        .from('chat-images')
        .remove([filePath])
      
      if (error) throw error
      
      console.log('Image deleted:', filePath)
    } catch (error) {
      console.error('Error deleting image:', error)
      throw error
    }
  }
}