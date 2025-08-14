import { useState } from 'react'
import { authService } from '../services/authService'
// Material UI imports
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  Fade,
  Grow
} from '@mui/material'
import {
  Google as GoogleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon
} from '@mui/icons-material'

export default function Login({ onLogin, isDarkMode, onThemeToggle }) {
  // State management for form fields and UI state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validateForm = () => {
    let isValid = true
    setEmailError('')
    setPasswordError('')
    setError('')

    if (!email) {
      setEmailError('Email is required')
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      isValid = false
    }

    return isValid
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError('')

    try {
      // Authenticate using auth service
      const data = await authService.signIn(email, password)
      
      if (data.user) {
        onLogin(data.user)
      }
    } catch (error) {
      setError(error.message || 'An error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  // Handle Google OAuth login
  // This function initiates the OAuth flow with Google
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    setEmailError('')
    setPasswordError('')

    try {
      // Start OAuth flow with Google using auth service
      await authService.signInWithGoogle()
      
      // Note: For OAuth flows, the user will be redirected to Google
      // and then back to your app. The auth state change will be handled
      // by the useEffect in App.jsx that listens to auth changes.
      
    } catch (error) {
      console.error('Google login error:', error)
      setError(error.message || 'Google sign in failed')
      setLoading(false)
    }
  }

  return (
    <Container 
      component="main" 
      maxWidth="xs" 
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 3
      }}
    >
      <Grow in timeout={800}>
        <Card 
          elevation={3}
          sx={{
            width: '100%',
            p: { xs: 2, sm: 3 },
            borderRadius: 3
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}
              >
                Welcome Back
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                Sign in to continue to your account
              </Typography>
            </Box>

            {/* Google OAuth Button */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleGoogleLogin}
              disabled={loading}
              startIcon={<GoogleIcon />}
              sx={{
                mb: 3,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                border: '2px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
            >
              Continue with Google
            </Button>

            {/* Divider */}
            <Box sx={{ mb: 3 }}>
              <Divider>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ px: 2, fontSize: '0.8rem' }}
                >
                  or
                </Typography>
              </Divider>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2,
                    '& .MuiAlert-message': {
                      fontSize: '0.875rem'
                    }
                  }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleLogin}>
              {/* Email Field */}
              <TextField
                fullWidth
                id="email"
                name="email"
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                error={!!emailError}
                helperText={emailError}
                autoComplete="email"
                autoFocus
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color={emailError ? 'error' : 'action'} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              {/* Password Field */}
              <TextField
                fullWidth
                id="password"
                name="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                error={!!passwordError}
                helperText={passwordError}
                autoComplete="current-password"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color={passwordError ? 'error' : 'action'} />
                    </InputAdornment>
                  )
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4
                  },
                  '&:disabled': {
                    backgroundColor: 'action.disabledBackground'
                  }
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grow>
    </Container>
  )
}