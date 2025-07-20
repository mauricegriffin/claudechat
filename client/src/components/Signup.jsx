import { useState } from 'react'
import { supabase } from '../supabaseClient'
// Import LiftKit components - these replace Material UI components
// LiftKit uses golden ratio proportions and Material 3 design principles
import TextInput from '@/components/text-input'
import Button from '@/components/button'
import Card from '@/components/card'
import Container from '@/components/container'
import Text from '@/components/text'

export default function Signup({ onSignup }) {
  // Form state management - each field has its own state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Sign up with Supabase Auth
      // Username is passed in the metadata which triggers our database function
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) throw error

      if (data.user) {
        onSignup(data.user)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Google OAuth signup
  const handleGoogleSignup = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) throw error
      
      // Note: For OAuth flows, the user will be redirected to Google
      // and then back to your app. The auth state change will be handled
      // by the useEffect in App.jsx that listens to auth changes.
      
    } catch (error) {
      console.error('Google signup error:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    // Container provides responsive max-width and centering
    <Container className="flex items-center justify-center min-h-screen p-4">
      {/* Card creates a Material Design elevated surface */}
      <Card 
        material="surface-container-high" 
        className="w-full max-w-md p-8"
      >
        {/* Typography is handled by the Text component */}
        {/* fontClass prop controls the typography scale (heading, title1, body, label, etc.) */}
        <Text 
          fontClass="heading" 
          className="text-center mb-8"
        >
          Create your account
        </Text>
        
        {/* Google OAuth Button - Place it prominently at the top */}
        <Button
          onClick={handleGoogleSignup}
          label="Continue with Google"
          variant="outline"
          color="primary"
          size="lg"
          disabled={loading}
          className="w-full mb-6"
          startIcon="chrome"
        />

        {/* Divider with "or" text */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-outline"></div>
          <Text fontClass="body" color="on-surface-variant" className="px-4">
            or
          </Text>
          <div className="flex-1 border-t border-outline"></div>
        </div>
        
        {/* Form with LiftKit spacing utilities */}
        <form onSubmit={handleSignup} className="flex flex-col gap-6">
          {/* Error message display */}
          {error && (
            <div className="bg-error-container color-on-error-container p-4 rounded-lg">
              <Text fontClass="body">{error}</Text>
            </div>
          )}
          
          {/* Username input field */}
          {/* TextInput component from LiftKit with Material Design styling */}
          {/* labelPosition can be "default" (above) or "on-input" (floating) */}
          <TextInput
            name="Username"
            placeholder="Choose a unique username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            labelPosition="on-input"
            helpText="This will be your display name"
            endIcon="user"
            // LiftKit uses data attributes for component configuration
            data-lk-text-input-state={error ? 'error' : 'default'}
          />
          
          {/* Email input field */}
          <TextInput
            name="Email Address"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            labelPosition="on-input"
            endIcon="mail"
            autoComplete="email"
          />
          
          {/* Password input field */}
          <TextInput
            name="Password"
            placeholder="Create a strong password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            labelPosition="on-input"
            endIcon="lock"
            autoComplete="new-password"
            helpText="Must be at least 6 characters"
          />
          
          {/* Submit button */}
          {/* Button component with different variants: fill, outline, text */}
          {/* Size options: sm, md, lg */}
          <Button
            type="submit"
            label={loading ? 'Creating account...' : 'Create account with Email'}
            variant="fill"
            color="primary"
            size="lg"
            disabled={loading}
            className="w-full mt-4"
            // Icons can be added to buttons
            startIcon={loading ? undefined : "user-plus"}
          />
        </form>
      </Card>
    </Container>
  )
}