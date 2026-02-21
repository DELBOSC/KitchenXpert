# Screen Reader Support

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Supported Screen Readers](#supported-screen-readers)
3. [Testing Protocols](#testing-protocols)
4. [Component Compatibility](#component-compatibility)
5. [Content Structure](#content-structure)
6. [Dynamic Content](#dynamic-content)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Developer Guidelines](#developer-guidelines)
9. [Related Documentation](#related-documentation)

---

## Introduction

This document provides guidelines for ensuring KitchenXpert is fully accessible to screen reader users. Screen readers convert digital content into speech or braille, enabling users who are blind or have low vision to navigate and interact with our platform.

### Our Commitment

KitchenXpert is committed to providing an equivalent experience for screen reader users, including:
- All content accessible via screen reader
- All functionality operable via screen reader commands
- Clear, meaningful announcements for all interactions
- Proper structure and navigation landmarks

---

## Supported Screen Readers

### Primary Support (Tested Monthly)

| Screen Reader | Platform | Browser |
|---------------|----------|---------|
| NVDA | Windows | Chrome, Firefox, Edge |
| JAWS | Windows | Chrome, Edge |
| VoiceOver | macOS | Safari, Chrome |
| VoiceOver | iOS | Safari |

### Secondary Support (Tested Quarterly)

| Screen Reader | Platform | Browser |
|---------------|----------|---------|
| TalkBack | Android | Chrome |
| Narrator | Windows | Edge |
| Orca | Linux | Firefox |

---

## Testing Protocols

### Monthly Testing Checklist

**Core User Flows**:
- Account registration and login
- Product browsing and search
- Adding items to cart
- Checkout process
- Account settings management
- Design tool basic operations

**Navigation**:
- Landmark navigation (header, nav, main, footer)
- Heading navigation (h1-h6 hierarchy)
- Link list navigation
- Form element navigation
- Table navigation

**Interactions**:
- Button activation and feedback
- Form submission and validation
- Modal dialog handling
- Menu navigation
- Tab panel switching

---

## Component Compatibility

### Buttons

**Requirements**:
- Announce button label
- Announce button role
- Announce pressed state (toggle buttons)
- Announce disabled state

**Implementation**:
- Use native button element
- Add aria-pressed for toggle buttons
- Add aria-disabled for disabled state
- Provide descriptive text

### Forms

**Requirements**:
- Labels announced with inputs
- Required fields identified
- Error messages announced
- Help text available

**Implementation**:
- Associate labels with htmlFor
- Use aria-required for required fields
- Use aria-invalid and aria-describedby for errors
- Use aria-describedby for help text

### Modals and Dialogs

**Requirements**:
- Dialog opening announced
- Focus moved to dialog
- Content accessible
- Close action announced

**Implementation**:
- Use role="dialog"
- Add aria-modal="true"
- Use aria-labelledby for title
- Trap focus within dialog
- Return focus on close

### Tables

**Requirements**:
- Table structure announced
- Headers associated with cells
- Caption provided
- Navigation by row/column

**Implementation**:
- Use semantic table elements
- Add scope to header cells
- Provide caption element
- Use aria-describedby for complex tables

---

## Content Structure

### Heading Hierarchy

| Level | Usage |
|-------|-------|
| h1 | Page title (one per page) |
| h2 | Major sections |
| h3 | Subsections |
| h4 | Sub-subsections |
| h5-h6 | Rarely needed |

**Rules**:
- Never skip heading levels
- One h1 per page
- Headings describe content
- Headings are not used for styling

### Landmarks

| Landmark | Element | Purpose |
|----------|---------|---------|
| banner | header | Site header |
| navigation | nav | Navigation areas |
| main | main | Primary content |
| complementary | aside | Supporting content |
| contentinfo | footer | Site footer |
| search | form | Search functionality |

### Lists

| Type | Usage |
|------|-------|
| ul | Unordered lists |
| ol | Ordered/numbered lists |
| dl | Definition lists |

---

## Dynamic Content

### Live Regions

| Value | Usage |
|-------|-------|
| polite | Non-urgent updates (wait for pause) |
| assertive | Urgent updates (interrupt immediately) |
| off | No announcement |

**Common Use Cases**:
- Form validation messages
- Loading status updates
- Search results count
- Cart updates
- Notifications

### Loading States

**Requirements**:
- Announce loading start
- Indicate progress if possible
- Announce loading complete
- Announce errors

### Form Validation

**Requirements**:
- Errors announced immediately
- Error summary at form top
- Individual field errors
- Focus moved to first error

---

## Common Issues and Solutions

### Issue: Content Not Announced

**Symptoms**:
- Screen reader skips content
- Dynamic updates not read

**Solutions**:
- Check for aria-hidden="true"
- Verify display:none not used inappropriately
- Add aria-live for dynamic content
- Ensure proper DOM order

### Issue: Unlabeled Elements

**Symptoms**:
- "Button" or "link" announced without context
- Form fields announced without labels

**Solutions**:
- Add aria-label or aria-labelledby
- Associate labels with inputs
- Add alt text to images
- Use descriptive text

### Issue: Focus Problems

**Symptoms**:
- Focus lost after action
- Focus trapped unexpectedly
- Focus order illogical

**Solutions**:
- Manage focus programmatically
- Add escape mechanism for modals
- Fix DOM order to match visual order
- Use tabindex appropriately

---

## Developer Guidelines

### Best Practices

- Use semantic HTML first
- Test with actual screen readers
- Provide text alternatives for all non-text content
- Ensure all functionality is keyboard accessible
- Use ARIA only when necessary
- Keep announcements concise
- Maintain consistent patterns

### Common Mistakes to Avoid

- Using ARIA to fix bad HTML
- Using aria-label on generic containers
- Removing focus indicators
- Relying on color alone
- Using positive tabindex values
- Hiding content that should be accessible
- Creating keyboard traps

### Code Review Checklist

- All images have alt text
- Form fields have associated labels
- Buttons have accessible names
- Links have descriptive text
- Headings follow hierarchy
- Landmarks are used appropriately
- Dynamic content uses aria-live
- Focus is managed correctly
- ARIA roles and states are correct
- Tested with at least one screen reader

### Resources

**Testing Tools**:
- NVDA (free): https://www.nvaccess.org/
- VoiceOver (built into macOS/iOS)
- JAWS (commercial): https://www.freedomscientific.com/
- axe DevTools browser extension

---

## Related Documentation

- [WCAG Compliance](./wcag-compliance.md)
- [ARIA Guidelines](./aria-guidelines.md)
- [Keyboard Navigation](./keyboard-navigation.md)
- [Component Development](../../development/components.md)

---

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Accessibility Officer |
| Last Reviewed | 2026-01-10 |
| Version | 2.0 |

---

*For accessibility questions, contact accessibility@kitchenxpert.com.*
