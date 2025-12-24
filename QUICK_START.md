# Quick Start Guide - Fix Blank Page Issue

## The Problem
The app shows a blank page because Supabase environment variables are missing.

## Quick Fix (2 Options)

### Option 1: Use Local Storage Only (No Supabase)
The app will now work without Supabase! Just refresh the page.

**Login credentials:**
- Username: Any name
- Password: `team`

### Option 2: Set Up Supabase (For Real-time Collaboration)

1. **Create `.env` file** in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   GEMINI_API_KEY=your-gemini-key-here
   ```

2. **Get your Supabase credentials:**
   - Go to your Supabase project dashboard
   - Settings → API
   - Copy "Project URL" → `VITE_SUPABASE_URL`
   - Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

3. **Restart the dev server:**
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again

4. **The app should now load!**

## What Changed
- ✅ App no longer crashes when Supabase is missing
- ✅ Falls back to local storage mode
- ✅ Shows helpful status indicators
- ✅ Works offline by default

## Testing
1. Open `http://localhost:3000` (or 3001)
2. You should see the login screen
3. Login with password `team`
4. App should load!

## Next Steps
Once the app loads, you can:
- Test all features in local mode
- Set up Supabase later for real-time sync
- Deploy to Vercel when ready

