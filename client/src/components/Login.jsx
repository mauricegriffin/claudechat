import { useState } from 'react'
import { supabase } from '../supabaseClient'
// Import LiftKit components to replace Material UI
// These components follow Material 3 design principles with golden ratio proportions
import TextInput from '@/components/text-input'
import Button from '@/components/button'
import Card from '@/components/card'
import Container from '@/components/container'
import Text from '@/components/text'

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
      // Authenticate with Supabase using email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

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
      // Start OAuth flow with Google
      // This will redirect the user to Google's consent screen
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to the same page after authentication
          redirectTo: `${window.location.origin}`,
          // You can pass additional data to be stored in user metadata
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
      console.error('Google login error:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    // Container provides responsive max-width and centering
    // LiftKit utility classes work similar to Tailwind but use golden ratio scale
    <Container className="flex items-center justify-center min-h-screen p-4">
      {/* Card creates a Material Design elevated surface */}
      {/* 'material' prop sets the surface type following Material 3 guidelines */}
      <Card 
        material="surface-container-high" 
        className="w-full max-w-md p-8"
      >
        {/* Text component handles typography with predefined scales */}
        {/* fontClass uses LiftKit typography: heading, title1, body, label, caption */}
        <Text 
          fontClass="heading" 
          className="text-center mb-8"
        >
          Sign in to your account
        </Text>
        
        {/* Google OAuth Button - Place it prominently at the top */}
        {/* OAuth buttons typically appear first as they're often preferred */}
        <Button
          onClick={handleGoogleLogin}
          label="Continue with Google"
          variant="outline"
          color="primary"
          size="lg"
          disabled={loading}
          className="w-full mb-6"
          // Google icon - you can use any icon from Lucide React
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
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          {/* Error state display with semantic color tokens */}
          {error && (
            <div className="bg-error-container color-on-error-container p-4 rounded-lg">
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
            className="w-full mt-4"
            // Start/end icons integrate with Lucide React icon set
            startIcon={loading ? undefined : "log-in"}
          />
        </form>
      </Card>
    </Container>
  )
}