# Phase 1 Data Models: System-Wide Polish, i18n & Theming

**Scope Constraint**: Per the approved specification, this phase explicitly does not introduce or modify any database definitions on the server (`convex/schema.ts`). Operations apply entirely to global client state, cookies, and local JSON resources.

## 1. Localization Persistence (Cookies)

The active translation locale is negotiated by `next-intl` middleware and persisted locally.

- **Name**: `NEXT_LOCALE`
- **Format**: `string`
- **Values**: `"en"` | `"ar"`
- **Behavior**: Set by the locale switcher component. Extracted by Next.js Server Components on initial request to bypass the `Accept-Language` browser default.

## 2. Theming Persistence (LocalStorage / Cookies)

Theme state prevents flashing from unstyled content (FOUC).

- **Library Entity**: Managed entirely by `next-themes`
- **Local Storage Key**: `theme`
- **Values**: `"light"` | `"dark"` | `"system"`
- **Strategy**: Inline script executed dynamically on document `<head>` load determines initial scheme.

## 3. Translation Dictionaries (`messages/*.json`)

A structured JSON schema mapping standard English keys to target language keys.

**Example Structure (`en.json` / `ar.json`)**:
```json
{
  "Common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete"
    },
    "feedback": {
      "successTitle": "Success",
      "errorTitle": "Error"
    }
  },
  "Navigation": {
    "storefront": {
      "home": "Home",
      "catalog": "Catalog"
    },
    "admin": {
      "dashboard": "Dashboard",
      "settings": "Settings"
    }
  }
}
```

- Keys must be strictly synchronized and typed. `next-intl` will use a generic default fallback to English should an Arabic key be omitted, as decreed in the feature edge-case clarification.
