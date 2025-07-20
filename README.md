# Real-time Chat Application

A real-time chat application built with React and Supabase, featuring instant messaging with modern UI.

## Project Structure

```
/claudechat
├── /client          # React Frontend (Vite + Material-UI)
├── schema.sql       # Supabase database schema
└── README.md        # This file
```

## Features

- **Real-time messaging** using Supabase Realtime subscriptions
- **User authentication** with Supabase Auth
- **Modern UI** built with Material-UI
- **Responsive design** that works on desktop and mobile
- **Protected routes** - only authenticated users can access the chat

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account and project

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project dashboard
3. Navigate to the SQL Editor and run the contents of `schema.sql`
4. Enable Realtime for the `messages` table:
   - Go to Database > Replication
   - Enable real-time for the `messages` table

### 2. Environment Variables

Create a `.env` file in the `/client` directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation

```bash
cd client
npm install
```

### 4. Running the Application

```bash
cd client
npm run dev
```
The application will start on `http://localhost:5173`

## Database Schema

The application uses a single `messages` table with the following structure:

```sql
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);
```

## Key Features

### Authentication
- Email/password signup and login
- Session persistence
- Automatic logout on session expiry

### Real-time Messaging
- Instant message delivery using Supabase Realtime
- Message history persistence
- User-specific message styling

### Security
- Row Level Security (RLS) enabled
- Users can only read all messages and insert their own
- Protected routes for authenticated users only

## Technology Stack

- **Frontend**: React 18, Vite, Material-UI
- **Database & Real-time**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Styling**: Material-UI

## Development

The application connects directly to Supabase from the client, leveraging Supabase's built-in authentication, real-time subscriptions, and Row Level Security for a secure, serverless architecture.

## Troubleshooting

1. **Real-time not working**: Make sure Realtime is enabled for the `messages` table in your Supabase dashboard
2. **Authentication errors**: Verify your Supabase URL and anon key are correct
3. **CORS errors**: The server includes CORS middleware, but ensure your Supabase project settings allow your domain

## Next Steps

Potential enhancements for this application:
- User profiles and avatars
- Message reactions and emojis
- File/image sharing
- Typing indicators
- Message search functionality
- Multiple chat rooms
- Push notifications 