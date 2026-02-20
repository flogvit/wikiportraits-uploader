# WikiPortraits Bulk Uploader

A Next.js web application for bulk uploading and managing images to Wikimedia Commons, with specialized workflows for WikiPortraits events, soccer matches, and music events. Features OAuth 2.0 authentication, automated metadata generation, and Wikidata integration.

## ✨ Features

### Core Functionality
- **Bulk Image Upload**: Drag-and-drop interface for uploading multiple images to Wikimedia Commons
- **OAuth 2.0 Authentication**: Secure authentication with Wikimedia accounts
- **Automated Metadata Generation**: Intelligent extraction of EXIF data and metadata templating
- **Wikidata Integration**: Automatic linking of uploaded images to Wikidata entities
- **Duplicate Detection**: Prevents accidental duplicate uploads with warning system

### Specialized Workflows
- **WikiPortraits Events**: Streamlined workflow for portrait photography events
- **Soccer Matches**: Team and player selection with automatic categorization
- **Music Events**: Artist and venue metadata with automatic tagging
- **General Uploads**: Flexible workflow for any type of image upload

### Advanced Features
- **Template Preview**: Real-time preview of Commons file page templates
- **Batch Processing**: Queue management for large upload batches
- **Export/Import**: QuickStatements export for Wikidata batch operations
- **GPS Coordinates**: Automatic location tagging from EXIF or event data
- **Dark/Light Theme**: User-preferred theme switching

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Wikimedia OAuth 2.0 credentials (see [OAuth Setup Guide](./OAUTH_SETUP.md))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/flogvit/wikiportraits-uploader.git
   cd wikiportraits-uploader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your OAuth credentials:
   ```bash
   NEXTAUTH_URL=http://localhost:3010
   NEXTAUTH_SECRET=your-nextauth-secret
   WIKIMEDIA_CLIENT_ID=your-oauth-client-id
   WIKIMEDIA_CLIENT_SECRET=your-oauth-client-secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Visit [http://localhost:3010](http://localhost:3010) in your browser

## 📖 Usage

### Basic Upload Workflow

1. **Sign in** with your Wikimedia account
2. **Select upload type** (General, Soccer, Music, or WikiPortraits)
3. **Configure event details** (if using specialized workflows)
4. **Upload images** via drag-and-drop or file selection
5. **Edit metadata** for each image as needed
6. **Review and upload** to Commons

### Soccer Match Workflow

1. Select "Soccer Match" upload type
2. Search and select home/away teams
3. Set match details (date, venue, competition)
4. Select players from team rosters
5. Upload images with automatic player/team categorization

### Music Event Workflow

1. Select "Music Event" upload type
2. Search for artists and venues
3. Set event details (date, location, type)
4. Upload images with automatic music categorization

## 🔧 Development

### Project Structure
```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth.js authentication
│   │   ├── wikidata/      # Wikidata API integration
│   │   └── wikipedia/     # Wikipedia API integration
│   └── layout.tsx         # Root layout component
├── components/            # React components
│   ├── workflow/          # Specialized workflow components
│   └── ...               # UI components
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions and API clients
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run deploy       # Deploy to production server
```

### API Integration

The application integrates with several Wikimedia APIs:

- **Commons API**: File uploads and metadata management
- **Wikidata API**: Entity search and claim creation
- **Wikipedia API**: Article and infobox management
- **OAuth API**: User authentication and authorization

## 🔐 Security

- All API calls use proper CSRF protection
- OAuth tokens are securely managed by NextAuth.js
- Environment variables protect sensitive credentials
- Input validation prevents malicious uploads
- Rate limiting prevents API abuse

## 🚀 Deployment

See the [Deployment Guide](./DEPLOYMENT.md) for detailed instructions on deploying to production, including:

- Server setup and configuration
- Environment variable management
- Process management with PM2
- Nginx reverse proxy configuration
- SSL certificate setup

## 📚 Documentation

- [OAuth Setup Guide](./OAUTH_SETUP.md) - Setting up Wikimedia OAuth credentials
- [OAuth 1.0a Setup](./OAUTH_SETUP_1_0A.md) - Alternative OAuth 1.0a setup
- [Apache Setup](./APACHE_SETUP.md) - Apache server configuration
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code style and conventions
- Development workflow
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- Authentication powered by [NextAuth.js](https://next-auth.js.org/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- File uploads handled by [React Dropzone](https://react-dropzone.js.org/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/flogvit/wikiportraits-uploader/issues)
- **Discussions**: [GitHub Discussions](https://github.com/flogvit/wikiportraits-uploader/discussions)
- **Wiki**: [Project Wiki](https://github.com/flogvit/wikiportraits-uploader/wiki)

---

Made with ❤️ for the Wikimedia community

