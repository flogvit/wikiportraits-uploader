# OAuth Setup Guide

**Important**: OAuth 2.0 clients in Wikimedia have **exact callback URL matching** - no prefix matching like OAuth 1.0a consumers. This means you need a specific strategy for handling both development and production.

## Key Difference: OAuth 1.0a vs OAuth 2.0

- **OAuth 1.0a Consumer**: Supports "use as prefix" option for flexible callback URLs
- **OAuth 2.0 Client**: Requires **exact match** of callback URL - no prefix matching

## Recommended Solutions for OAuth 2.0

#### Development OAuth 2.0 Client
1. Go to [Meta-Wiki OAuth Consumer Registration](https://meta.wikimedia.org/wiki/Special:OAuthConsumerRegistration/propose/oauth2)
2. Fill in the form:
   - **Application name**: `WikiPortraits Bulk Uploader (Development)`
   - **Application description**: `Development version of WikiPortraits bulk uploader for Wikimedia Commons`
   - **OAuth "callback URL"**: `http://localhost:3010/api/auth/callback/wikimedia`
   - **Applicable grants**: Select these permissions:
     - ✅ `basic` - Basic rights
     - ✅ `highvolume` - High-volume editing
     - ✅ `editpage` - Edit existing pages
     - ✅ `createeditmovepage` - Create, edit and move pages
     - ✅ `uploadfile` - Upload new files
     - ✅ `editprotected` - Edit protected pages
3. Submit and wait for approval

#### Production OAuth 2.0 Client
1. Create another OAuth 2.0 client with:
   - **Application name**: `WikiPortraits Bulk Uploader (Production)`
   - **Application description**: `Production version of WikiPortraits bulk uploader for Wikimedia Commons`
   - **OAuth "callback URL"**: `https://your-production-domain.com/api/auth/callback/wikimedia`
   - **Applicable grants**: Same as development
2. Submit and wait for approval

### Option 2: Single OAuth 2.0 Client + ngrok (Alternative)

If you prefer one OAuth client, use ngrok for development:

1. Create one OAuth 2.0 client with production callback URL
2. For development, use ngrok to tunnel localhost through HTTPS:
   ```bash
   ngrok http 3010
   ```
3. Update your development `NEXTAUTH_URL` to use the ngrok HTTPS URL

## Step 3: Configure Environment Variables

### Development (.env.local)
```bash
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your-nextauth-secret-here

WIKIMEDIA_CLIENT_ID_DEV=your-dev-consumer-key
WIKIMEDIA_CLIENT_SECRET_DEV=your-dev-consumer-secret
```

### Production
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-here

WIKIMEDIA_CLIENT_ID_PROD=your-prod-consumer-key
WIKIMEDIA_CLIENT_SECRET_PROD=your-prod-consumer-secret
```

## Step 4: Generate NextAuth Secret

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

Add the result to `NEXTAUTH_SECRET` in your environment variables.

## Development Workflows

### With Separate OAuth Clients (Option 1)
```bash
# Development
NEXTAUTH_URL=http://localhost:3010
WIKIMEDIA_CLIENT_ID_DEV=your-dev-client-id
WIKIMEDIA_CLIENT_SECRET_DEV=your-dev-client-secret
```

### With ngrok (Option 2)
```bash
# Start your app
npm run dev

# In another terminal
ngrok http 3010

# Update .env.local with ngrok URL
NEXTAUTH_URL=https://abc123.ngrok.io
WIKIMEDIA_CLIENT_ID=your-production-client-id
WIKIMEDIA_CLIENT_SECRET=your-production-client-secret
```

## Testing

Once configured, test the OAuth flow:

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3010`
3. Click "Sign In with Wikimedia"
4. You should be redirected to Meta-Wiki for authorization
5. After approval, you'll be redirected back to your app

## Troubleshooting

- **Invalid callback URL**: Make sure the registered callback URL exactly matches your `NEXTAUTH_URL + /api/auth/callback/wikimedia`
- **OAuth consumer pending**: Wait for Wikimedia administrators to approve your consumer
- **Scope errors**: Ensure you've requested all necessary grants in your OAuth consumer registration