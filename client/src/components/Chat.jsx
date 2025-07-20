import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

// Import LiftKit components where available
// LiftKit provides Material 3 design components with golden ratio proportions
import Container from '@/components/container'
import Card from '@/components/card'
import Button from '@/components/button'
import IconButton from '@/components/icon-button'
import TextInput from '@/components/text-input'
import Text from '@/components/text'
import Row from '@/components/row'

// Import minimal Material UI components only where absolutely necessary
import { 
  Divider
} from '@mui/material'

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

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile()
  }, [user])

  // Fetch user profile from database
  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
      } else if (data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages()
    
    // Subscribe to real-time messages using Supabase channels
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Fetch the new message with username
          fetchNewMessage(payload.new.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Fetch a single new message with username
  const fetchNewMessage = async (messageId) => {
    try {
      const { data, error } = await supabase
        .from('messages_with_username')
        .select('*')
        .eq('id', messageId)
        .single()

      if (!error && data) {
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
      const { data, error } = await supabase
        .from('messages_with_username')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          user_id: user.id
        })

      if (error) throw error
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const handleSettingsClick = () => {
    setShowSettings(true)
    setShowUserMenu(false)
  }

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
    // Main chat container with full height using LiftKit
    <div className="flex flex-col h-screen bg-surface">
      {/* Navigation Bar using LiftKit Card for consistent theming */}
      <Card 
        material="primary" 
        className="rounded-none shadow-md"
      >
        <Row className="p-4 items-center justify-between">
          {/* App Title using LiftKit Text component */}
          <Text fontClass="title1" color="on-primary" className="flex-1">
            ClaudeChat
          </Text>
          
          {/* User info section */}
          <Row className="items-center gap-4 user-menu-container">
            {/* Non-clickable username display */}
            <Text 
              fontClass="body" 
              color="on-primary" 
              className="font-semibold"
            >
              {userProfile?.username || user.email}
            </Text>
            
            {/* Settings menu button using LiftKit IconButton for better visibility */}
            <div className="relative">
              <IconButton
                icon="user"
                onClick={() => setShowUserMenu(!showUserMenu)}
                color="on-primary"
                variant="outline"
                size="md"
                className="bg-white bg-opacity-20 border-white border-opacity-40 hover:bg-opacity-30"
                aria-label="User menu"
              />
              
              {/* Dropdown menu using LiftKit Card */}
              {showUserMenu && (
                <Card 
                  material="surface-container-highest"
                  className="absolute right-0 top-12 min-w-[200px] shadow-lg z-50 p-2"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="text"
                      color="on-surface"
                      label="Settings"
                      startIcon="settings"
                      onClick={handleSettingsClick}
                      className="w-full justify-start"
                    />
                    <div className="h-px bg-outline-variant my-1" />
                    <Button
                      variant="text"
                      color="error"
                      label="Logout"
                      startIcon="log-out"
                      onClick={handleLogout}
                      className="w-full justify-start"
                    />
                  </div>
                </Card>
              )}
            </div>
          </Row>
        </Row>
      </Card>


      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-surface">
        <Container className="max-w-4xl mx-auto">
          {messages.map((message) => {
            const isOwnMessage = message.user_id === user.id
            return (
              <div
                key={message.id}
                className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {/* Message bubble using LiftKit Card for consistent styling */}
                <Card
                  material={isOwnMessage ? "primary" : "surface-container-high"}
                  className="max-w-[70%] p-4"
                >
                  {/* Username - show for other users' messages */}
                  {!isOwnMessage && (
                    <Text 
                      fontClass="label" 
                      color={isOwnMessage ? "on-primary" : "primary"}
                      className="mb-1 font-semibold"
                    >
                      {message.username || 'Unknown User'}
                    </Text>
                  )}
                  
                  {/* Message content */}
                  <Text 
                    fontClass="body"
                    color={isOwnMessage ? "on-primary" : "on-surface"}
                  >
                    {message.content}
                  </Text>
                  
                  {/* Timestamp */}
                  <Text 
                    fontClass="caption"
                    color={isOwnMessage ? "on-primary" : "on-surface-variant"}
                    className="mt-1 opacity-70"
                  >
                    {formatTime(message.created_at)}
                  </Text>
                </Card>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </Container>
      </div>

      {/* Message Input Area using LiftKit components */}
      <Card 
        material="surface-container-high" 
        className="rounded-none shadow-lg"
      >
        <Container className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="p-4">
            <Row className="gap-2 items-end">
              {/* Message input field using LiftKit TextInput */}
              <div className="flex-1">
                <TextInput
                  name="Message"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  labelPosition="default"
                  endIcon="message-circle"
                  disabled={loading}
                  // Hide the label for a cleaner chat input
                  className="[&_label]:hidden"
                />
              </div>
              
              {/* Send button using LiftKit Button */}
              <Button
                type="submit"
                variant="fill"
                color="primary"
                label={loading ? "Sending..." : "Send"}
                startIcon={loading ? undefined : "send"}
                disabled={loading || !newMessage.trim()}
                size="lg"
              />
            </Row>
          </form>
        </Container>
      </Card>
    </div>
  )
}

// Settings Component - allows users to update their profile
// Uses a mix of Material UI and LiftKit components
function SettingsPage({ user, userProfile, onBack, onProfileUpdate }) {
  // Local state for settings form
  const [newUsername, setNewUsername] = useState(userProfile?.username || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    if (!newUsername.trim() || newUsername === userProfile?.username) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Update username in user_profiles table
      // Using upsert to handle both insert and update cases
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          username: newUsername.trim(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setSuccess('Username updated successfully!')
      onProfileUpdate() // Refresh profile data
    } catch (error) {
      console.error('Error updating username:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Settings Header using LiftKit Card */}
      <Card 
        material="primary" 
        className="rounded-none shadow-md"
      >
        <Row className="p-4 items-center">
          {/* Back button using LiftKit */}
          <Button
            variant="text"
            color="on-primary"
            label="← Back to Chat"
            onClick={onBack}
            className="mr-4"
          />
          <Text fontClass="title1" color="on-primary" className="flex-1">
            Settings
          </Text>
        </Row>
      </Card>

      {/* Settings Content */}
      <Container className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <Card material="surface-container-high" className="p-6">
          {/* Title using LiftKit Text */}
          <Text fontClass="heading" className="mb-6">
            Account Settings
          </Text>
          
          <form onSubmit={handleUpdateUsername}>
            {/* Error/Success Messages */}
            {error && (
              <div className="bg-error-container color-on-error-container p-4 rounded-lg mb-4">
                <Text fontClass="body">{error}</Text>
              </div>
            )}
            
            {success && (
              <div className="bg-tertiary-container color-on-tertiary-container p-4 rounded-lg mb-4">
                <Text fontClass="body">{success}</Text>
              </div>
            )}

            {/* Username Input using LiftKit */}
            <div className="mb-6">
              <TextInput
                name="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                helpText="Choose a unique username for your profile"
                disabled={loading}
                labelPosition="on-input"
                endIcon="user"
              />
            </div>

            {/* Update Button using LiftKit */}
            <Button
              type="submit"
              variant="fill"
              color="primary"
              label={loading ? 'Updating...' : 'Update Username'}
              disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
              size="lg"
              className="w-full"
            />
          </form>

          {/* Divider using Material UI */}
          <Divider sx={{ my: 4 }} />

          {/* Theme Customization Section */}
          <Text fontClass="title1" className="mb-4">
            Appearance
          </Text>
          
          <Card material="surface-container" className="p-4 mb-6">
            <Text fontClass="body" className="mb-4">
              Customize your color scheme and theme preferences. The floating palette button in the top-left corner gives you full control over all colors, or use the quick theme options below.
            </Text>
            
            {/* Note about ThemeController */}
            <div className="bg-tertiary-container color-on-tertiary-container p-4 rounded-lg">
              <Text fontClass="label" className="font-semibold mb-2">
                🎨 Theme Controller Available
              </Text>
              <Text fontClass="body">
                Look for the <strong>palette icon</strong> in the top-left corner of your screen to access the full theme customization panel. You can change:
              </Text>
              <ul className="mt-2 ml-4">
                <li>• Brand colors (Primary, Secondary, Tertiary)</li>
                <li>• Semantic colors (Error, Warning, Success, Info)</li>
                <li>• Layout colors (Neutral tones and backgrounds)</li>
                <li>• Light/Dark mode toggle</li>
              </ul>
            </div>
          </Card>

          {/* Divider */}
          <Divider sx={{ my: 4 }} />

          {/* Account Information using LiftKit components */}
          <Text fontClass="title1" className="mb-4">
            Account Information
          </Text>
          <div className="space-y-4">
            <div className="p-4 bg-surface-container rounded-lg">
              <Text fontClass="label" className="font-semibold mb-1">
                Email
              </Text>
              <Text fontClass="body" color="on-surface-variant">
                {user.email}
              </Text>
            </div>
            <div className="p-4 bg-surface-container rounded-lg">
              <Text fontClass="label" className="font-semibold mb-1">
                User ID
              </Text>
              <Text fontClass="body" color="on-surface-variant" className="font-mono text-sm">
                {user.id}
              </Text>
            </div>
            {userProfile && (
              <div className="p-4 bg-surface-container rounded-lg">
                <Text fontClass="label" className="font-semibold mb-1">
                  Current Username
                </Text>
                <Text fontClass="body" color="on-surface-variant">
                  {userProfile.username}
                </Text>
              </div>
            )}
          </div>
        </Card>
      </Container>
    </div>
  )
}