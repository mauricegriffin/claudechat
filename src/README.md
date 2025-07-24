# ClaudeChat Source Code Structure

## Overview
This React application follows a **feature-based architecture** with **atomic design principles** for the UI components. The structure separates business logic from UI components and uses service layers for external API calls.

## Directory Structure

```
src/
├── features/         # Feature-based modules (business logic)
│   ├── auth/        # Authentication feature
│   │   ├── components/   # Auth-specific React components
│   │   │   ├── Login.jsx     # Login form component
│   │   │   └── Signup.jsx    # Signup form component
│   │   └── services/     # Auth business logic
│   │       └── authService.js    # Supabase auth & profile operations
│   │
│   └── chat/        # Chat feature
│       ├── components/   # Chat-specific React components
│       │   └── Chat.jsx      # Main chat interface
│       └── services/     # Chat business logic
│           └── messageService.js # Message CRUD & real-time subscriptions
│
├── ui/              # UI Component Library (LiftKit)
│   └── components/  # Reusable UI components
│       ├── button/          # Button component
│       ├── card/            # Card component
│       ├── text/            # Text component
│       ├── text-input/      # Input field component
│       ├── theme/           # Theme provider
│       ├── UpdateNotification.jsx  # PWA update notification
│       └── InstallPrompt.jsx       # PWA install prompt
│
├── lib/             # Utility functions
│   └── colorUtils.ts    # Color manipulation utilities
│
├── App.jsx          # Root application component
├── main.jsx         # Application entry point
├── index.css        # Global styles
└── supabaseClient.js # Supabase client configuration
```

## Architecture Patterns

### 1. Feature-Based Organization
Each feature (auth, chat) is self-contained with its own:
- **Components**: React components specific to that feature
- **Services**: Business logic and API calls
- **Hooks** (future): Custom React hooks for the feature
- **Types** (future): TypeScript types for the feature

### 2. Service Layer Pattern
Services abstract external API calls and business logic:
- **authService.js**: Handles authentication, user profiles, and session management
- **messageService.js**: Manages messages, real-time subscriptions

### 3. UI Component Library
The `ui/components` directory contains the LiftKit design system:
- Atomic design components (buttons, cards, inputs)
- Consistent Material 3 design language
- Reusable across all features

## Import Paths

The project uses path aliases configured in `vite.config.js`:
- `@/` maps to the `src/` directory

Examples:
```javascript
// Importing from features
import { authService } from '@/features/auth/services/authService'

// Importing UI components
import Button from '@/ui/components/button'

// Importing from root
import { supabase } from '@/supabaseClient'
```

## Service Layer Documentation

### authService.js
Handles all authentication-related operations:
- `signUp(email, password)` - Create new user account
- `signIn(email, password)` - Sign in with email/password
- `signInWithGoogle()` - OAuth login with Google
- `signOut()` - Sign out current user
- `getSession()` - Get current session
- `getUser()` - Get current user
- `getUserProfile(userId)` - Fetch user profile data
- `updateUserProfile(userId, username)` - Update/create user profile
- `onAuthStateChange(callback)` - Subscribe to auth state changes

### messageService.js
Manages chat messages and real-time updates:
- `fetchMessages()` - Get all messages
- `fetchMessagesWithUsername()` - Get messages with user info
- `fetchNewMessage(messageId)` - Get single message with user info
- `sendMessage(content, userId)` - Send new message
- `deleteAllMessages()` - Clear all messages
- `subscribeToMessages(callback)` - Real-time message subscription

## Component Communication

1. **App.jsx** manages global auth state
2. **Features** use service layers for API calls
3. **UI components** are pure presentational components
4. **Services** handle all Supabase interactions

## Benefits of This Structure

1. **Maintainability**: Clear separation of concerns
2. **Scalability**: Easy to add new features
3. **Testability**: Services can be mocked for testing
4. **Reusability**: UI components work across features
5. **Type Safety**: Ready for TypeScript migration

## Future Improvements

1. Add custom hooks directory for each feature
2. Implement TypeScript throughout
3. Add unit tests for services
4. Create shared utilities directory
5. Add error boundary components