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

// Using LiftKit components exclusively for consistent design system

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
    // Main chat container with full viewport height
    <div className="chat-container bg-surface">
      {/* Navigation Bar using LiftKit Card with primary container theming */}
      <Card 
        material="primary-container" 
        className="rounded-none shadow-md"
      >
        <Row className="p-0 items-center justify-between">
          {/* Hamburger menu button - upper left */}
          <IconButton
            icon="align-justify"
            onClick={() => setShowUserMenu(!showUserMenu)}
            color="on-primary-container"
            variant="text"
            size="md"
            aria-label="Open navigation menu"
            className="text-white"
          />
          

          
          {/* Username display - upper right */}
          <Text 
            fontClass="caption" 
            color="on-primary-container" 
            className="opacity-70"
          >
            {userProfile?.username || user.email.split('@')[0]}
          </Text>
        </Row>
      </Card>

      {/* Side Navigation Overlay */}
      {showUserMenu && (
        <>
          {/* Dark overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowUserMenu(false)}
          />
          
          {/* Sliding side navigation */}
          <div className={`fixed top-0 left-0 h-screen w-80 bg-surface-container-highest shadow-2xl z-50 transform transition-transform duration-300 ${showUserMenu ? 'translate-x-0' : '-translate-x-full'}`}>
            <Card material="surface-container-highest" className="h-full rounded-none p-0">
              {/* Navigation header */}
              <div className="p-6 border-b border-outline-variant">
                <Row className="items-center justify-between mb-4">
                  <Text fontClass="title1" color="on-surface" className="font-semibold">
                    Menu
                  </Text>
                  <IconButton
                    icon="x"
                    onClick={() => setShowUserMenu(false)}
                    color="on-surface"
                    variant="text"
                    size="sm"
                    aria-label="Close menu"
                  />
                </Row>
                
                {/* User info in sidebar */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <Text fontClass="body" color="on-primary" className="font-semibold">
                      {(userProfile?.username || user.email)[0].toUpperCase()}
                    </Text>
                  </div>
                  <div>
                    <Text fontClass="body" color="on-surface" className="font-semibold">
                      {userProfile?.username || user.email.split('@')[0]}
                    </Text>
                    <Text fontClass="caption" color="on-surface-variant">
                      {user.email}
                    </Text>
                  </div>
                </div>
              </div>
              
                             {/* Navigation items */}
               <div className="p-4">
                 <div className="flex flex-col gap-2">
                   <Button
                     variant="text"
                     color="on-surface"
                     label="Settings"
                     startIcon="settings"
                     onClick={() => {
                       handleSettingsClick();
                       setShowUserMenu(false);
                     }}
                     className="w-full justify-start text-left text-white"
                   />
                   <Button
                     variant="text"
                     color="on-surface"
                     label="Logout"
                     startIcon="log-out"
                     onClick={() => {
                       handleLogout();
                       setShowUserMenu(false);
                     }}
                     className="w-full justify-start text-left text-white"
                   />
                 </div>
               </div>
            </Card>
          </div>
        </>
      )}

      {/* Chat Messages Area */}
      <div className="chat-messages p-4 bg-surface">
        <Container className="max-w-4xl mx-auto px-6">
          {messages.map((message) => {
            const isOwnMessage = message.user_id === user.id
            return (
              <div
                key={message.id}
                className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {/* Message bubble using LiftKit Card with proper material design */}
                <Card
                  material={isOwnMessage ? "primary-container" : "surface-container-high"}
                  className="max-w-[70%] p-2 mx-2"
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
                    color={isOwnMessage ? "on-primary-container" : "on-surface"}
                  >
                    {message.content}
                  </Text>
                  
                  {/* Timestamp */}
                  <Text 
                    fontClass="caption"
                    color={isOwnMessage ? "on-primary-container" : "on-surface-variant"}
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
        className="chat-input rounded-none shadow-lg"
      >
        <Container className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="p-2">
            <Row className="gap-2 items-center">
              {/* Message input field using LiftKit TextInput */}
              <div className="flex-1">
                <TextInput
                  name="Message"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  labelPosition="hidden"
                  endIcon="message-circle"
                  disabled={loading}
                />
              </div>
              
              {/* Send button using LiftKit Button - icon only for mobile */}
              <Button
                type="submit"
                variant="fill"
                color="primary"
                label=""
                startIcon={loading ? "loader-2" : "send"}
                disabled={loading || !newMessage.trim()}
                size="lg"
                className="min-w-[48px] h-[48px] rounded-full"
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
    console.log('Form submitted with username:', newUsername)
    
    if (!newUsername.trim() || newUsername === userProfile?.username) {
      console.log('Form validation failed:', { newUsername: newUsername.trim(), currentUsername: userProfile?.username })
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Attempting to update username for user:', user.id)
      
      // First try to update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: newUsername.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()

      let data, error;
      
      // If update failed because no row exists, insert new profile
      if (updateError || !updateData || updateData.length === 0) {
        console.log('No existing profile found, creating new one...')
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            username: newUsername.trim(),
            updated_at: new Date().toISOString()
          })
          .select()
        
        data = insertData;
        error = insertError;
      } else {
        data = updateData;
        error = updateError;
      }

      console.log('Supabase response:', { data, error })

      if (error) throw error

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
              <Card 
                material="error-container" 
                className="p-4 mb-4 border-l-4 border-l-red-500"
              >
                <Row className="items-center gap-3">
                  <span className="text-xl text-red-600">❌</span>
                  <Text fontClass="body" color="on-error-container" className="font-semibold">
                    {error}
                  </Text>
                </Row>
              </Card>
            )}
            
            {success && (
              <Card 
                material="success-container" 
                className="p-4 mb-4 border-l-4 border-l-green-500"
              >
                <Row className="items-center gap-3">
                  <span className="text-xl text-green-600">✅</span>
                  <Text fontClass="body" color="on-success-container" className="font-semibold">
                    {success}
                  </Text>
                </Row>
              </Card>
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
              color={success ? "success" : "primary"}
              label={
                loading ? 'Updating...' : 
                success ? '✅ Updated!' : 
                'Update Username'
              }
              disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
              size="lg"
              className="w-full"
              onClick={handleUpdateUsername}
            />
          </form>

          {/* Divider using LiftKit styling */}
          <div className="divider my-6" />


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