# BloomForm Engine

A themeable, config-driven multi-step form engine for [Bloom.io](https://bloom.io).

Give the CLI a Bloom form URL and it can generate a custom React form that is already mapped back to Bloom. The generated form includes the Bloom account ID, form ID, question IDs, step types, options, required flags, and success message. The package provides a clean base theme, and you can redesign the form with CSS variables or your own wrapper UI.

## Quick Start

### 1. Install

```bash
npm install bloom-form-engine
```

During installation, BloomForm Engine checks for the required peer dependencies. When your package manager allows interactive lifecycle prompts, the installer lets you choose `react`, `react-dom`, `framer-motion`, or all required dependencies and installs the selected packages for you.

If the install runs in a non-interactive environment, install them manually:

```bash
npm install react react-dom framer-motion
```

You can also run the peer dependency helper any time:

```bash
npx bloom-form-engine peers
```

### 2. Initialize

```bash
npx bloom-form-engine init
```

This creates a `bloom-form.config.ts` and a theme CSS file in your project.

### 3. Connect your Bloom account

```bash
npx bloom-form-engine connect
```

### 4. Add a form

```bash
npx bloom-form-engine add
```

This walks you through creating a form step-by-step and generates a ready-to-use React component.

### Or import from a Bloom form URL

```bash
npx bloom-form-engine import "https://your-account.bloom.io/your-form"
```

The importer fetches Bloom's public form configuration, detects the account ID, form ID, question IDs, step types, multiple-choice options, personal-info fields, required flags, and success message, then generates a ready-to-use React component. The generated component submits to Bloom automatically through the same answer-group, answer, availability, timezone, and final-submit endpoints used by Bloom forms.

The CLI creates two starter files:

- A themed form component that imports BloomForm Engine's Perfect Booth-style starter theme.
- A Next.js `app` route page that centers the form vertically and horizontally, loads Google Inter, and stays mobile-friendly by default.

Bloom may reject browser submissions from `localhost`, so the CLI also asks for an optional proxy/API base URL. Leave it blank to set the proxy up later.

If you pass a local Next.js proxy path, the CLI creates the route for you:

```bash
npx bloom-form-engine import "<bloom-url>" --proxy "/api/bloom"
```

That writes `app/api/bloom/[...path]/route.ts`. Browser requests go to your app first, and the route forwards only the Bloom headers that are needed, so localhost `Origin` and `Referer` headers are not sent upstream to Bloom.

You can also pass Bloom's public API URL directly:

```bash
npx bloom-form-engine import "https://api.bloom.io/api/public-forms/{accountId}/forms/{formId}"
```

If the URL does not expose both IDs, the CLI asks for the missing value.

Useful options:

```bash
npx bloom-form-engine import "<bloom-url>" --name RentalQuote --output ./components/forms --summary
```

To set the submission proxy immediately:

```bash
npx bloom-form-engine import "<bloom-url>" --proxy "https://your-domain.com/api/bloom"
```

Address autocomplete uses Bloom's public places endpoint by default, so generated address steps work from localhost without a Google Maps key. You can still override `placesEndpoint` in your `BloomFormConfig` if you want to use your own Google Places route.

Generated forms use the package's standard theme by default. Import the base stylesheet, then override CSS variables to match your brand.

## What You Get

When you import a Bloom URL, the starter is intentionally ready-made:

- A mapped React form component with Bloom `accountId`, `formId`, question IDs, field types, options, required flags, and success copy.
- A centered Next.js page route such as `app/get-quote/page.tsx`.
- The Perfect Booth-style base theme using Inter by default, with question titles shown in normal case rather than forced all-caps.
- Address autocomplete through Bloom's places endpoint.
- Optional local proxy generation at `app/api/bloom/[...path]/route.ts` when you pass `--proxy "/api/bloom"`.

For most Next.js + Tailwind projects, the generated files are enough. Make sure your global CSS includes Tailwind and your Tailwind content config scans the package output:

```js
// tailwind.config.js
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/bloom-form-engine/dist/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

If your app does not use Tailwind, keep the generated component and page as the wiring layer, then replace the class names with your own styles while keeping the generated `BloomFormConfig`.

## Manual Usage

```tsx
import { BloomForm } from 'bloom-form-engine';
import type { BloomFormConfig } from 'bloom-form-engine';
import 'bloom-form-engine/src/theme.css';

const config: BloomFormConfig = {
  accountId: 'your-account-id',
  formId: 'your-form-id',
  proxyBaseUrl: '/api/bloom',
  steps: [
    {
      id: 'name',
      questionId: 'q1',
      title: 'Your Name',
      description: 'Please enter your name',
      type: 'personal_info',
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', required: true },
      ],
      required: true,
    },
    // ... more steps
  ],
  successMessage: {
    title: 'Thank You!',
    description: 'We will be in touch soon.',
  },
};

export default function MyForm() {
  return <BloomForm config={config} />;
}
```

## Theming

Override CSS variables to match your brand:

```css
:root {
  --bf-font-heading: 'Your Heading Font', sans-serif;
  --bf-font-body: 'Your Body Font', sans-serif;
  --bf-color-accent: #your-accent-color;
  --bf-color-error: #your-error-color;
  --bf-color-border: #your-border-color;
  --bf-color-bg: #ffffff;
  --bf-color-bg-header: #f1f1f1;
  --bf-color-text: #1c1c1c;
  --bf-radius: 10px;
  --bf-radius-card: 12px;
}
```

The default starter theme mirrors the Perfect Booth form treatment while using Inter instead of Perfect Booth's custom brand fonts. It also includes these layout helpers for generated pages:

```css
.bf-starter-page
.bf-starter-form-shell
```

## Step Types

| Type | Description |
|------|-------------|
| `multiple_choice` | Radio buttons (single) or checkboxes (multi) |
| `date` | Calendar picker with time slots and timezone |
| `address` | Address autocomplete using Bloom's public places endpoint by default |
| `personal_info` | Grouped input fields (name, email, phone) |
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `summary` | Review step before submission |

## Props

### `<BloomForm />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `BloomFormConfig` | required | Form configuration |
| `stickyFooter` | `boolean` | `false` | Pin footer buttons to bottom of viewport |
| `onSuccess` | `() => void` | - | Callback when form submits successfully |

## Local Proxy Route

Use a proxy when your form runs on localhost or on a domain Bloom does not accept directly:

```bash
npx bloom-form-engine import "https://your-account.bloom.io/your-form" --proxy "/api/bloom"
```

The generated route forwards requests to `https://api.bloom.io/api`, preserves only the headers Bloom needs, strips localhost `Origin` and `Referer`, supports `GET`, `POST`, and `OPTIONS`, and adds browser-friendly CORS headers.

For production, deploy the same route with your app and keep `proxyBaseUrl: "/api/bloom"` in the generated config. You can also use a full deployed URL:

```tsx
proxyBaseUrl: 'https://your-domain.com/api/bloom'
```

## Peer Dependencies

- React >= 18
- React DOM >= 18
- Framer Motion >= 10

The components use Tailwind-style utility class names alongside BloomForm Engine's CSS variables. If your app does not compile utility classes, keep the generated form as a starting point and restyle it with your own classes or wrapper UI.

## License

MIT
