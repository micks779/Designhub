# Supabase Storage Buckets Setup Guide

## Step-by-Step Instructions

### 1. Navigate to Storage
1. Open your Supabase project dashboard
2. Click on **"Storage"** in the left sidebar (folder icon)

### 2. Create `moodboard-images` Bucket
1. Click the **"New bucket"** button (top right)
2. Fill in the form:
   - **Name**: `moodboard-images` (must be exactly this)
   - **Public bucket**: Toggle **ON** (important!)
   - **File size limit**: Leave default or set to 50MB
   - **Allowed MIME types**: Leave empty (allows all image types)
3. Click **"Create bucket"**

### 3. Create `voice-notes` Bucket
1. Click **"New bucket"** again
2. Fill in the form:
   - **Name**: `voice-notes` (must be exactly this)
   - **Public bucket**: Toggle **ON** (important!)
   - **File size limit**: Leave default or set to 10MB
   - **Allowed MIME types**: Leave empty or add `audio/webm`
3. Click **"Create bucket"**

## Why Public Buckets?

The buckets need to be **public** so that:
- Images can be displayed directly in the browser
- Voice notes can be played directly in the audio player
- No authentication required for viewing (suitable for team collaboration)

## Verify Setup

After creating both buckets, you should see:
- ✅ `moodboard-images` (public)
- ✅ `voice-notes` (public)

## Storage Policies (Optional)

By default, public buckets allow anyone to read files. If you want to restrict uploads:

1. Go to **Storage** → **Policies**
2. Select your bucket
3. Create a policy for INSERT operations (if needed)

For now, the default public settings work fine for team collaboration.

## Troubleshooting

**Bucket not showing up?**
- Refresh the page
- Check the bucket name matches exactly (case-sensitive)

**Can't upload files?**
- Ensure bucket is set to **Public**
- Check file size limits
- Verify bucket name in code matches exactly

**Images not displaying?**
- Check bucket is public
- Verify the URL format in browser console
- Check CORS settings (should be enabled by default)

## Next Steps

Once buckets are created:
1. Test image upload in the app
2. Test voice note recording
3. Verify files appear in Supabase Storage dashboard

