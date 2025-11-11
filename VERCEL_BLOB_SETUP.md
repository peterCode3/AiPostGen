# Vercel Blob Storage Setup Guide

## Problem
Vercel par file system **read-only** hai, isliye direct file write nahi kar sakte. Isliye Vercel Blob Storage use karna padta hai.

## Solution: Vercel Blob Storage

Vercel Blob Storage Vercel ka apna service hai jo **free tier** mein available hai.

## Step 1: Vercel Dashboard mein Setup

1. Vercel Dashboard mein apne project par jao
2. **Settings** → **Storage** tab par jao
3. **Create Database** ya **Create Blob Store** button click karo
4. **Blob** select karo
5. Store ka naam dein (e.g., `aipostgen-images`)
6. **Create** click karo

## Step 2: Environment Variable Add Karein

1. Vercel Dashboard mein **Settings** → **Environment Variables** par jao
2. **BLOB_READ_WRITE_TOKEN** add karo:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Apne Blob Store ka token (automatically set ho jata hai)
   - **Environment**: Production, Preview, Development (sab select karo)
3. **Save** click karo

## Step 3: Redeploy

1. **Deployments** tab par jao
2. Latest deployment par **Redeploy** click karo
3. Wait karo deployment complete hone tak

## That's It! 🎉

Ab image uploads Vercel Blob Storage mein save hongi automatically.

## Free Tier Limits

- **Storage**: 1 GB free
- **Bandwidth**: 1 GB/month free
- Perfect for most projects!

## Local Development

- Local development mein **no setup needed**
- Images `public/uploads/` folder mein save hongi locally
- Vercel Blob Storage sirf production (Vercel) par use hoga

## Troubleshooting

Agar uploads fail ho rahi hain:
1. ✅ Check karo ke Blob Store create ho gaya hai
2. ✅ Verify karo ke `BLOB_READ_WRITE_TOKEN` environment variable set hai
3. ✅ Redeploy karo after adding environment variable
4. ✅ Vercel logs check karo for any errors

