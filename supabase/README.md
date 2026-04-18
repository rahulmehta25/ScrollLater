# Supabase Setup Instructions

## Database Schema Setup

1. **Access Supabase Dashboard**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your ScrollLater project

2. **Apply Database Schema**
   - Navigate to the **SQL Editor** in the left sidebar
   - Click **New Query**
   - Copy and paste the contents of `schema.sql` into the editor
   - Click **Run** to execute the schema

3. **Verify Tables Created**
   - Go to **Table Editor** in the left sidebar
   - You should see the following tables:
     - `users` (extends auth.users)
     - `categories`
     - `content_items`

4. **Enable Row Level Security (RLS)**
   - The schema automatically enables RLS on all tables
   - Policies are created to ensure users can only access their own data

5. **Test Authentication**
   - The schema includes triggers to automatically create user profiles
   - When a user signs up, a corresponding record is created in the `users` table

## Environment Variables

Make sure your `.env.local` file contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## OAuth Configuration

1. **Google OAuth** (for Google Calendar integration)
   - Go to **Authentication > Providers** in Supabase
   - Enable Google provider
   - Add your Google OAuth credentials

2. **GitHub OAuth** (optional)
   - Enable GitHub provider
   - Add your GitHub OAuth credentials

## Next Steps

After applying the schema:
1. Test user registration and login
2. Test creating content items
3. Verify real-time subscriptions work
4. Test filtering and search functionality 