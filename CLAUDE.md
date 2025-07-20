# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based chat application built with Vite that integrates with Supabase for authentication and data storage. The app uses LiftKit UI components (a Material Design 3 system) and is deployed on Netlify as a Progressive Web App (PWA).

## Essential Commands

```bash
# Development
npm run dev          # Start development server with HMR

# Build & Production
npm run build        # Build for production
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint

# Component Management
npm run add          # Add LiftKit components
```

## Architecture & Key Components

### Tech Stack
- **Frontend**: React 19 + Vite
- **UI Library**: LiftKit (Material Design 3 components)
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify
- **PWA**: Service Worker + Web App Manifest

### Project Structure
```
src/
├── App.jsx                 # Main app component with auth state management
├── supabaseClient.js      # Supabase client configuration
├── components/
│   ├── Chat.jsx           # Main chat interface
│   ├── Login.jsx          # Login form
│   ├── Signup.jsx         # Signup form
│   ├── UpdateNotification.jsx  # PWA update prompts
│   └── [liftkit components]/   # UI component library
└── lib/                   # Utilities and CSS modules
```

### Key Architectural Patterns

1. **Authentication Flow**: 
   - App.jsx manages auth state globally
   - Uses Supabase auth state subscription for real-time updates
   - Conditional rendering based on user authentication status

2. **Component System**:
   - LiftKit components are imported from `@/components/`
   - Uses Material Design 3 color roles and typography scales
   - Theme provider wraps the entire app for consistent styling

3. **Environment Configuration**:
   - Vite environment variables for Supabase credentials
   - Required: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. **Database Schema**:
   - Multiple SQL files indicate PostgreSQL schema with RLS
   - Authentication integrated with Supabase Auth system

5. **Build Configuration**:
   - Vite config uses @ alias for src directory imports
   - Netlify deployment with SPA redirects
   - PWA support with service worker and manifest

## Development Notes

- The app is currently under active development (modified files: index.html, Chat.jsx)
- Uses React Router for client-side routing
- Implements hot module replacement for fast development
- Service worker enables offline functionality and app updates