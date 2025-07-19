# Guestbook App Setup Guide

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: OpenAI API key is configured in the Supabase Edge Function environment, not in the client-side code for security.

## Supabase Database Schema

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Create guestbook_entries table
CREATE TABLE guestbook_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_guestbook_entries_created_at ON guestbook_entries(created_at DESC);
CREATE INDEX idx_guestbook_entries_ip_anonymous ON guestbook_entries(ip_address, is_anonymous, created_at);

-- Enable Row Level Security
ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read all entries
CREATE POLICY "Allow public read access" ON guestbook_entries
FOR SELECT USING (true);

-- Allow authenticated users to insert entries
CREATE POLICY "Allow authenticated insert" ON guestbook_entries
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow anonymous users to insert entries (they won't have user_id)
CREATE POLICY "Allow anonymous insert" ON guestbook_entries
FOR INSERT WITH CHECK (auth.uid() IS NULL AND user_id IS NULL AND is_anonymous = true);
```

## Authentication Setup

1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Enable GitHub provider
4. Add your GitHub OAuth App credentials:
   - Client ID
   - Client Secret
5. Set the redirect URL to your app's URL (e.g., `http://localhost:5173` for development)

## GitHub OAuth App Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Application name: Your app name
   - Homepage URL: Your app's URL
   - Authorization callback URL: `https://your-supabase-url.supabase.co/auth/v1/callback`

## Supabase Edge Function Setup

1. **Deploy the Edge Function**:

   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link your project
   supabase link --project-ref YOUR_PROJECT_REF

   # Deploy the function
   supabase functions deploy moderate-and-insert
   ```

2. **Set Environment Variables for Edge Function**:
   ```bash
   # Set OpenAI API key for the edge function
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```

## OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys
3. Create a new secret key
4. Set it as a Supabase secret (not in client-side .env file)

## Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Features

- ✅ Real-time updates using Supabase realtime
- ✅ GitHub OAuth authentication
- ✅ Anonymous posting with rate limiting (5 posts per hour per IP)
- ✅ Content moderation using OpenAI
- ✅ Mobile responsive design
- ✅ Beautiful UI with Tailwind CSS and shadcn components

## Rate Limiting

Anonymous users are limited to 5 posts per hour per IP address. Authenticated users have no such restrictions.

## Content Moderation

All messages are checked using OpenAI's moderation API before being stored in the database. Inappropriate content will be rejected with a specific reason.

## Real-time Updates

The app uses Supabase's real-time functionality to automatically update the guestbook when new entries are added, providing a seamless experience for all users.
