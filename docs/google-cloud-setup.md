# Google Cloud Speech-to-Text Setup Guide

This guide will walk you through setting up Google Cloud Speech-to-Text API for the Video Analytics feature.

## Prerequisites

- A Google Cloud account
- Basic familiarity with Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "video-analytics-app")
5. Click "Create"

## Step 2: Enable the Speech-to-Text API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Cloud Speech-to-Text API"
3. Click on "Cloud Speech-to-Text API"
4. Click "Enable"

## Step 3: Create a Service Account

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Enter a service account name (e.g., "video-transcription")
4. Add a description (optional)
5. Click "Create and Continue"

## Step 4: Grant Permissions

1. In the "Grant this service account access to project" section
2. Select the role "Cloud Speech Client" from the dropdown
3. Click "Continue"
4. Click "Done"

## Step 5: Create and Download JSON Key

1. In the "Credentials" page, find your newly created service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Choose "JSON" as the key type
6. Click "Create"
7. The JSON key file will be downloaded automatically
8. **IMPORTANT**: Keep this file secure and never commit it to version control!

## Step 6: Configure Your Application

### Option 1: Using a JSON Key File (Recommended for Development)

1. Save the downloaded JSON key file in a secure location on your server
2. Add the path to your `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

### Option 2: Using Environment Variables (Production)

For production environments, you can set up authentication using environment variables:

1. Open the JSON key file
2. Extract the `private_key`, `client_email`, and `project_id`
3. Set them as environment variables:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Step 7: Set Up Supabase Storage

### Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to "Storage" in the left sidebar
3. Click "Create a new bucket"
4. Name the bucket: `temp-videos`
5. Set the bucket to **Public** (required for processing)
6. Click "Create bucket"

### Create Folders

1. Inside the `temp-videos` bucket, create two folders:
   - `videos/` - for storing downloaded video files
   - `audio/` - for storing extracted audio files

### Configure Bucket Policies (Optional)

You can set up automatic deletion policies using Supabase Edge Functions or external cron jobs:

```sql
-- Example: List expired videos for cleanup
SELECT id, video_file_path, audio_file_path
FROM video_analytics
WHERE expires_at < NOW()
  AND (video_file_path IS NOT NULL OR audio_file_path IS NOT NULL);
```

## Step 8: Test Your Setup

To verify your setup is working:

1. Upload a test video URL through the Video Analytics interface
2. Check the processing queue for status updates
3. Monitor the console for any authentication or API errors
4. Verify that transcription completes successfully

## Troubleshooting

### Authentication Errors

If you see authentication errors:
- Verify that `GOOGLE_APPLICATION_CREDENTIALS` points to a valid JSON key file
- Check that the service account has the "Cloud Speech Client" role
- Ensure the Speech-to-Text API is enabled in your project

### API Quota Issues

If you hit quota limits:
- Go to "APIs & Services" > "Dashboard"
- Click on "Cloud Speech-to-Text API"
- Review your usage and quotas
- Request quota increases if needed

### Storage Errors

If video/audio upload fails:
- Verify the `temp-videos` bucket exists in Supabase
- Check that the bucket is set to Public
- Ensure the `videos/` and `audio/` folders exist
- Verify your Supabase service role key is correct in `.env`

## Cost Estimation

Google Cloud Speech-to-Text pricing:
- First 60 minutes per month: FREE
- After that: ~$0.024 per minute for standard models
- Enhanced models: ~$0.048 per minute

For typical usage (1-5 minute videos):
- 100 videos/month ≈ 500 minutes ≈ $10-12/month
- 500 videos/month ≈ 2,500 minutes ≈ $50-60/month

**Tip**: Set up billing alerts in Google Cloud Console to monitor your spending.

## Security Best Practices

1. **Never commit credentials**: Add your JSON key file to `.gitignore`
2. **Use environment variables**: Store sensitive data in `.env` files
3. **Restrict service account permissions**: Only grant necessary roles
4. **Rotate keys regularly**: Create new service account keys periodically
5. **Monitor usage**: Set up billing alerts and usage notifications
6. **Use separate projects**: Consider separate Google Cloud projects for dev/staging/production

## Additional Resources

- [Google Cloud Speech-to-Text Documentation](https://cloud.google.com/speech-to-text/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-using-service-accounts)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
