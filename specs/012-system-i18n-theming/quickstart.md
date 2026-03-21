# Quickstart Developer Guide: Phase 11 - System-Wide Polish, i18n & Theming

This feature enables seamless multi-lingual translations (LTR and RTL layouts) combined perfectly with Dark and Light Mode contexts across the entire e-commerce monorepo (`apps/storefront` and `apps/admin`).

## 1. Modifying Text Translations (`next-intl`)

All user-facing text strings are mapped manually in JSON dictionaries.

### Step 1: Add a Missing Key

When hardcoding a new feature button (e.g., "Add to Wishlist"), head to `messages/en.json` first:
```json
// apps/storefront/src/messages/en.json
{
  "ProductCard": {
    "addToWishlist": "Add to Wishlist"
  }
}
```

Then supply the identical hierarchy in the Arabic file (`ar.json`), ensuring RTL logic acts gracefully:
```json
// apps/storefront/src/messages/ar.json
{
  "ProductCard": {
    "addToWishlist": "أضف إلى قائمة الامنيات"
  }
}
```

### Step 2: Implement via hook

Inside your component (which now requires the `useTranslations` hook from `next-intl`):
```tsx
import { useTranslations } from 'next-intl';

export default function ProductCard() {
  const t = useTranslations('ProductCard');
  return <button>{t('addToWishlist')}</button>;
}
```

## 2. Using Theme Context (`next-themes`)

The `shadcn/ui` ecosystem natively consumes Tailwind CSS `dark:` utilities. To force an explicit component style switch or hook into the context programmatically:

```tsx
'use client'
import { useTheme } from 'next-themes'

export function MyThemeSwitch() {
  const { theme, setTheme } = useTheme() // 'light', 'dark', 'system'

  return <button onClick={() => setTheme('dark')}>Enable Dark Mode</button>
}
```

## 3. Global Toast Notifications (`sonner`)

For success or error handling after network or db mutations:

```tsx
import { toast } from 'sonner'

export function submitForm() {
  try {
     // ... mutation logic
     toast.success('Form saved successfully')
  } catch (error) {
     toast.error('Failed to submit form')
  }
}
```

*Note: Rapid repeated clicks generating identical toast spam are throttled automatically by our universal generic wrapper.*
