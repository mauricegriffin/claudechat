import { useState } from 'react'
import { authService } from '../services/authService'
// Import shadcn/ui components
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Globe, Mail, Lock, LogIn } from 'lucide-react'

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
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Sign in to your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        
          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            <Globe className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          {/* Divider with "or" text */}
          <div className="flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-muted-foreground text-sm">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>
        
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error state display */}
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
          
            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>
          
            {/* Password input */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
              </div>
            </div>
          
            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in with Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}