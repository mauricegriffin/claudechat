import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UpdateNotification() {
  const [showNotification, setShowNotification] = useState(false)
  
  useEffect(() => {
    // Expose the function globally so service worker can trigger it
    window.showUpdateNotification = () => {
      setShowNotification(true)
    }
    
    return () => {
      delete window.showUpdateNotification
    }
  }, [])
  
  const handleRefresh = () => {
    window.location.reload()
  }
  
  if (!showNotification) return null
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-[90%] w-96">
      <Card className="border border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-card-foreground">
                Update Available!
              </h3>
              <p className="text-sm text-muted-foreground">
                A new version is ready to install
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              size="sm"
              className="shrink-0"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}