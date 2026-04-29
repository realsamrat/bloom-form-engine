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

Generated forms use the package's standard theme by default. Import the base stylesheet, then override CSS variables to match your brand.

## Manual Usage

```tsx
import { BloomForm } from 'bloom-form-engine';
import type { BloomFormConfig } from 'bloom-form-engine';
import 'bloom-form-engine/src/theme.css';

const config: BloomFormConfig = {
  accountId: 'your-account-id',
  formId: 'your-form-id',
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
| `address` | Address autocomplete (Google Places) |
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

## Peer Dependencies

- React >= 18
- React DOM >= 18
- Framer Motion >= 10

The components use Tailwind-style utility class names alongside BloomForm Engine's CSS variables. If your app does not compile utility classes, keep the generated form as a starting point and restyle it with your own classes or wrapper UI.

## License

MIT
