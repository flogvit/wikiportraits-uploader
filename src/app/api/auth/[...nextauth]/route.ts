import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'wikimedia',
      name: 'Wikimedia',
      credentials: {},
      async authorize() {
        // For development, we'll use the personal access token
        if (process.env.WIKIMEDIA_PERSONAL_ACCESS_TOKEN) {
          // Verify the token by making a simple API call
          try {
            const response = await fetch('https://meta.wikimedia.org/w/api.php?action=query&meta=userinfo&uiprop=*&format=json', {
              headers: {
                'Authorization': `Bearer ${process.env.WIKIMEDIA_PERSONAL_ACCESS_TOKEN}`,
                'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)',
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              return {
                id: data.query?.userinfo?.id?.toString() || 'dev-user',
                name: data.query?.userinfo?.name || 'Development User',
                email: null,
                image: null,
              };
            }
          } catch (error) {
            console.error('Failed to verify personal access token:', error);
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      // Always use the personal access token for API calls
      token.accessToken = process.env.WIKIMEDIA_PERSONAL_ACCESS_TOKEN;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions }