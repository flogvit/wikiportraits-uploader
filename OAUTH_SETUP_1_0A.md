# OAuth 1.0a Setup Guide (Recommended)

**Recommended Choice**: Use OAuth 1.0a for better callback URL flexibility and single consumer setup.

## Why OAuth 1.0a is Better for Your Use Case

- ✅ **Single Consumer**: One OAuth consumer handles both dev and production
- ✅ **Flexible Callback URLs**: "Use as prefix" option allows multiple domains
- ✅ **Better Security**: Cryptographically signed requests
- ✅ **Mature & Stable**: Well-established in Wikimedia ecosystem

## Step 1: Register OAuth 1.0a Consumer

1. Go to [Meta-Wiki OAuth Consumer Registration](https://meta.wikimedia.org/wiki/Special:OAuthConsumerRegistration/propose)
2. Fill in the form:
   - **Application name**: `WikiPortraits Bulk Uploader`
   - **Application description**: `Bulk uploader for WikiPortraits images to Wikimedia Commons with NextAuth.js`
   - **OAuth "callback URL"**: `https://your-production-domain.com/` (include trailing slash)
   - **Allow consumer to specify a callback in requests**: ✅ **CHECKED** (enables prefix matching)
   - **Applicable grants**: Select these permissions:
     - ✅ `basic` - Basic rights
     - ✅ `highvolume` - High-volume editing  
     - ✅ `editpage` - Edit existing pages
     - ✅ `createeditmovepage` - Create, edit and move pages
     - ✅ `uploadfile` - Upload new files
     - ✅ `editprotected` - Edit protected pages
3. Submit and wait for approval

## Step 2: Configure Environment Variables

Once approved, add to your `.env.local`:

```bash
# OAuth Configuration
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your-generated-secret-here

# Wikimedia OAuth 1.0a Consumer
WIKIMEDIA_CLIENT_ID=your-consumer-key
WIKIMEDIA_CLIENT_SECRET=your-consumer-secret

# API Configuration  
COMMONS_API_URL=https://commons.wikimedia.org/w/api.php
WIKIDATA_API_URL=https://wikidata.org/w/api.php
WIKIPEDIA_API_URL=https://en.wikipedia.org/w/api.php
META_WIKI_API_URL=https://meta.wikimedia.org/w/api.php
```

## Step 3: Generate NextAuth Secret

```bash
openssl rand -base64 32
```

## How Callback URLs Work with OAuth 1.0a

With "Allow consumer to specify a callback in requests" enabled:Can you fix 

### Development
- Your app uses: `http://localhost:3010/api/auth/callback/wikimedia`
- This works because it matches the registered prefix pattern

### Production  
- Your app uses: `https://your-production-domain.com/api/auth/callback/wikimedia`
- This also matches your registered prefix: `https://your-production-domain.com/`

### Additional Environments
- Staging: `https://staging.your-domain.com/api/auth/callback/wikimedia` ✅
- Preview: `https://preview-123.your-domain.com/api/auth/callback/wikimedia` ✅
- Any subdomain works as long as it starts with your registered prefix

## Testing

1. Start development server: `npm run dev`
2. Visit `http://localhost:3010`
3. Click "Sign In with Wikimedia"
4. You'll be redirected to Meta-Wiki for authorization
5. After approval, you'll be redirected back to your app

## Production Deployment

For production, just update your `NEXTAUTH_URL`:

```bash
# Production .env
NEXTAUTH_URL=https://your-production-domain.com
WIKIMEDIA_CLIENT_ID=same-consumer-key
WIKIMEDIA_CLIENT_SECRET=same-consumer-secret
```

The same OAuth consumer works for both environments!

## Troubleshooting

- **Invalid callback URL**: Ensure your callback starts with registered prefix
- **OAuth consumer pending**: Wait for Wikimedia administrators to approve
- **Signature errors**: Check that your consumer key/secret are correct
- **Scope errors**: Ensure you requested all necessary grants during registration