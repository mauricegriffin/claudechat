import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '../../auth/services/authService'
import { messageService } from '../services/messageService'

// Import shadcn/ui components
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { ScrollArea } from '../../../components/ui/scroll-area'
import { Avatar, AvatarFallback } from '../../../components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../../components/ui/sheet'
import { 
  Menu, 
  Search, 
  Settings, 
  LogOut, 
  MessageCircle, 
  Send, 
  User,
  Loader2
} from 'lucide-react'

export default function Chat({ user, onLogout }) {
  // State management for chat functionality
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  // Menu state for user dropdown - simplified for LiftKit
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // Ref for scrolling to bottom of messages
  const messagesEndRef = useRef(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserMenu])

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async () => {
    try {
      const data = await authService.getUserProfile(user.id)
      if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }, [user.id])

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile()
  }, [user, fetchUserProfile])

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages()
    
    // Subscribe to real-time messages
    const channel = messageService.subscribeToMessages((payload) => {
      if (payload.type === 'INSERT' || payload.eventType === 'INSERT') {
        // Fetch the new message with username
        fetchNewMessage(payload.new.id)
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Fetch a single new message with username
  const fetchNewMessage = async (messageId) => {
    try {
      const data = await messageService.fetchNewMessage(messageId)
      if (data) {
        setMessages(prev => [...prev, data])
      }
    } catch (error) {
      console.error('Error fetching new message:', error)
    }
  }

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const data = await messageService.fetchMessagesWithUsername()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    
    try {
      await messageService.sendMessage(newMessage.trim(), user.id)
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handlers moved to inline usage to avoid unused variable errors

  const handleBackToChat = () => {
    setShowSettings(false)
  }

  // Format message timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Settings page component
  console.log('showSettings state:', showSettings);
  if (showSettings) {
    return (
      <SettingsPage 
        user={user} 
        userProfile={userProfile}
        onBack={handleBackToChat}
        onProfileUpdate={fetchUserProfile}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Navigation Bar */}
      <Card className="rounded-none border-b bg-red-900 text-white fixed top-0 left-0 right-0 z-50">
        <CardContent className="flex items-center justify-between p-4">
          {/* Hamburger menu button */}
          <Sheet open={showUserMenu} onOpenChange={setShowUserMenu}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {/* User info */}
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(userProfile?.username || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{userProfile?.username || user.email.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                {/* Menu items */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Settings button clicked');
                      setShowSettings(true);
                      setShowUserMenu(false);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Logout button clicked');
                      try {
                        await authService.signOut();
                        onLogout();
                      } catch (error) {
                        console.error('Logout error:', error);
                      }
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Username display */}
          <span className="text-sm font-medium">
            {userProfile?.username || user.email.split('@')[0]}
          </span>
        </CardContent>
      </Card>

      {/* Main Chat Content - with top padding to account for fixed header */}
      <div className="flex flex-col h-full pt-16">
        {/* Chat Messages Area - with bottom padding for fixed input */}
        <ScrollArea className="flex-1 p-4 pb-20">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.user_id === user.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    <Card className={`p-3 ${isOwnMessage ? 'bg-message-outgoing text-message-outgoing-foreground' : 'bg-muted'}`}>
                      {/* Username for other users */}
                      {!isOwnMessage && (
                        <p className="text-xs font-semibold mb-1 text-primary">
                          {message.username || 'Unknown User'}
                        </p>
                      )}
                      
                      {/* Message content */}
                      <p className="text-sm break-words">
                        {message.content}
                      </p>
                      
                      {/* Timestamp */}
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                      </p>
                    </Card>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input Area - Fixed to bottom */}
        <Card className="rounded-none border-t bg-red-900 text-white fixed bottom-0 left-0 right-0 z-40">
          <CardContent className="p-4">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              {/* Message input field */}
              <div className="flex-1 relative">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={loading}
                  className="pr-10 bg-black text-white placeholder:text-gray-400"
                />
                <MessageCircle className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              
              {/* Send button */}
              <Button
                type="submit"
                size="icon"
                disabled={loading || !newMessage.trim()}
                className="rounded-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Settings Component - allows users to update their profile and install app
// Uses a mix of Material UI and LiftKit components
function SettingsPage({ user, userProfile, onBack, onProfileUpdate }) {
  // Local state for settings form
  const [newUsername, setNewUsername] = useState(userProfile?.username || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  
  // Check if app is installable
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Check if app is already installed
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = window.navigator.standalone === true
    
    if (isStandalone || isIOSStandalone) {
      setIsInstallable(false)
    }
    
    // Check for iOS Safari (can show manual install instructions)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
    
    // Show install option for iOS Safari even without beforeinstallprompt
    if (isIOSSafari && !isIOSStandalone) {
      setIsInstallable(true)
    }
    
    // Debug info
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])
  
  const handleInstallApp = async () => {
    // Check if this is iOS Safari (no beforeinstallprompt available)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
    
    if (isIOSSafari && !deferredPrompt) {
      // Show iOS install instructions
      alert('To install ClaudeChat on iOS:\n\n1. Tap the Share button (⬆️) in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to install the app')
      return
    }
    
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstallable(false)
      setSuccess('App installed successfully!')
    }
    
    setDeferredPrompt(null)
  }
  

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    
    if (!newUsername.trim() || newUsername === userProfile?.username) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      
      await authService.updateUserProfile(user.id, newUsername)

      setSuccess('Username updated successfully!')
      onProfileUpdate() // Refresh profile data
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      console.error('Error updating username:', error)
      setError(error.message || 'Failed to update username')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Settings Header */}
      <Card className="rounded-none border-b bg-primary text-primary-foreground">
        <CardContent className="flex items-center p-4">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-primary-foreground hover:bg-primary-foreground/20 mr-4"
          >
            ← Back to Chat
          </Button>
          <h1 className="text-xl font-semibold flex-1">
            Settings
          </h1>
        </CardContent>
      </Card>

      {/* Settings Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              {/* Title */}
              <h2 className="text-2xl font-semibold mb-6">
                Account Settings
              </h2>
          
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                {/* Error/Success Messages */}
                {error && (
                  <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-center">
                    <span className="mr-2">❌</span>
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="bg-green-500/15 text-green-700 text-sm p-3 rounded-md border border-green-500/20 flex items-center">
                    <span className="mr-2">✅</span>
                    {success}
                  </div>
                )}

                {/* Username Input */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Choose a unique username for your profile</p>
                </div>

                {/* Update Button */}
                <Button
                  type="submit"
                  disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
                  className="w-full"
                >
                  {loading ? 'Updating...' : success ? '✅ Updated!' : 'Update Username'}
                </Button>
              </form>

              {/* Divider */}
              <div className="h-px bg-border my-6" />

              {/* Install App Section */}
              <h3 className="text-lg font-semibold mb-4">
                Progressive Web App
              </h3>
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      Install as App
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {isInstallable 
                        ? /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)
                          ? "Install ClaudeChat as an app on your iOS device using Safari's Share menu"
                          : "Install ClaudeChat on your device for a native app experience"
                        : (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true
                          ? "App is already installed"
                          : "Install option will appear when available."
                      }
                    </p>
                  </div>
                  {isInstallable && (
                    <Button
                      onClick={handleInstallApp}
                      className="ml-4"
                    >
                      Install App
                    </Button>
                  )}
                </div>
              </Card>

              {/* Divider */}
              <div className="h-px bg-border my-6" />

              {/* Account Information */}
              <h3 className="text-lg font-semibold mb-4">
                Account Information
              </h3>
              <div className="space-y-4">
                <Card className="p-4">
                  <p className="font-medium mb-1">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </Card>
                <Card className="p-4">
                  <p className="font-medium mb-1">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </Card>
                {userProfile && (
                  <Card className="p-4">
                    <p className="font-medium mb-1">Current Username</p>
                    <p className="text-sm text-muted-foreground">{userProfile.username}</p>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}