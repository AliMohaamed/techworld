# Research & Decisions: Responsive Admin Dashboard

## Breakpoint Strategy
- **Decision**: Utilize Tailwind CSS default responsive utility variants (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`).
- **Rationale**: Keeps consistency with standard Tailwind configurations and is heavily supported by the frontend component ecosystem. Modern devices fit well within these standard breakpoints.
- **Alternatives considered**: Custom CSS media queries (rejected to maintain utility-first workflow and consistency).

## Mobile Navigation
- **Decision**: Implement an off-canvas Drawer/Sheet component for mobile navigation (accessible via hamburger menu).
- **Rationale**: Solves the issue of sidebar taking up too much screen real estate on mobile and portrait-tablet modes. Using an existing headless UI component (like Radix UI / shadcn `Sheet`) ensures accessibility (focus management, ARIA roles).
- **Alternatives considered**: Push-content menus (often janky on some viewports) or bottom navigation bars (less suited for dense admin applications than an off-canvas drawer).

## Data Table Mobile Strategy
- **Decision**: Implement horizontal scroll native to CSS with `position: sticky` on the first column.
- **Rationale**: Required directly by the clarified feature spec. This approach allows users to maintain context via the first column while seeing remaining data, without drastically rewriting the DOM structure for tables.
- **Alternatives considered**: Card-based row fallback (rejected during clarification phase due to higher complexity and maintenance cost for many different table types).

## Filtering and Complex Forms
- **Decision**: Render intensive filtering tools or wizards fully within full-screen modals/dialogs on mobile viewports (`max-w-full`, `h-full` on `md:hidden` breakpoints).
- **Rationale**: Solves the complex filtering menu edge case by dedicating the entire mobile screen to the interaction, avoiding cramped inline accordions.
- **Alternatives considered**: Inline collapsible accordions (rejected because they often require excessive vertical scrolling when opened).
