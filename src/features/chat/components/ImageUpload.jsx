import { useState, useRef, useEffect } from 'react'
import { imageService } from '../services/imageService'
import { Button } from '../../../components/ui/button'
import { ImagePlus, Loader2, Camera } from 'lucide-react'

export default function ImageUpload({ userId, conversationId, onImageSent }) {
  const [uploading, setUploading] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  
  // Enable after migration is complete
  const isEnabled = true // Updated for conversation support
  
  // Check if device has camera capabilities
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Check if we can enumerate devices (may require permission)
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(device => device.kind === 'videoinput')
          setHasCamera(videoDevices.length > 0)
        } else {
          // Fallback: assume camera exists on mobile devices
          setHasCamera(/Mobi|Android/i.test(navigator.userAgent))
        }
      } catch (error) {
        console.log('Camera check failed, assuming camera available on mobile:', error)
        // Fallback: assume camera exists on mobile devices
        setHasCamera(/Mobi|Android/i.test(navigator.userAgent))
      }
    }
    
    checkCamera()
  }, [])
  
  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !conversationId) return
    
    setUploading(true)
    
    try {
      // Upload image
      const imageUrl = await imageService.uploadImage(file, userId)
      
      // Send as message to the specific conversation
      await imageService.sendImageMessageToConversation(imageUrl, userId, conversationId)
      
      // Notify parent component
      onImageSent?.()
      
      // Clear inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      alert(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleCameraCapture = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !conversationId) return
    
    setUploading(true)
    
    try {
      // Upload image
      const imageUrl = await imageService.uploadImage(file, userId)
      
      // Send as message to the specific conversation
      await imageService.sendImageMessageToConversation(imageUrl, userId, conversationId)
      
      // Notify parent component
      onImageSent?.()
      
      // Clear inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Camera capture failed:', error)
      alert(error.message || 'Failed to capture image')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
        disabled={uploading}
      />
      
      {/* Gallery/file picker button */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => isEnabled && fileInputRef.current?.click()}
        disabled={uploading || !isEnabled}
        className={`text-white hover:bg-white/20 ${!isEnabled ? 'opacity-50' : ''}`}
        title={isEnabled ? "Choose image from gallery" : "Image upload disabled - run database migration first"}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Button>
      
      {/* Camera capture button - only show if camera is available */}
      {hasCamera && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => isEnabled && cameraInputRef.current?.click()}
          disabled={uploading || !isEnabled}
          className={`text-white hover:bg-white/20 ${!isEnabled ? 'opacity-50' : ''}`}
          title={isEnabled ? "Take photo with camera" : "Camera disabled - run database migration first"}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      )}
    </>
  )
}