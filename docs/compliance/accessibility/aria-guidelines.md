# ARIA Implementation Guidelines

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [ARIA Roles States and Properties](#aria-roles-states-and-properties)
3. [ARIA Usage in React Components](#aria-usage-in-react-components)
4. [Common Patterns](#common-patterns)
5. [ARIA in 3D Designer](#aria-in-3d-designer)
6. [Testing with Screen Readers](#testing-with-screen-readers)
7. [Related Documentation](#related-documentation)

---

## Introduction

This document provides guidelines for implementing ARIA in KitchenXpert. ARIA enhances accessibility for dynamic content and custom UI components.

### ARIA Golden Rules

1. Use native HTML elements first
2. Do not change native semantics unless necessary
3. All interactive ARIA elements must be keyboard accessible
4. Do not use role=presentation on focusable elements
5. All interactive elements must have accessible names

---

## ARIA Roles States and Properties

### Landmark Roles

| Role | Usage |
|------|-------|
| banner | Site header |
| navigation | Navigation areas |
| main | Primary content |
| complementary | Supporting content |
| contentinfo | Footer |
| search | Search functionality |

### Widget Roles

| Role | Usage |
|------|-------|
| button | Clickable actions |
| checkbox | Toggle options |
| dialog | Modal windows |
| menu | Navigation menus |
| tab/tabpanel | Tabbed interfaces |
| slider | Range input |
| progressbar | Progress indication |

### States and Properties

| Attribute | Purpose | Values |
|-----------|---------|--------|
| aria-expanded | Expandable state | true/false |
| aria-selected | Selected state | true/false |
| aria-disabled | Disabled state | true/false |
| aria-hidden | Hidden from AT | true/false |
| aria-live | Dynamic updates | polite/assertive/off |
| aria-label | Accessible name | String |
| aria-describedby | Description reference | ID reference |
| aria-labelledby | Label reference | ID reference |

---

## ARIA Usage in React Components

### Button Component

Use native button elements. Include aria-pressed for toggle buttons, aria-disabled for disabled state.

### Form Inputs

- Use label elements with htmlFor
- Use aria-describedby for help text
- Use aria-invalid for validation errors
- Use aria-required for required fields

### Custom Components

When building custom controls (switches, sliders), include:
- Appropriate role
- Keyboard interaction
- State management via aria attributes

---

## Common Patterns

### Modal Dialogs

- role=dialog
- aria-modal=true
- aria-labelledby for title
- Focus trapped inside
- Escape to close

### Dropdown Menus

- aria-haspopup on trigger
- aria-expanded state
- role=menu on list
- role=menuitem on items

### Tabs

- role=tablist container
- role=tab on tabs
- role=tabpanel on panels
- aria-selected for active tab

### Form Validation

- role=alert for errors
- aria-live for dynamic feedback
- aria-invalid on invalid fields

### Loading States

- aria-busy during loading
- role=status for loading indicator
- aria-live for completion

### Live Regions

- aria-live=polite for non-urgent
- aria-live=assertive for urgent
- aria-atomic for full updates

---

## ARIA in 3D Designer

### Special Considerations

The 3D designer uses canvas, requiring special handling:

- role=img on canvas container
- aria-label describing the view
- Detailed description via aria-describedby
- Toolbar with labeled buttons
- Keyboard shortcuts with aria-keyshortcuts
- Selection feedback via aria-live region
- Alternative 2D view for accessibility

---

## Testing with Screen Readers

### Testing Checklist

- All interactive elements focusable
- All interactive elements have names
- Logical focus order
- Dynamic content announced
- Error messages announced
- Modal focus trapped
- Custom widgets work

### Supported Screen Readers

- NVDA (Windows)
- VoiceOver (Mac/iOS)
- JAWS (Windows)
- TalkBack (Android)

---

## Related Documentation

- [WCAG Compliance](./wcag-compliance.md)
- [Keyboard Navigation](./keyboard-navigation.md)
- [Screen Reader Support](./screen-readers.md)

---

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Accessibility Officer |
| Last Reviewed | 2026-01-10 |
| Version | 2.0 |

---

*For accessibility questions, contact accessibility@kitchenxpert.com.*
