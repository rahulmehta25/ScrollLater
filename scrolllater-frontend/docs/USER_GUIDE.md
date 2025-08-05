# ScrollLater User Guide

Welcome to ScrollLater! This guide will help you get started with capturing, organizing, and scheduling your digital content.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Entries](#creating-entries)
3. [Organizing Content](#organizing-content)
4. [Smart Scheduling](#smart-scheduling)
5. [Google Calendar Integration](#google-calendar-integration)
6. [iOS Shortcuts Integration](#ios-shortcuts-integration)
7. [Managing Your Profile](#managing-your-profile)
8. [Tips & Best Practices](#tips--best-practices)

## Getting Started

### Creating Your Account

1. Visit [ScrollLater](https://scroll-later.vercel.app)
2. Click "Sign in with Google"
3. Authorize ScrollLater to access your Google account
4. You'll be automatically redirected to your dashboard

### Understanding the Dashboard

Your dashboard is the central hub where you can:
- View all your saved entries
- Filter by status (Inbox, Scheduled, Completed, Archived)
- Search through your content
- Access quick stats about your productivity

## Creating Entries

### Manual Entry Creation

1. Click the **"Add New Entry"** button or use the entry form
2. Enter your content:
   - **Content**: The main text, link, or idea you want to save
   - **URL** (optional): If you're saving a web link, it will be auto-detected
   - **Category**: Choose from predefined categories or let AI suggest one
   - **Tags**: Add comma-separated tags for better organization
3. Click **"Save Entry"**

### AI-Powered Features

When you create an entry, ScrollLater's AI automatically:
- Generates a meaningful title
- Creates a summary of long content
- Suggests appropriate categories
- Recommends relevant tags
- Assigns a priority level

## Organizing Content

### Categories

ScrollLater provides 9 default categories:
- 📖 **Read Later**: Articles and blog posts
- 🔨 **Build**: Development tools and tutorials
- 🔍 **Explore**: Interesting discoveries
- ✅ **Todo**: Tasks and action items
- 📅 **Schedule**: Time-sensitive items
- 🎨 **Creative**: Design inspiration
- 🎓 **Learning**: Educational content
- 💼 **Business**: Professional content
- 👤 **Personal**: Personal interests

### Using Tags

Tags help you create custom groupings:
- Add multiple tags separated by commas
- Search by tags using the filter bar
- AI suggests relevant tags based on content

### Search and Filters

Find your content quickly:
- **Search bar**: Search through titles, content, and summaries
- **Status filters**: View by Inbox, Scheduled, Completed, or Archived
- **Category filters**: Filter by specific categories
- **Combination filters**: Use multiple filters together

## Smart Scheduling

### AI Scheduling Suggestions

1. Navigate to the **Smart Scheduler** section
2. Click **"Refresh Suggestions"**
3. Review AI-generated scheduling recommendations
4. Click **"Schedule"** to accept a suggestion

The AI considers:
- Content type and estimated reading/completion time
- Your past scheduling patterns
- Optimal times for different activities
- Priority levels

### Manual Scheduling

1. Click on any entry
2. Select **"Schedule"** from the actions menu
3. Choose your preferred date and time
4. Confirm the schedule

## Google Calendar Integration

### Connecting Your Calendar

1. Go to **Settings** → **Calendar Integration**
2. Click **"Connect"** under Google Calendar
3. Authorize ScrollLater to access your calendar
4. Your connection status will show as "Connected"

### Calendar Features

Once connected:
- Scheduled entries automatically create calendar events
- Calendar events include entry titles and links
- Events are updated when you reschedule entries
- Events are removed when entries are completed

### Switching Google Accounts

If you need to use a different Google account:
1. Click **"Switch Account"** in Calendar settings
2. Select the desired Google account
3. Re-authorize the connection

## iOS Shortcuts Integration

### Setting Up iOS Shortcuts

1. Go to **Settings** → **iOS Shortcuts**
2. Copy your unique shortcut token
3. Open the Shortcuts app on your iPhone
4. Create a new shortcut with these actions:
   - **Text**: Enter your content
   - **Get Contents of URL**:
     - URL: `https://scroll-later.vercel.app/api/shortcuts/webhook`
     - Method: POST
     - Headers: `Content-Type: application/json`
     - Request Body:
       ```json
       {
         "token": "YOUR_TOKEN_HERE",
         "content": "Shortcut Input",
         "source": "ios-shortcut"
       }
       ```

### Using the Shortcut

1. Run the shortcut from:
   - Shortcuts app
   - Share sheet
   - Siri
   - Widget
2. Enter or share your content
3. The entry will appear instantly in ScrollLater

## Managing Your Profile

### Profile Settings

Access your profile settings to customize:
- **Display Name**: How your name appears
- **Profile Photo**: Upload a custom avatar
- **Timezone**: Ensures correct scheduling times
- **Default Session Duration**: How long you typically spend on entries
- **Auto-schedule**: Automatically schedule new entries

### Updating Preferences

1. Go to **Settings** → **Profile**
2. Click **"Edit"**
3. Make your changes
4. Click **"Save Changes"**

## Tips & Best Practices

### Effective Content Capture

1. **Be descriptive**: Add context to your entries
2. **Use consistent tags**: Develop your own tagging system
3. **Review regularly**: Check your inbox weekly
4. **Trust the AI**: Let it help with categorization

### Scheduling Strategies

1. **Batch similar content**: Schedule related items together
2. **Respect your energy**: Schedule demanding tasks when you're fresh
3. **Buffer time**: Don't over-schedule your calendar
4. **Review and adjust**: Refine your scheduling patterns

### Productivity Tips

1. **Process inbox weekly**: Don't let entries pile up
2. **Use bulk actions**: Select multiple entries for faster processing
3. **Archive completed items**: Keep your active list clean
4. **Export important content**: Use the export feature for backups

## Troubleshooting

### Common Issues

**Can't create entries?**
- Check your internet connection
- Ensure you're logged in
- Try refreshing the page

**Calendar events not appearing?**
- Verify calendar is connected
- Check the correct calendar is selected in Google Calendar
- Re-connect if necessary

**iOS Shortcut not working?**
- Verify your token is correct
- Check the webhook URL
- Ensure proper JSON formatting

## Getting Help

Need assistance? 
- Check the in-app help tooltips (ⓘ icons)
- Contact support through the app
- Visit our GitHub repository for technical issues

---

Happy organizing with ScrollLater! 🚀