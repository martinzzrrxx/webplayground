# CSS Style Guide

This document explains the current CSS architecture for `src/renderer/styles.css`.
It is a maintenance guide, not a full selector reference.

## Goals

- Keep styles small, explicit, and easy to verify.
- Prefer reusable primitives over page-specific overrides.
- Separate visual primitives from business-specific layout rules.
- Favor incremental refactors backed by package builds and UI regression tests.

## Layers

### 1. Tokens

Tokens live in `:root` and define reusable visual values such as:

- colors
- borders
- shadows
- shared surfaces

Examples:

- `--line`
- `--accent`
- `--shadow`
- `--card-surface`

Use tokens before introducing new hard-coded values.

### 2. Shared Primitives

These classes define reusable visual building blocks.
They should be portable across sections of the app.

Current examples:

- `surface-card`
- `surface-card--padded`
- `surface-card--shell`
- `surface-card--compact`
- `compact-field-control`

Primitive classes describe appearance or size variants, not product meaning.

### 3. Component Rules

Component classes keep business meaning and local layout behavior.

Current examples:

- `detail-card`
- `notes-card`
- `editor-card`
- `preview-card`
- `console-card`

These classes should mainly express structure, spacing, scrolling, and component-specific behavior.
They should avoid redefining shared borders, radii, or backgrounds when a primitive already covers that need.

## State Classes

State classes are allowed when they describe UI state rather than visual identity.

Current examples:

- `is-active`
- `is-collapsed`
- `empty-state`

Rules:

- State classes may modify an existing primitive or component.
- Do not use state classes as the main styling hook for a component.

## Preferred Patterns

- Reuse a token before adding a new raw color, radius, or shadow.
- Reuse a primitive before adding a new component-specific visual rule.
- Use explicit variant classes like `compact-field-control` instead of page-context selectors when possible.
- Keep business classes for meaning and layout, not shared skinning.

## Avoid

- Deep page-context selectors for shared styling, such as `#playgroundWorkspace .search-field input`, when an explicit class can express the same intent.
- Repeating the same border, radius, background, and padding across multiple component classes.
- Mixing layout fixes, behavior changes, and visual cleanup in one patch unless explicitly approved.

## Refactor Workflow

When changing CSS:

1. Make the smallest useful refactor slice.
2. Build a fresh package.
3. Run UI regression tests.
4. Commit the verified step before moving on.

## When Adding New Styles

Use this order:

1. Can an existing token solve it?
2. Can an existing primitive or variant solve it?
3. Should a new primitive be introduced?
4. Only then add a component-specific rule.
