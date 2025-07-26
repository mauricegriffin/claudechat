import { useState } from 'react'
import { authService } from '../services/authService'
// Import shadcn/ui components
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Globe, Mail, Lock, User, UserPlus } from 'lucide-react'

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
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Create your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        
          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleSignup}
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
        
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Error message display */}
            {error && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
          
            {/* Username input field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a unique username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">This will be your display name</p>
            </div>
          
            {/* Email input field */}
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
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>
          
            {/* Password input field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
            </div>
          
            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                'Creating account...'
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create account with Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}