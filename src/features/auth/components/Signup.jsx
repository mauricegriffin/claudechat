import { useState } from 'react'
import { authService } from '../services/authService'
// Import LiftKit components - these replace Material UI components
// LiftKit uses golden ratio proportions and Material 3 design principles
import TextInput from '@/ui/components/text-input'
import Button from '@/ui/components/button'
import Card from '@/ui/components/card'
import Container from '@/ui/components/container'
import Text from '@/ui/components/text'

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
      // Sign up using auth service with username in metadata
      const data = await authService.signUp(email, password, { username })
      
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
      await authService.signInWithGoogle()
      
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
    <Container className="flex items-center justify-center min-h-screen p-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Card creates a Material Design elevated surface */}
      <Card 
        material="surface-container-high" 
        className="w-full max-w-md"
        style={{ padding: '2rem' }}
      >
        {/* Typography is handled by the Text component */}
        {/* fontClass prop controls the typography scale (heading, title1, body, label, etc.) */}
        <Text 
          fontClass="heading" 
          className="text-center"
          style={{ marginBottom: '2rem' }}
        >
          Create your account
        </Text>
        
        {/* Google OAuth Button - Place it prominently at the top */}
        {/* Using LiftKit Button with golden ratio spacing */}
        <div style={{ marginBottom: '1rem' }}>
          <Button
            onClick={handleGoogleSignup}
            label="Continue with Google"
            variant="outline"
            color="primary"
            size="lg"
            disabled={loading}
            className="w-full"
            startIcon="globe"
          />
        </div>

        {/* Divider with "or" text */}
        <div className="flex items-center" style={{ margin: '1rem 0' }}>
          <div className="flex-1 border-t border-outline"></div>
          <Text fontClass="body" color="on-surface-variant" className="px-6">
            or
          </Text>
          <div className="flex-1 border-t border-outline"></div>
        </div>
        
        {/* Form with LiftKit spacing utilities */}
        <form onSubmit={handleSignup} className="flex flex-col" style={{ gap: '1rem' }}>
          {/* Error message display */}
          {error && (
            <div className="bg-error-container color-on-error-container rounded-lg" style={{ padding: '1rem', marginBottom: '1rem' }}>
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
            className="w-full"
            style={{ marginTop: '1rem' }}
            // Icons can be added to buttons
            startIcon={loading ? undefined : "user-plus"}
          />
        </form>
      </Card>
    </Container>
  )
}