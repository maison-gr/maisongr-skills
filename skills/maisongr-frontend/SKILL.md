---
name: maisongr-frontend
description: Maison GR method for building and changing user interfaces to a production standard. Use when creating or modifying web or mobile UI components, pages, forms, navigation, dialogs, styling or design tokens, and when reviewing UI changes for accessibility (WCAG 2.2 AA), responsive behaviour, interaction states, performance (Core Web Vitals) and visual consistency.
license: MIT
metadata:
  author: Maison GR
---

# Maison GR Frontend Engineering

## Objective

Ship interfaces that every user can operate, on every screen size, quickly, and that look deliberately designed for the product rather than assembled from defaults.

## When to use

- Building or changing components, pages, layouts, forms, navigation or dialogs.
- Changing styles, themes or design tokens.
- Reviewing a UI change.

## Method

### 1. Understand the design system

- Find the existing tokens (colour, type, spacing, radius, shadow, motion) and the component library.
- Reuse existing components before building new ones. Extend them through their existing API rather than forking them.
- Use tokens, never one-off values. A new colour or spacing value is a design decision; ask before adding one.
- State the screen's purpose and its primary action before building it.

### 2. Build with semantic HTML first

- Use native elements for their purpose: `button` for actions, `a` for navigation, `label` with every form control, `table` for tabular data.
- One `h1` per page and an ordered heading outline.
- Use ARIA only when no native element does the job, and follow the WAI-ARIA Authoring Practices pattern exactly when you do.

### 3. Cover every state

Each interactive element handles the states that apply to it:

| Category | States |
|---|---|
| Interaction | default, hover, focus-visible, active, disabled |
| Async | loading, success, error, retry |
| Data | empty, partial, full, overflow (long text, many items) |
| Forms | pristine, invalid with an announced message, submitting, submitted |

The result of every action must be visible. A button that does nothing visible for two seconds looks broken.

### 4. Make it accessible (WCAG 2.2 AA)

- Everything works with a keyboard alone, in a logical order, with a clearly visible focus indicator.
- Text contrast is at least 4.5:1 (3:1 for large text); UI component and focus indicator contrast is at least 3:1.
- Touch targets are at least 24 by 24 CSS pixels (the WCAG 2.2 minimum); aim for 44 by 44 on touch-first interfaces.
- Images have meaningful `alt` text, or empty `alt` when decorative.
- Form errors are linked to their fields and announced to assistive technology.
- Dialogs and menus move focus in, trap it while open, close on Escape, and restore focus when closed.
- Do not convey information by colour alone.
- Respect `prefers-reduced-motion`.

### 5. Make it responsive

- Design for small phones (about 360 px), large phones, tablets, laptops and wide screens. Check each; do not just shrink the desktop layout.
- No horizontal page scroll at any width. Long words, URLs and tables must not break the layout.
- Use fluid type and flexible layouts; change layout at breakpoints where the content needs it.
- Navigation, forms, tables and dialogs stay usable on a phone.

### 6. Keep it fast

- Prefer server or static rendering where the framework supports it. Keep client-side JavaScript to what interaction needs.
- Lazy-load heavy, below-the-fold components (charts, maps, 3D, editors).
- Serve images in modern formats at the right size, with explicit dimensions so nothing shifts.
- Load fonts without layout shift (`font-display`, subsetting, the framework's font loader).
- Animate only `transform` and `opacity`. Every animation should explain a change of state; remove animation that is only decoration.
- Measure with Lighthouse or Web Vitals rather than guessing. Targets: LCP under 2.5 s, INP under 200 ms, CLS under 0.1.

### 7. Run the finish gate

Look at the rendered result, at a phone width and a desktop width, not only the code. A screen can pass every check above and still look like it belongs to any product.

First write the screen's contract in a few lines. If you cannot, the design is not decided yet:

```text
User and job:        who is on this screen, and what they came to finish
First read:          the one object, status or number the eye must find first
Primary action:      the one thing the screen exists to let them do
Density:             compact, balanced or spacious, and why that suits the job
Forbidden defaults:  the generic patterns that would be wrong for this product
```

Then judge the rendered screen against it:

| Check | Hold when |
|---|---|
| Product legibility | A newcomer could not tell from the first viewport what the product is or what to do |
| Hierarchy | Visual weight follows the component library's defaults instead of the user's decision: equal cards for unequal things, the key figure below the fold |
| Pattern fit | A layout is there by habit: a hero, a card grid, a dashboard of tiles the job does not call for |
| Decoration | A gradient, shadow, glass effect, oversized radius, icon or animation explains nothing |
| Finish | Alignment, spacing rhythm, type scale or radii are inconsistent; placeholder text or default component styling remains |
| Real content | Long names, empty lists, large numbers or translated text break the layout |
| Narrow screen | The phone layout is the desktop layout stacked, hiding what the user scans for |
| Theme | Dark mode, where offered, is an inverted light theme rather than designed |

Return a verdict:

- **Pass** only when no check in the table holds, the first read and the primary action are obvious, and no forbidden default remains without a reason from the product.
- **Hold** otherwise. Each hold names what is seen, why it fails the contract, the concrete change, and the viewport or state that will prove it.

Judge by what a user can see or do. "Clean", "modern" and "premium" are not findings. Simple is not generic: do not hold a screen for being plain, and name what already works so it is not redesigned away. Changing the visual direction is the developer's decision; propose it, do not impose it.

## Constraints

- No placeholder content (lorem ipsum, stock filler images) in production code.
- Do not add a UI library, animation library or icon set without approval.
- Do not override the design system locally to fix one screen; fix or extend the shared component.
- Never remove focus outlines without a visible replacement.

## Verification

- [ ] Keyboard-only walkthrough completed; focus is always visible and logical.
- [ ] Contrast checked for text and UI components.
- [ ] Checked at phone, tablet and desktop widths with no horizontal overflow.
- [ ] Loading, empty, error and success states exist and were exercised.
- [ ] Lint, type check and the build pass; Lighthouse or Web Vitals were measured where practical.
- [ ] The finish gate was run on the rendered screen at phone and desktop widths, and every hold was resolved or reported.

## Output

What was built or changed, the states covered, the viewports and assistive paths checked, measured performance where available, the finish-gate verdict with any hold still open, and any design decisions that need the developer's review.
