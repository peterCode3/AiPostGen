# Cloudinary Setup Guide for Vercel Deployment

## Why Cloudinary?

Vercel's file system is **read-only**, so you cannot save files directly to the server. Cloudinary provides free cloud storage for images.

## Step 1: Create Cloudinary Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account (no credit card required)
3. Free tier includes:
   - 25 GB storage
   - 25 GB bandwidth/month
   - Perfect for most projects!

## Step 2: Get Your Credentials

After signing up, go to your **Dashboard**:

1. You'll see your **Cloud Name** (e.g., `dxyz123abc`)
2. Click on **Settings** → **Access Keys**
3. Copy your:
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

## Step 3: Add to Vercel

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add these three variables:

   | Name | Value |
   |------|-------|
   | `CLOUDINARY_CLOUD_NAME` | Your Cloud Name |
   | `CLOUDINARY_API_KEY` | Your API Key |
   | `CLOUDINARY_API_SECRET` | Your API Secret |

4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**

## Step 4: Redeploy

1. Go to **Deployments** tab
2. Click **Redeploy** on your latest deployment
3. Wait for deployment to complete

## That's It! 🎉

After redeploying, image uploads will work perfectly on Vercel using Cloudinary.

## Local Development

- **No Cloudinary needed** for local development
- Images will save to `public/uploads/` folder locally
- Cloudinary is only required for production (Vercel)

## Troubleshooting

If uploads still fail:
1. ✅ Verify all 3 environment variables are set in Vercel
2. ✅ Check that variables are added to **Production** environment
3. ✅ Redeploy after adding variables
4. ✅ Check Vercel logs for any errors

