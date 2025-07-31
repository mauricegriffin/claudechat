import { useState, useRef } from 'react'
import { imageService } from '../services/imageService'
import { Button } from '../../../components/ui/button'
import { ImagePlus, Loader2 } from 'lucide-react'

export default function ImageUpload({ userId, onImageSent }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  
  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    
    try {
      // Upload image
      const imageUrl = await imageService.uploadImage(file, userId)
      
      // Send as message
      await imageService.sendImageMessage(imageUrl, userId)
      
      // Notify parent component
      onImageSent?.()
      
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      alert(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-white hover:bg-white/20"
        title="Send image"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}