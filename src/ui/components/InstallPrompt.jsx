import { useState, useEffect } from 'react';
// Import LiftKit components for PWA install prompt
// LiftKit provides Material 3 design components with consistent theming
import Card from '@/ui/components/card'
import Button from '@/ui/components/button'
import IconButton from '@/ui/components/icon-button'
import Text from '@/ui/components/text'
import Row from '@/ui/components/row'
import Column from '@/ui/components/column'

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone || 
                               document.referrer.includes('android-app://');
    setIsStandalone(isInStandaloneMode);

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Don't show if already installed or if user dismissed recently
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (isInStandaloneMode || (dismissedTime && Date.now() - parseInt(dismissedTime) < 7 * 24 * 60 * 60 * 1000)) {
      return;
    }

    // Handle beforeinstallprompt event (Chrome/Edge/Samsung)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show custom prompt after delay
    if (isIOSDevice && !isInStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed or if prompt is dismissed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Modal backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleDismiss}
      >
        {/* Dialog Card using LiftKit Card component */}
        <Card 
          material="surface-container-highest"
          className="max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Column className="p-6" gap="md">
            {/* Header with title and close button */}
            <Row className="items-center justify-between mb-4">
              <Row className="items-center gap-2">
                {/* Phone icon using Unicode */}
                <span className="text-2xl text-primary">📱</span>
                <Text fontClass="title1" color="on-surface">
                  Install ClaudeChat
                </Text>
              </Row>
              <IconButton
                icon="x"
                onClick={handleDismiss}
                color="on-surface-variant"
                variant="text"
                size="sm"
              />
            </Row>
            
            {/* Main content */}
            <Column gap="md">
              <Text fontClass="body" color="on-surface">
                Install ClaudeChat on your device for a better experience with:
              </Text>
              
              {/* Benefits list */}
              <div className="pl-4">
                <Text fontClass="body" color="on-surface-variant" className="block mb-2">
                  • Quick access from your home screen
                </Text>
                <Text fontClass="body" color="on-surface-variant" className="block mb-2">
                  • Full-screen experience
                </Text>
                <Text fontClass="body" color="on-surface-variant" className="block mb-2">
                  • Works offline
                </Text>
                <Text fontClass="body" color="on-surface-variant" className="block">
                  • Push notifications (coming soon)
                </Text>
              </div>
              
              {/* iOS specific instructions */}
              {isIOS && (
                <Card 
                  material="primary-container" 
                  className="p-4"
                >
                  <Row className="items-center gap-3">
                    {/* Share icon using Unicode */}
                    <span className="text-xl text-on-primary-container">🔗</span>
                    <Text fontClass="body" color="on-primary-container">
                      Tap the share button and select "Add to Home Screen"
                    </Text>
                  </Row>
                </Card>
              )}
            </Column>
            
            {/* Action buttons */}
            <Row className="gap-3 mt-4" justifyContent="end">
              <Button
                onClick={handleDismiss}
                variant="text"
                color="on-surface-variant"
                label="Not Now"
                size="md"
              />
              {!isIOS && (
                <Button 
                  onClick={handleInstall} 
                  variant="fill"
                  color="primary"
                  label="Install"
                  startIcon="download"
                  size="md"
                />
              )}
              {isIOS && (
                <Button 
                  onClick={handleDismiss} 
                  variant="fill"
                  color="primary"
                  label="Got it"
                  size="md"
                />
              )}
            </Row>
          </Column>
        </Card>
      </div>
    </>
  );
}