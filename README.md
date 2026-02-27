# Smart Todo

An intelligent to-do recommendation app powered by Claude AI. This Electron desktop application helps you manage projects and todos with AI-powered suggestions.

## Features

- **Chat with Claude**: Get intelligent todo recommendations based on your projects and progress
- **Project Organization**: Organize todos by project with descriptions and notes
- **Smart Suggestions**: Claude analyzes your projects and notes to suggest actionable next steps
- **Celebration Effects**: Fun confetti animation when you complete a todo
- **Local Storage**: All data stored locally on your machine using SQLite
- **Offline Capable**: Works offline (except for AI features which require internet)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- An Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com/account/keys))

### Installation

1. Clone or download this project
2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Start the development server:

```bash
npm run dev
```

The app will open automatically. On first launch, go to Settings (gear icon) and add your Anthropic API key.

### Building for Distribution

To build a distributable macOS app:

```bash
npm run electron:build
```

The built app will be in the `release` folder.

## Usage

### Projects

1. Click "New Project" to create a project
2. Add a name and optional description
3. Add notes to provide context for Claude

### Todos

1. Type in the "Add a new todo..." field
2. Press Enter or click Add
3. Click the checkbox to complete
4. Completed todos are hidden by default - click "Show completed" to view them

### Chat with Claude

1. Make sure your API key is configured in Settings
2. Ask Claude questions like:
   - "What should I work on next?"
   - "Can you suggest some todos for my project?"
   - "How should I prioritize my tasks?"
3. Click "+ Add" on suggested todos to add them to your list

## Tech Stack

- **Electron** - Desktop application framework
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **better-sqlite3** - Local database
- **Anthropic SDK** - Claude AI integration

## Data Storage

All data is stored locally in your user data folder:
- macOS: `~/Library/Application Support/smart-todo/`
- Windows: `%APPDATA%/smart-todo/`
- Linux: `~/.config/smart-todo/`

Your API key is stored locally and never sent anywhere except to Anthropic's API.

## License

MIT
