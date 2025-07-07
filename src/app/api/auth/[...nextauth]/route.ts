import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'

const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'wikimedia',
      name: 'Wikimedia',
      type: 'oauth',
      version: '1.0A',
      requestTokenUrl: 'https://meta.wikimedia.org/w/index.php?title=Special:OAuth/initiate',
      accessTokenUrl: 'https://meta.wikimedia.org/w/index.php?title=Special:OAuth/token',
      profileUrl: 'https://meta.wikimedia.org/w/api.php?action=query&meta=userinfo&uiprop=*&format=json',
      clientId: process.env.WIKIMEDIA_CLIENT_ID || 
        (process.env.NODE_ENV === 'production' 
          ? process.env.WIKIMEDIA_CLIENT_ID_PROD 
          : process.env.WIKIMEDIA_CLIENT_ID_DEV),
      clientSecret: process.env.WIKIMEDIA_CLIENT_SECRET || 
        (process.env.NODE_ENV === 'production' 
          ? process.env.WIKIMEDIA_CLIENT_SECRET_PROD 
          : process.env.WIKIMEDIA_CLIENT_SECRET_DEV),
      profile(profile: { query: { userinfo: { id: number; name: string } } }) {
        return {
          id: profile.query.userinfo.id.toString(),
          name: profile.query.userinfo.name,
          email: null, // Wikimedia doesn't provide email through OAuth
          image: null,
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }