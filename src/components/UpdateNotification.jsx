import { useState, useEffect } from 'react'
import Card from '@/components/card'
import Button from '@/components/button'
import Text from '@/components/text'
import Row from '@/components/row'

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
    <div style={{
      position: 'fixed',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      maxWidth: '90%',
      width: '400px'
    }}>
      <Card 
        material="glass"
        materialProps={{
          thickness: "thick",
          tint: "primary",
          tintOpacity: 0.9,
          light: true
        }}
        style={{padding: '1rem'}}
      >
        <Row gap="md" alignItems="center">
          <div style={{flex: 1}}>
            <Text fontClass="body" color="on-primary" fontWeight="semibold">
              Update Available!
            </Text>
            <Text fontClass="caption" color="on-primary" style={{opacity: 0.9}}>
              A new version is ready to install
            </Text>
          </div>
          <Button
            variant="fill"
            color="on-primary"
            label="Refresh"
            onClick={handleRefresh}
            size="sm"
          />
        </Row>
      </Card>
    </div>
  )
}