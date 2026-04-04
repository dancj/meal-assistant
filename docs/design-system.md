# Meal Assistant Design System

## Brand Direction

Earthy, organic, and homey. The visual identity evokes a warm kitchen — olive greens, terracotta, and warm browns. The palette feels rustic and inviting without being heavy or muddy.

## Color Palette

All colors use the oklch color space for perceptual uniformity. Values are defined as CSS variables in `src/app/globals.css`.

### Primary Colors

| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--primary` | `oklch(0.47 0.10 138)` — muted olive | `oklch(0.62 0.13 138)` — lighter olive | Primary actions, active states, brand identity |
| `--primary-foreground` | `oklch(0.99 0 0)` — white | `oklch(0.16 0.02 138)` — dark olive | Text on primary backgrounds |

### Accent Colors

| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--accent` | `oklch(0.90 0.04 38)` — soft terracotta | `oklch(0.35 0.04 38)` — deep terracotta | Hover states, highlighted sections, visual warmth |
| `--accent-foreground` | `oklch(0.25 0.03 40)` — dark warm | `oklch(0.93 0.008 75)` — light | Text on accent backgrounds |

### Semantic Colors

| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--success` | `oklch(0.55 0.16 150)` — bright green | `oklch(0.62 0.14 150)` — lighter green | Success states, confirmations. Hue 150 is intentionally brighter and more saturated than olive primary (hue 138) for clear distinction. |
| `--warning` | `oklch(0.75 0.12 70)` — warm amber | `oklch(0.72 0.11 70)` — muted amber | Warning states, demo indicators |
| `--destructive` | `oklch(0.577 0.245 27)` — red | `oklch(0.704 0.191 22)` — lighter red | Destructive actions, errors |

### Neutral Colors

| Token | Light Mode | Dark Mode | Purpose |
|-------|-----------|-----------|---------|
| `--background` | `oklch(0.985 0.005 75)` — warm off-white | `oklch(0.17 0.015 65)` — warm dark | Page background |
| `--foreground` | `oklch(0.20 0.02 65)` — warm near-black | `oklch(0.93 0.008 75)` — warm near-white | Body text |
| `--muted` | `oklch(0.94 0.012 75)` — warm light gray | `oklch(0.28 0.012 65)` — warm dark gray | Subdued backgrounds |
| `--muted-foreground` | `oklch(0.48 0.02 65)` — warm mid-gray | `oklch(0.63 0.02 65)` — warm mid-gray | Secondary text |
| `--secondary` | `oklch(0.95 0.015 75)` — warm cream | `oklch(0.28 0.015 65)` — warm dark | Secondary buttons, subtle surfaces |
| `--border` | `oklch(0.90 0.015 75)` — warm border | `oklch(1 0.008 75 / 12%)` — translucent warm | Borders, dividers |
| `--card` | `oklch(0.995 0.003 75)` — near white | `oklch(0.22 0.015 65)` — dark surface | Card backgrounds |

### Design Principles for Colors

- **All neutrals carry warm undertones** (hue 65-75) — never use pure gray (hue 0, chroma 0)
- **Primary (olive, hue 138)** is distinct from success (bright green, hue 150) — primary is muted, success is vivid
- **Accent (terracotta, hue 38)** adds visual warmth without competing with primary
- **Maintain WCAG AA contrast** (4.5:1 minimum) for all text on background combinations
- **Dark mode uses higher chroma** to keep earthy tones vibrant on dark surfaces

## Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Body text | Geist Sans (`--font-sans`) | 400 | `text-sm` (14px) |
| Headings (h1) | Geist Sans | 700 (`font-bold`) | `text-2xl` (24px) |
| Headings (h2) | Geist Sans | 600 (`font-semibold`) | `text-lg` (18px) |
| Section labels | Geist Sans | 600 | `text-sm uppercase tracking-wide` |
| Monospace/code | Geist Mono (`--font-mono`) | 400 | Inherited |
| Metadata | Geist Sans | 400 | `text-xs` (12px) |

### Typography Principles

- Use `font-bold` for page titles, `font-semibold` for section headers, `font-medium` for interactive labels
- Section labels use `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- Do not use fonts other than Geist Sans and Geist Mono

## Spacing

| Context | Value | Usage |
|---------|-------|-------|
| Page padding | `px-4` | Horizontal padding on main content |
| Section gap | `space-y-6` | Between major page sections |
| Card internal | `CardContent` default | Content within cards |
| Form fields | `space-y-2` | Between label and input, between fields |
| Inline items | `gap-2` | Between buttons, badges, inline elements |
| Container max width | `max-w-3xl mx-auto` | All page content |

## Border Radius

Uses shadcn's radius scale based on `--radius: 0.625rem`:

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 3.75px | Small elements, inner borders |
| `rounded-md` | 5px | Inputs, small cards |
| `rounded-lg` | 10px | Cards, buttons (default) |
| `rounded-xl` | 14px | Large containers |
| `rounded-4xl` | 16.25px | Pill-shaped badges |

## Component Usage

### Buttons
- Use `<Button>` from `@/components/ui/button` for all interactive buttons
- For links styled as buttons, use `buttonVariants()` as className on `<Link>` elements
- Primary actions: `variant="default"` (olive green)
- Secondary actions: `variant="outline"` or `variant="secondary"`
- Destructive actions: `variant="destructive"` (red)
- Icon-only: `size="icon"` or `size="icon-sm"`

### Badges
- Use `<Badge>` from `@/components/ui/badge` for all status indicators and tags
- Tags: `variant="secondary"`
- Active filters: `variant="default"` (primary olive)
- Status indicators: use semantic color classes (`bg-success/15 text-success`, `bg-warning/15 text-warning`)

### Cards
- Use `<Card>` compound component for content sections
- Recipe cards use `Card` with hover states (`hover:bg-accent/60`)
- Detail page sections use `Card > CardContent` with section headers

### Form Elements
- Always use shadcn `Input`, `Textarea`, `Label` — never raw HTML form elements
- Group related numeric fields in a `bg-accent/50 rounded-xl p-4` container
- Use icon labels with `text-primary/70` for visual context

### Toast Notifications
- Use `sonner` via `toast()`, `toast.success()`, `toast.error()`
- Position: `bottom-center` (matches centered layout)
- Use for transient success/error feedback
- Keep auth-specific errors inline (not just toasts) when user interaction is needed

### Dialogs
- Use shadcn `Dialog` for confirmations — never `window.confirm()` or `window.alert()`
- Destructive confirmations: Cancel + destructive action button

### Loading States
- Use `<Skeleton>` for content-shaped loading placeholders
- Match skeleton layout to the real content shape (cards, text lines, metadata rows)

### Separators
- Use `<Separator>` between major content sections
- Provides clear visual hierarchy without heavy borders

## Dark Mode

- Dark mode is supported via `.dark` class on the HTML element
- All components inherit dark mode automatically through CSS variables
- Dark backgrounds use warm undertones (hue 65) — never pure black
- Primary and success colors increase chroma in dark mode for vibrancy
- Borders use translucent warm overlays (`oklch(1 0.008 75 / 12%)`)
