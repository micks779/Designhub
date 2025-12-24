# Secure Gemini API Setup with Supabase Edge Functions

## 🔒 Why Use Edge Functions?

By using a Supabase Edge Function as a proxy, your Gemini API key stays **completely hidden** on the server and is never exposed to the browser.

## 📋 Setup Steps

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
supabase link --project-ref zldrxygjegdbyaotwzpy
```

### Step 4: Set Gemini API Key as Secret

```bash
supabase secrets set GEMINI_API_KEY=AIzaSyCRaqjGb44N-3xGVDHdA4PuCe6-DvMGo-A
```

### Step 5: Deploy the Edge Function

```bash
supabase functions deploy gemini-proxy
```

## 🧪 Test the Function

After deployment, test it:

```bash
supabase functions invoke gemini-proxy --body '{"prompt":"Hello, how are you?"}'
```

## ✅ Verification

1. **Check Function is Deployed:**
   - Go to Supabase Dashboard → Edge Functions
   - You should see `gemini-proxy` listed

2. **Test in App:**
   - Open your app
   - Go to Dashboard
   - Click "Run Performance Audit"
   - Should work without exposing the API key!

## 🔧 How It Works

1. **Client** calls `getProjectInsights()` in `geminiService.ts`
2. **Service** calls Supabase Edge Function `gemini-proxy`
3. **Edge Function** (server-side) calls Gemini API with the secret key
4. **Response** is returned to the client
5. **API Key** never leaves the server! ✅

## 🚀 Vercel Deployment

After setting up the Edge Function:

1. **Remove `GEMINI_API_KEY` from Vercel environment variables** (it's now in Supabase secrets)
2. **Keep only:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy - the Gemini key is now completely hidden!

## 📝 Local Development

For local development without Supabase:
- The code will fallback to direct API call if Edge Function isn't available
- You can still use `GEMINI_API_KEY` in `.env` for local testing
- But for production, always use the Edge Function!

## 🎯 Benefits

✅ **API Key Hidden** - Never exposed in browser  
✅ **Secure** - Stored in Supabase secrets  
✅ **Scalable** - Edge Functions are fast and reliable  
✅ **Free** - Supabase Edge Functions have generous free tier  

Your Gemini API key is now completely secure! 🔒

