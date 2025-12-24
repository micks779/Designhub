# DesignBudget Hub - Production Setup Guide

## Phase 2: Supabase Integration & Deployment

This guide will help you set up the DesignBudget Hub for production with Supabase and Vercel.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. A GitHub repository for your project
4. A Gemini API key (from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Step 1: Supabase Setup

### 1.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from Settings > API

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL script to create all tables and policies

### 1.3 Create Storage Buckets

1. Go to Storage in your Supabase dashboard
2. Create two public buckets:
   - `moodboard-images` (public)
   - `voice-notes` (public)

### 1.4 Set Up Row Level Security (RLS)

The schema already includes RLS policies that allow all operations. For production, you may want to restrict access based on project_id or implement user authentication.

## Step 2: Environment Variables

Create a `.env` file in your project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

**Important:** Never commit your `.env` file to version control!

## Step 3: Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The app should now connect to Supabase and sync data in real-time!

## Step 4: Vercel Deployment

### 4.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository

### 4.2 Configure Environment Variables

In the Vercel project settings, add these environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- `GEMINI_API_KEY` - Your Gemini API key

### 4.3 Deploy

1. Vercel will automatically detect Vite and configure the build
2. Click "Deploy"
3. Your app will be live at `your-project.vercel.app`

## Step 5: Team Passkey Setup

By default, the team passkey is set to `"team"`. To change it:

1. Go to Supabase SQL Editor
2. Run:
   ```sql
   UPDATE team_passkeys SET is_active = false WHERE passkey = 'team';
   INSERT INTO team_passkeys (passkey) VALUES ('your-new-passkey');
   ```

## Features Implemented

✅ **Real-time Collaboration**: Changes sync instantly across all team members  
✅ **Offline Resilience**: Works offline and syncs when connection is restored  
✅ **Cloud Storage**: Images and voice notes stored in Supabase Storage  
✅ **Sync Indicators**: Visual feedback for sync status  
✅ **Toast Notifications**: Success/error notifications for user actions  
✅ **Enhanced Authentication**: Team passkey verified against Supabase database  

## Troubleshooting

### Connection Issues

- Verify your Supabase URL and anon key are correct
- Check that RLS policies are set up correctly
- Ensure storage buckets are created and public

### Real-time Not Working

- Check that Supabase Realtime is enabled for your tables
- Verify you're using the correct project_id filter

### Image Upload Fails

- Ensure the `moodboard-images` bucket exists and is public
- Check file size limits (Supabase default is 50MB)

### Voice Notes Not Uploading

- Ensure the `voice-notes` bucket exists and is public
- Check browser permissions for microphone access

## Next Steps

- Implement user authentication (Supabase Auth)
- Add project-specific access control
- Set up image optimization with Supabase transformations
- Configure custom domain in Vercel
- Set up monitoring and error tracking

## Support

For issues or questions, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev)

