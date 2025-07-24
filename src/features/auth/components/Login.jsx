import { useState } from 'react'
import { authService } from '../services/authService'
// Import LiftKit components to replace Material UI
// These components follow Material 3 design principles with golden ratio proportions
import TextInput from '@/ui/components/text-input'
import Button from '@/ui/components/button'
import Card from '@/ui/components/card'
import Container from '@/ui/components/container'
import Text from '@/ui/components/text'

export default function Login({ onLogin }) {
  // State management for form fields and UI state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Authenticate using auth service
      const data = await authService.signIn(email, password)
      
      if (data.user) {
        onLogin(data.user)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Google OAuth login
  // This function initiates the OAuth flow with Google
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      // Start OAuth flow with Google using auth service
      await authService.signInWithGoogle()
      
      // Note: For OAuth flows, the user will be redirected to Google
      // and then back to your app. The auth state change will be handled
      // by the useEffect in App.jsx that listens to auth changes.
      
    } catch (error) {
      console.error('Google login error:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    // Container provides responsive max-width and centering
    // LiftKit utility classes work similar to Tailwind but use golden ratio scale
    <Container className="flex items-center justify-center min-h-screen p-6 bg-surface" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Card creates a Material Design elevated surface */}
      {/* 'material' prop sets the surface type following Material 3 guidelines */}
      <Card 
        material="surface-container-high" 
        className="w-full max-w-md"
        style={{ padding: '2rem' }}
      >
        {/* Text component handles typography with predefined scales */}
        {/* fontClass uses LiftKit typography: heading, title1, body, label, caption */}
        <Text 
          fontClass="heading" 
          className="text-center"
          style={{ marginBottom: '2rem' }}
        >
          Sign in to your account
        </Text>
        
        
        {/* Google OAuth Button - Place it prominently at the top */}
        {/* OAuth buttons typically appear first as they're often preferred */}
        {/* Using LiftKit Button with golden ratio spacing */}
        <div style={{ marginBottom: '1rem' }}>
          <Button
            onClick={handleGoogleLogin}
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
        <form onSubmit={handleLogin} className="flex flex-col" style={{ gap: '1rem' }}>
          {/* Error state display with semantic color tokens */}
          {error && (
            <div className="bg-error-container color-on-error-container rounded-lg" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <Text fontClass="body">{error}</Text>
            </div>
          )}
          
          {/* Email input with floating label */}
          {/* TextInput supports two label positions: "default" and "on-input" (floating) */}
          <TextInput
            name="Email Address"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            labelPosition="on-input"
            endIcon="mail"
            autoComplete="email"
            // Data attributes allow fine-grained component customization
            data-lk-text-input-state={error ? 'error' : 'default'}
          />
          
          {/* Password input with security features */}
          <TextInput
            name="Password"
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            labelPosition="on-input"
            endIcon="lock"
            autoComplete="current-password"
          />
          
          {/* Submit button with loading state */}
          {/* Button variants: "fill" (default), "outline", "text" */}
          {/* Colors follow Material 3 color roles: primary, secondary, tertiary, error */}
          <Button
            type="submit"
            label={loading ? 'Signing in...' : 'Sign in with Email'}
            variant="fill"
            color="primary"
            size="lg"
            disabled={loading}
            className="w-full"
            style={{ marginTop: '1rem' }}
            // Start/end icons integrate with Lucide React icon set
            startIcon={loading ? undefined : "log-in"}
          />
        </form>
      </Card>
    </Container>
  )
}