# Study Assistant Frontend

A modern, responsive web application designed to help students manage their study documents.
It provides a clean interface for uploading, categorising, and tracking lecture notes, assignments, and other study materials.

## Features

- **Document Management:** View a sortable and filterable table of all uploaded documents.
- **Categorisation:** Track documents by course, type (Lecture, Assignment, etc.), term, year, and chapter.
- **Upload:** Easily upload documents with metadata including course name, term, and year.
- **Summarisation:** Trigger summarisation for lecture notes directly from the dashboard.
- **Settings:** Configure API connection details (Server URL and Token) with local storage persistence.
- **Material Design 3:** Built using MD3 system colors and design principles for a modern look and feel.

## Project Structure

```text
/
├── dist/               # Compiled production build
├── src/                # Source code
│   ├── components/     # Reusable UI components (badges, toasts, toolbars, etc.)
│   ├── views/          # Main application views (docs table, settings, upload)
│   ├── api.ts          # API interaction logic and configuration
│   ├── app.ts          # Application entry point and view initialisation
│   ├── index.html      # Main HTML document
│   ├── style.css       # Global styles (Material Design 3 based)
│   ├── types.ts        # TypeScript interfaces and enums
│   └── utils.ts        # Helper functions
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server with hot-reloading:

```bash
npm run dev
```

The application will be available at `http://localhost:1234`.

### Building for Production

Compile and minify the project for production:

```bash
npm run build
```

The output will be in the `dist/` directory.

### Other Commands

- **Typecheck:** `npm run typecheck` - Run TypeScript compiler to check for type errors.
- **Format:** `npm run format` - Format the codebase using Prettier.

## Configuration

When first launching the app, you will need to configure the connection to your backend:

1. Click the **Settings** (gear) icon in the toolbar.
2. Enter your **Server URL** and **API Token**.
3. Use the **Test Connection** button to verify the settings.
4. **Save** the configuration.

Settings are stored in your browser's local storage and are persistent between sessions.
