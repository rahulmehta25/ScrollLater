# ScrollLater

A mobile-first social media content scheduling platform that helps users capture links, ideas, and tasks from various sources and intelligently schedule time to revisit them.

## Project Structure

```
ScrollLater/
├── scrolllater-frontend/     # Next.js application
│   ├── src/                  # Source code
│   ├── package.json          # Frontend dependencies
│   └── ...
├── docs/                     # Documentation
├── package.json              # Root convenience scripts
└── README.md                 # This file
```

## Quick Start

### Option 1: From Root Directory (Recommended)
```bash
# Install dependencies
npm run install-deps

# Start development server
npm run dev
```

### Option 2: From Frontend Directory
```bash
# Navigate to frontend directory
cd scrolllater-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Available Scripts

From the root directory, you can run:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting
- `npm run install-deps` - Install frontend dependencies

## Development

The main application is in the `scrolllater-frontend/` directory. This is a Next.js application with:
- TypeScript
- TailwindCSS
- Supabase backend
- Google OAuth authentication

## Access the Application

Once running, access the application at:
- **Local**: http://localhost:3000
- **Network**: http://192.168.1.127:3000 (for testing from other devices)

## Current Status

- **Phase**: 1 - Core Foundation (80% Complete)
- **Next Steps**: Apply database schema, test content management features 