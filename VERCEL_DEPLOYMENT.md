# Secure Deployment to Vercel

## 🔒 Security Best Practices

Your API keys are **NEVER** exposed in the code or committed to Git. Here's how to deploy securely:

## ✅ What's Already Protected

1. **`.env` file is in `.gitignore`** - Your local `.env` file will never be committed to Git
2. **Vite only exposes `VITE_` prefixed variables** - Only variables starting with `VITE_` are included in the build
3. **Keys are server-side only** - Environment variables are injected at build time, not exposed in source code

## 🚀 Deploying to Vercel

### Step 1: Push to GitHub (without .env)

Your `.env` file is already in `.gitignore`, so it won't be committed:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:

   **For Production:**
   - `VITE_SUPABASE_URL` = `https://zldrxygjegdbyaotwzpy.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your full key)
   - ~~`GEMINI_API_KEY`~~ = **NOT NEEDED** (stored in Supabase Secrets - see `GEMINI_SETUP.md`)

4. Make sure to select **Production**, **Preview**, and **Development** environments
5. Click **Save**

### Step 3: Redeploy

After adding environment variables:
- Vercel will automatically trigger a new deployment, OR
- Go to **Deployments** tab and click **Redeploy**

## 🔍 How It Works

1. **Build Time**: Vercel injects your environment variables during the build process
2. **Client-Side**: Only `VITE_` prefixed variables are accessible in the browser
3. **Security**: Your keys are never in the source code or visible in the built files

## ⚠️ Important Notes

### Supabase Anon Key
- The `anon` key is **safe to expose** in the browser - it's designed for client-side use
- It's protected by Row Level Security (RLS) policies in your Supabase database
- This is the correct key to use for client-side applications

### Gemini API Key
- ✅ **NOW HIDDEN** - Using Supabase Edge Function as proxy
- The key is stored in Supabase Secrets (server-side only)
- Never exposed to the browser
- See `GEMINI_SETUP.md` for setup instructions

## 🛡️ Gemini API Key Security

✅ **Already Implemented!** The Gemini API key is now hidden using a Supabase Edge Function.

- The key is stored in **Supabase Secrets** (server-side only)
- Never exposed to the browser
- See `GEMINI_SETUP.md` for setup instructions

## ✅ Verification

After deployment, check:
- ✅ App loads without "Supabase not configured" message
- ✅ Real-time sync works
- ✅ No API keys visible in browser DevTools → Sources (they're bundled but not in plain text)
- ✅ `.env` file is NOT in your GitHub repository

## 📝 Quick Checklist

- [ ] `.env` is in `.gitignore` ✅
- [ ] `.env.example` created (template without real keys) ✅
- [ ] Environment variables added in Vercel dashboard
- [ ] Deployed and tested
- [ ] Verified keys are not in GitHub repository

Your setup is secure! 🎉

