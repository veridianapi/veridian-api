# DESIGN.md — Veridian Design System
> The permanent design authority for Veridian — Compliance-as-a-Service API.
> Every UI decision across landing page, dashboard, docs, billing, onboarding, and future products must reference this file.
> Last updated: April 2026

---

## 1. Visual Theme & Philosophy

**One sentence:** Veridian is compliance infrastructure — not a startup tool, not a dashboard template. It must feel like the product a $10B fintech would trust with their regulatory obligations.

**Design DNA:**
- **Trust density** from Stripe — every pixel earns its place, nothing decorative
- **Dashboard precision** from Linear — information-first, keyboard-friendly, zero clutter
- **Fintech authority** from Revolut — dark surfaces that say "we handle serious money"
- **Developer credibility** from Supabase — code is a first-class citizen
- **Platform polish** from Vercel — marketing that converts engineers, not just executives

**Atmosphere:** Dark. Precise. Authoritative. A fintech CTO should feel more confident opening a compliance report in Veridian than in a spreadsheet. The product radiates control, not friendliness.

**What Veridian is NOT:** A startup tool. A hackathon project. A template. An AI-generated SaaS. A consumer app. None of the visual language of those things belongs here.

**The test:** If a screenshot of any Veridian page appeared next to Stripe's dashboard in a side-by-side comparison, the viewer should not be able to tell which one costs more.

---

## 2. Color System

### Background Surfaces (darkest to lightest)
| Token | Hex | Role |
|---|---|---|
| `--bg-void` | `#020706` | Deepest background, used behind everything |
| `--bg-base` | `#050a09` | Page background — the canvas |
| `--bg-surface` | `#0a0f0e` | Primary cards, sidebar |
| `--bg-elevated` | `#111916` | Raised cards, panels, dropdowns |
| `--bg-overlay` | `#1a2b25` | Hover states, selected rows, borders |
| `--bg-input` | `#0d1211` | Form inputs, code blocks |

### Brand — Teal Green (use sparingly — max 10% of any screen)
| Token | Hex | Role |
|---|---|---|
| `--brand-dim` | `#0f6e56` | Subtle brand presence, icons |
| `--brand` | `#1d9e75` | Primary CTAs, active states, links |
| `--brand-bright` | `#22c55e` | Success confirmation, approved status |
| `--brand-glow` | `rgba(29,158,117,0.15)` | Hover glow, active card borders |

### Semantic Colors
| Token | Hex | Role |
|---|---|---|
| `--success` | `#16a34a` | Approved verifications, positive states |
| `--success-bg` | `rgba(22,163,74,0.12)` | Success badge backgrounds |
| `--warning` | `#d97706` | Review status, medium risk scores |
| `--warning-bg` | `rgba(217,119,6,0.12)` | Warning badge backgrounds |
| `--danger` | `#dc2626` | Rejected, high risk, errors, delete |
| `--danger-bg` | `rgba(220,38,38,0.12)` | Danger badge backgrounds |
| `--info` | `#3b82f6` | Informational, neutral status |
| `--info-bg` | `rgba(59,130,246,0.12)` | Info badge backgrounds |

### Text
| Token | Hex | Role |
|---|---|---|
| `--text-primary` | `#f0f4f3` | Headlines, important values, names |
| `--text-secondary` | `#a3b3ae` | Labels, descriptions, secondary info |
| `--text-tertiary` | `#5a7268` | Placeholders, disabled, captions |
| `--text-inverse` | `#050a09` | Text on brand-colored backgrounds |
| `--text-code` | `#a8ff78` | Code strings, API keys, identifiers |
| `--text-link` | `#1d9e75` | Clickable links |

### Borders
| Token | Value | Role |
|---|---|---|
| `--border-subtle` | `rgba(255,255,255,0.04)` | Hairline dividers |
| `--border-default` | `rgba(255,255,255,0.08)` | Card borders, input borders |
| `--border-strong` | `rgba(255,255,255,0.14)` | Active inputs, focused states |
| `--border-brand` | `rgba(29,158,117,0.40)` | Active nav items, selected states |

### Color Rules
- Brand color (`#1d9e75`) appears on maximum **10% of any screen**
- Never use pure black (`#000000`) or pure white (`#ffffff`) as backgrounds
- Risk scores: 0-29 = `--success`, 30-69 = `--warning`, 70-100 = `--danger`
- Never use color as the ONLY differentiator — always pair with an icon or label

---

## 3. Typography System

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

Inter for all UI. JetBrains Mono for all code, API keys, IDs, and verification hashes.

### Type Scale (dashboard)
| Role | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 32px / 2rem | 600 | 1.2 | Page titles, hero numbers |
| Heading 1 | 24px / 1.5rem | 600 | 1.3 | Section headers |
| Heading 2 | 18px / 1.125rem | 500 | 1.4 | Card titles, modal headers |
| Body | 14px / 0.875rem | 400 | 1.5 | Default UI text, table rows |
| Label | 13px / 0.8125rem | 500 | 1.4 | Form labels, nav items, buttons |
| Caption | 12px / 0.75rem | 400 | 1.4 | Metadata, timestamps, helper text |
| Micro | 11px / 0.6875rem | 500 | 1.3 | Badges, status pills, column headers |

### Type Scale (marketing / landing page)
| Role | Size | Weight | Usage |
|---|---|---|---|
| Hero | 64px desktop / 40px mobile | 600 | Main headline only |
| Section title | 40px desktop / 28px mobile | 600 | Section headers |
| Subheading | 20px | 400 | Supporting copy |
| Body | 16px | 400 | Paragraphs, feature descriptions |
| Small | 14px | 400 | Fine print, captions |

### Typography Rules
- **Never use font-bold (700) in the dashboard** — use font-semibold (600) maximum
- Hero headlines on marketing only use weight-600, never 700 or 800
- All uppercase text uses `letter-spacing: 0.06em` and `font-size: 11px` maximum
- API keys, verification IDs, hashes — always `font-mono`
- Numbers in metric cards — `font-variant-numeric: tabular-nums` always
- Truncate long text in tables with `text-overflow: ellipsis`, never wrap

---

## 4. Spacing & Layout Grid

### Base Unit: 4px
All spacing is a multiple of 4. No exceptions.

### Spacing Scale
| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon gaps, tight inline spacing |
| `space-2` | 8px | Between related items, icon + label |
| `space-3` | 12px | Compact list items |
| `space-4` | 16px | Standard padding, between form fields |
| `space-5` | 20px | Card internal padding (compact) |
| `space-6` | 24px | Card internal padding (default) |
| `space-8` | 32px | Section spacing, page padding |
| `space-10` | 40px | Large section gaps |
| `space-12` | 48px | Hero section spacing |
| `space-16` | 64px | Major page sections |

### Layout Structure
```
Dashboard layout:
├── Sidebar: 240px fixed width
├── Content area: calc(100vw - 240px), max-width 1200px
└── Content padding: 32px all sides

Landing page layout:
├── Max width: 1200px centered
├── Section padding: 80px vertical, 24px horizontal
└── Content columns: 12-column grid, 24px gutters
```

### Responsive Breakpoints
| Name | Width | Behavior |
|---|---|---|
| Mobile | < 640px | Single column, bottom nav, horizontal scroll tables |
| Tablet | 640px - 1024px | Sidebar hidden (hamburger), 2-col grids |
| Desktop | > 1024px | Full sidebar, multi-column layouts |
| Wide | > 1440px | Content capped at max-width, centered |

---

## 5. Component Specifications

### Buttons

**Primary (CTA)**
```
background: #1d9e75
color: #050a09
height: 36px
padding: 0 16px
border-radius: 8px
font-size: 13px
font-weight: 500
letter-spacing: 0
transition: background 150ms ease, opacity 150ms ease
hover: background #22c55e
active: background #0f6e56, scale(0.98)
disabled: opacity 0.4, cursor not-allowed
```

**Secondary (outlined)**
```
background: transparent
border: 1px solid rgba(255,255,255,0.10)
color: #a3b3ae
height: 36px
padding: 0 16px
border-radius: 8px
font-size: 13px
font-weight: 500
hover: border-color rgba(255,255,255,0.20), color #f0f4f3
active: background rgba(255,255,255,0.04)
```

**Danger**
```
background: rgba(220,38,38,0.12)
border: 1px solid rgba(220,38,38,0.25)
color: #dc2626
Same dimensions as secondary
hover: background rgba(220,38,38,0.20)
```

**Ghost (icon buttons, sidebar nav)**
```
background: transparent
color: #5a7268
height: 36px
padding: 0 12px
border-radius: 8px
hover: background rgba(255,255,255,0.04), color #a3b3ae
active state: background rgba(29,158,117,0.12), color #1d9e75, border-left: 2px solid #1d9e75
```

**Button sizing rules:**
- Minimum touch target: 44px height on mobile
- Never stack more than 2 buttons in a row
- Primary button: one per page section maximum

### Cards

**Default card**
```
background: #111916
border: 1px solid rgba(255,255,255,0.08)
border-radius: 12px
padding: 24px
```

**Metric card (KPI)**
```
Same as default card
hover: border-color rgba(29,158,117,0.30), box-shadow: 0 0 0 1px rgba(29,158,117,0.15)
transition: border-color 150ms, box-shadow 150ms
```

**Code card**
```
background: #0d1117
border: 1px solid #161b22
border-radius: 12px
padding: 20px
font-family: var(--font-mono)
font-size: 13px
```

**Alert card (callout)**
```
border-radius: 8px
padding: 12px 16px
border-left: 3px solid [semantic color]
background: [semantic-bg color]
```

### Inputs & Forms

**Text input**
```
background: #0d1211
border: 1px solid rgba(255,255,255,0.08)
border-radius: 8px
height: 36px
padding: 0 12px
font-size: 14px
color: #f0f4f3
placeholder-color: #5a7268
focus: border-color #1d9e75, outline none, box-shadow 0 0 0 3px rgba(29,158,117,0.15)
transition: border-color 150ms, box-shadow 150ms
```

**Labels**
```
font-size: 12px
font-weight: 500
color: #a3b3ae
margin-bottom: 6px
letter-spacing: 0.02em
```

**Form groups:** 20px gap between fields

**Error state:** border-color `#dc2626`, helper text in `--danger` color, 12px font-size

### Tables

**Table structure**
```
width: 100%
border-collapse: collapse
font-size: 14px

thead th:
  font-size: 11px
  font-weight: 500
  color: #5a7268
  text-transform: uppercase
  letter-spacing: 0.06em
  padding: 12px 16px
  border-bottom: 1px solid rgba(255,255,255,0.08)
  text-align: left

tbody td:
  padding: 14px 16px
  border-bottom: 1px solid rgba(255,255,255,0.04)
  color: #a3b3ae
  vertical-align: middle

tbody tr:hover:
  background: rgba(255,255,255,0.02)

tbody tr:last-child td:
  border-bottom: none
```

**Important values in tables** (IDs, names, amounts) use `color: #f0f4f3` and `font-weight: 500`

### Badges & Status Pills

```
display: inline-flex
align-items: center
padding: 2px 8px
border-radius: 9999px (pill)
font-size: 11px
font-weight: 500
letter-spacing: 0.02em

approved/success: color #16a34a, background rgba(22,163,74,0.12)
review/warning:   color #d97706, background rgba(217,119,6,0.12)
rejected/danger:  color #dc2626, background rgba(220,38,38,0.12)
pending/neutral:  color #5a7268, background rgba(255,255,255,0.06)
```

### Navigation (Sidebar)

```
width: 240px
background: #0a0f0e
border-right: 1px solid rgba(255,255,255,0.06)
padding: 16px 12px

Logo area: 56px height, padding 16px
Nav section label: font-size 10px, font-weight 600, color #5a7268, 
                   letter-spacing 0.08em, text-transform uppercase, 
                   margin: 20px 0 6px 8px

Nav item (inactive):
  height: 36px
  padding: 0 8px
  border-radius: 8px
  font-size: 13px
  font-weight: 500
  color: #5a7268
  cursor: pointer
  hover: background rgba(255,255,255,0.04), color #a3b3ae

Nav item (active):
  background: rgba(29,158,117,0.10)
  border-left: 2px solid #1d9e75
  color: #1d9e75
  padding-left: 6px

User profile area (bottom):
  border-top: 1px solid rgba(255,255,255,0.06)
  padding: 12px 0 0
  sticky bottom-0
```

### Modals & Dialogs

```
overlay: rgba(0,0,0,0.7) backdrop
modal container:
  background: #111916
  border: 1px solid rgba(255,255,255,0.10)
  border-radius: 16px
  padding: 24px
  max-width: 480px
  box-shadow: 0 20px 60px rgba(0,0,0,0.6)

Header: font-size 18px, font-weight 500, color #f0f4f3
Body: font-size 14px, color #a3b3ae, margin-top 8px
Footer: margin-top 24px, flex row, gap 8px, justify-end

Animation:
  entry: scale(0.96) opacity(0) → scale(1) opacity(1), 150ms ease-out
  exit: scale(0.96) opacity(0), 100ms ease-in
```

### Code Blocks

```
background: #0d1117
border: 1px solid #161b22
border-radius: 8px
padding: 16px 20px
font-family: var(--font-mono)
font-size: 13px
line-height: 1.6
overflow-x: auto

Syntax colors (GitHub Dark):
  keywords:    #ff7b72
  functions:   #d2a8ff
  strings:     #a8ff78
  numbers:     #79c0ff
  comments:    rgba(163,183,174,0.5)
  identifiers: #a5d6ff
  object keys: #ffa657

Copy button: top-right corner, ghost style, shows "Copied ✓" for 2s
```

---

## 6. Interaction States & Animation

### Timing Rules
| Type | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 100ms | ease | Button clicks, checkbox toggles |
| Fast | 150ms | ease | Hover states, focus rings |
| Standard | 200ms | ease-out | Modals opening, dropdowns |
| Slow | 300ms | ease-in-out | Page transitions, sidebars |
| Never | > 400ms | — | Dashboard interactions — too slow |

### What animates
- Hover: `background`, `border-color`, `color`, `box-shadow` — 150ms
- Focus rings: `box-shadow` — 150ms
- Modal entry: `opacity` + `scale` — 200ms
- Toast notifications: slide in from bottom — 200ms
- Loading skeleton: shimmer — 1500ms loop

### What NEVER animates
- Table row data (use skeleton loaders on initial load only)
- Numbers/metrics counting up (gimmicky)
- Page backgrounds
- Text color changes

### Loading States
- **Skeleton loaders** for initial data load — never spinners in content areas
- **Inline spinner** (16px) only for button loading states
- **Progress bar** at top of page for navigation (optional)
- Skeleton color: `rgba(255,255,255,0.06)`, animated shimmer

---

## 7. Data Visualization — Compliance Dashboard Rules

### Risk Score Display
```
0-29 (Low):    Large number in #16a34a, circular ring in success color
30-69 (Medium): Large number in #d97706, circular ring in warning color
70-100 (High): Large number in #dc2626, circular ring in danger color
Unknown/null:  "—" in #5a7268, no ring
```

### Progress Bars (usage meters)
```
height: 4px
background: rgba(255,255,255,0.08) (track)
border-radius: 9999px

0-79%:   fill color #1d9e75
80-99%:  fill color #d97706 (approaching limit)
100%:    fill color #dc2626 (at limit)
```

### Metric Cards (KPI)
```
Large number: 32px, font-weight 600, color #f0f4f3, tabular-nums
Label: 12px, font-weight 500, color #5a7268, uppercase, letter-spacing 0.06em
Icon: 20px, in colored circle (40px diameter), positioned top-right
Subtext: 12px, #5a7268, below number
```

### Status Breakdown
- Always show Total, Approved, Review, Rejected — in that order
- Use consistent colors — never reuse success color for a different meaning
- In tables, sort by newest first by default

---

## 8. Empty States & Onboarding

### Empty State Structure (every empty state must have all 4)
```
1. Icon: 40px, color #5a7268, centered
2. Headline: "No [items] yet" — 16px, font-weight 500, color #a3b3ae
3. Description: One sentence explaining what this section does — 14px, #5a7268
4. Action: Primary button with the first action to take
```

**Examples:**
- Verifications empty: icon=shield, "No verifications yet", "Submit your first API request to see results here.", button="View API docs"
- API Keys empty: icon=key, "No API keys yet", "Create a key to start making API requests.", button="Create API key"
- Billing empty: icon=credit-card, "No active plan", "Start your 14-day free trial — no credit card required.", button="View plans"

### First-Time Onboarding Checklist (Overview page)
Show a checklist card to new users until all steps are complete:
```
□ Create your first API key
□ Make your first verification request
□ Set up a webhook endpoint
□ Upgrade to a paid plan
```
Each step has a link. Dismiss forever when all complete. Never show again.

### Welcome state
When a customer first logs in:
- Show a "Welcome to Veridian" banner at top of Overview
- Banner contains: their API key (masked), link to quickstart docs, dismiss button
- Disappear after 7 days or first successful verification — whichever comes first

---

## 9. Dashboard vs Marketing Density

### Dashboard (tight density — Linear standard)
- Line height: 1.4-1.5
- Table row height: 44px
- Card padding: 24px
- Font size default: 14px
- Show maximum information per screen — developers are power users
- Use monospace for technical values
- No decorative illustrations in the dashboard

### Marketing / Landing Page (loose density — Vercel standard)
- Line height: 1.6-1.7
- Section padding: 80px vertical
- Font size default: 16px
- Generous whitespace — let ideas breathe
- Animations and scroll effects welcome
- Hero section: full viewport height on desktop
- Code examples prominent and functional

### Docs (medium density — Stripe standard)
- Sidebar fixed, content scrolls
- Max content width: 720px (reading optimized)
- Code blocks get full width
- Font size: 15px body, 14px code
- Plenty of white space between sections

---

## 10. Accessibility & Enterprise Trust Signals

### Accessibility
- Color contrast: minimum 4.5:1 for body text, 3:1 for large text (WCAG AA)
- Focus rings: always visible, `box-shadow: 0 0 0 3px rgba(29,158,117,0.40)`
- Never rely on color alone — always pair with icon or text label
- All interactive elements: minimum 44px touch target on mobile
- Error messages: always include text, never color-only
- Loading states: use `aria-busy`, skeleton loaders have `aria-label`

### Enterprise Trust Signals (must appear in these locations)
**Landing page footer:**
- "SOC 2 Type II in progress"
- "GDPR ready"
- "99.9% uptime SLA" (Scale plan)
- "noreply@veridianapi.com" (real domain, not Gmail)

**Login page:**
- Veridian shield logo
- "Trusted by fintech teams"
- Link to security page or trust badge

**Dashboard:**
- Status indicator in sidebar ("All systems operational" green dot)
- Last login timestamp in profile popup
- Verification results with full audit trail

**Checkout:**
- "Secured by Paddle" (already shown by Paddle)
- "Cancel anytime" near CTA
- "14 days free, no credit card required" above price

---

## 11. Anti-Patterns — Things Veridian Must NEVER Do

### Visual Anti-Patterns
- ❌ Pure black (`#000000`) backgrounds — use `#050a09`
- ❌ Pure white (`#ffffff`) text — use `#f0f4f3`
- ❌ Gradients on body text or UI labels
- ❌ More than 3 font sizes on a single screen
- ❌ Font weight 700 (bold) in the dashboard
- ❌ Rounded corners above 16px on cards (looks consumer/toy)
- ❌ Box shadows on dark surfaces (use borders instead)
- ❌ Colored backgrounds on entire pages (except status pages)
- ❌ Animations longer than 300ms on any dashboard interaction
- ❌ Counting animations on numbers
- ❌ Placeholder/fake company logos without real customer permission
- ❌ Stock photos of people
- ❌ Emoji in UI (except help center, never in dashboard)
- ❌ Multiple primary CTAs on one screen
- ❌ Centered text in paragraphs (only for hero headlines)
- ❌ All-caps body text (only for micro labels, max 11px)

### UX Anti-Patterns
- ❌ Asking for information before showing value
- ❌ Required fields without asterisk (*) indicators
- ❌ Destructive actions without confirmation dialog
- ❌ Showing raw UUIDs to users without copy button
- ❌ Pagination without showing total count
- ❌ Error messages that say "something went wrong" — always be specific
- ❌ Forms that clear on error
- ❌ Modal on top of modal
- ❌ Tooltips that appear on click (should be hover)
- ❌ Navigation that changes on different pages
- ❌ Hiding the sign out button
- ❌ Auto-refreshing data without user awareness

### Copy Anti-Patterns
- ❌ "Leverage" — use "use"
- ❌ "Seamlessly" — say what it actually does
- ❌ "World-class" — prove it with specifics
- ❌ "Easy" — developers will find out if it's not
- ❌ "Simply" — condescending
- ❌ Exclamation marks in product UI
- ❌ First person from the product ("I'll help you...")
- ❌ Passive voice in error messages ("An error was encountered")

---

## 12. Agent Prompt Guide

### Quick Color Reference
```
Page background:    #050a09
Card background:    #111916
Input background:   #0d1211
Border default:     rgba(255,255,255,0.08)
Brand green:        #1d9e75
Text primary:       #f0f4f3
Text secondary:     #a3b3ae
Text tertiary:      #5a7268
Success:            #16a34a
Warning:            #d97706
Danger:             #dc2626
```

### Agent Instructions

When building any Veridian UI, always follow these rules:

1. **Dark first** — every surface uses the color system above, never default browser whites
2. **Inter font** — always import Inter, use it for all UI text
3. **JetBrains Mono** — for all API keys, IDs, code, hashes
4. **8px grid** — all spacing is a multiple of 4 or 8
5. **Tailwind classes** — use custom CSS variables via `style` prop when Tailwind doesn't have the exact value
6. **No decorations** — no gradients on cards, no shadows on dark surfaces, no illustrations in dashboard
7. **Status colors** — always use the semantic system (success/warning/danger), never invent new colors
8. **Tables** — column headers uppercase 11px, row text 14px, IDs in monospace
9. **Empty states** — always include icon + headline + description + action button
10. **Mobile** — sidebar collapses at md breakpoint (768px), tables scroll horizontally

### Ready-to-use Prompts

**For dashboard pages:**
```
Build a [page name] dashboard page for Veridian following DESIGN.md.
Dark background #050a09, cards #111916, brand green #1d9e75.
Use Inter font, JetBrains Mono for technical values.
All spacing on 8px grid. Status badges as pills.
Include empty state with icon, headline, description, and action.
```

**For landing page sections:**
```
Build a [section] section for Veridian's marketing page.
Dark background #050a09, brand green #1d9e75.
Hero text weight-600, body weight-400 at 16px.
Generous spacing (80px vertical sections).
Framer Motion for scroll animations, max 300ms.
```

**For components:**
```
Build a [component] component for Veridian.
Follow DESIGN.md color system exactly.
Primary button: #1d9e75 background, #050a09 text, 36px height, 8px radius.
All hover states at 150ms transition.
Mobile touch targets minimum 44px.
```

---

## Appendix: Veridian Brand Identity

**Company:** Veridian — Compliance-as-a-Service API
**Domain:** veridianapi.com
**Tagline:** Compliance infrastructure for modern fintechs
**Brand color:** #1d9e75 (teal green)
**Logo:** Shield icon with V mark
**Tone:** Authoritative, precise, developer-honest. Never cute. Never vague. Always specific.
**Audience:** Fintech CTOs, compliance engineers, backend developers at Series A-C companies
**Positioning:** The compliance API that costs 95% less than Persona, works in 15 minutes, and doesn't require a sales call.

---

*This document is the permanent design authority for Veridian. All UI decisions must reference it. If a decision isn't covered here, default to the most conservative, information-dense, enterprise-appropriate choice.*

*Version 1.0 — April 2026*
