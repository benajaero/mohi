# Mohi Design System

## Brand Identity

Mohi is a standards-first, server-driven web framework inspired by Mohism. The visual identity reflects:

- **Frugality**: Minimal, purposeful design with no excess
- **Determinism**: Clear hierarchy, consistent patterns
- **Standards-first**: Clean, interoperable aesthetics
- **Live + Resumable**: Dynamic energy through subtle motion

## Color Palette

### Primary
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0e1116` | Page background |
| `--bg-soft` | `#141a22` | Card/panel backgrounds |
| `--bg-surface` | `#1a2230` | Elevated surfaces |
| `--ink` | `#e8eefc` | Primary text |
| `--muted` | `#9aa7bf` | Secondary text |

### Accent
| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#7cf3c2` | Primary accent (mint) — CTAs, highlights |
| `--accent-2` | `#5ab0ff` | Secondary accent (sky) — links, code |
| `--warning` | `#ffc878` | Warm accent — tags, warnings |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#263042` | Dividers, card borders |

## Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display | Space Grotesk | 700 | clamp(40px, 8vw, 72px) |
| Headings | Space Grotesk | 600 | 32px |
| Body | Space Grotesk | 400 | 16-20px |
| Code | JetBrains Mono | 400/600 | 12-14px |
| Labels | Space Grotesk | 600 | 11-13px, uppercase, letter-spaced |

## Spacing

| Token | Value |
|-------|-------|
| Section padding | 48px 24px |
| Card padding | 20px |
| Card gap | 18px |
| Max content width | 1100px |

## Components

### Cards
- Background: `rgba(20, 26, 34, 0.75)` with `backdrop-filter: blur(8px)`
- Border: 1px solid `--border`, radius 16px
- Hover: translateY(-4px), deeper shadow, border glow

### Buttons
- Primary: `--accent` background, dark text, pill shape
- Ghost: transparent, `--border` outline
- Hover: lift + shadow glow
- Active: scale(0.97)

### Panels
- Header: uppercase label + monospace badge
- Body: monospace, scrollable, max-height 300px

## Animation

### Micro-interactions
- Hover transitions: 200-300ms ease
- Card lift: 300ms ease
- Button press: 150ms ease
- Counter bump: 200ms cubic-bezier(0.34, 1.56, 0.64, 1)

### Scroll Reveals
- Trigger: IntersectionObserver at 10% threshold
- Effect: opacity 0→1, translateY(24px)→0
- Duration: 600ms ease
- Stagger: 100ms between siblings

## Assets

- **Favicon**: `docs/site/assets/favicon.svg` — "M" on dark rounded square
- **Demo**: `docs/assets/terminal-demo.svg`
- **Background**: CSS radial-gradient mesh (no images)

## Playground UI

The playground showcases Mohi's live patching with:
- Connection status indicator (live dot)
- Patch stream panel (shows actual protocol messages)
- Gradient counter display
- Branded header with logo

## Accessibility

- WCAG AAA contrast ratios
- `prefers-reduced-motion` respected
- Focus-visible outlines on interactive elements
- Semantic HTML structure
