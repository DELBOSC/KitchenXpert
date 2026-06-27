# Keyboard Navigation Guidelines

**Last Updated:** 2026-01-10

## Table of Contents

1. [Introduction](#introduction)
2. [Navigation Principles](#navigation-principles)
3. [Focus Management](#focus-management)
4. [Keyboard Shortcuts](#keyboard-shortcuts)
5. [Component-Specific Navigation](#component-specific-navigation)
6. [Skip Links](#skip-links)
7. [Focus Indicators](#focus-indicators)
8. [Testing Keyboard Navigation](#testing-keyboard-navigation)
9. [Related Documentation](#related-documentation)

---

## Introduction

This document provides guidelines for implementing keyboard navigation in
KitchenXpert. All interactive elements must be accessible via keyboard for users
who cannot use a mouse.

### Why Keyboard Navigation Matters

- Essential for users with motor disabilities
- Required for screen reader users
- Improves efficiency for power users
- Required for WCAG 2.1 compliance

---

## Navigation Principles

### Tab Order

Elements should be navigable in a logical order that follows the visual flow of
the page.

| Principle               | Implementation                       |
| ----------------------- | ------------------------------------ |
| Logical sequence        | DOM order matches visual order       |
| No tabindex > 0         | Avoid positive tabindex values       |
| Skip decorative         | tabindex=-1 for non-interactive      |
| Include all interactive | All buttons, links, inputs focusable |

### Focus Management

| Scenario      | Action                       |
| ------------- | ---------------------------- |
| Modal opens   | Focus moves to modal         |
| Modal closes  | Focus returns to trigger     |
| Content loads | Focus moves to new content   |
| Error occurs  | Focus moves to error message |

---

## Focus Management

### Focus Trapping

When modals or dialogs are open, focus must be trapped within them.

**Implementation Requirements**:

- First focusable element receives focus on open
- Tab from last element goes to first element
- Shift+Tab from first element goes to last element
- Escape key closes modal and returns focus

### Focus Restoration

When temporary UI elements close, focus must return to the trigger element.

**Scenarios**:

- Modal dialogs
- Dropdown menus
- Tooltips and popovers
- Slide-out panels

### Programmatic Focus

Use programmatic focus sparingly and only when:

- User action triggers context change
- Error needs immediate attention
- New content appears that requires interaction

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action             |
| -------- | ------------------ |
| Alt + H  | Go to Home         |
| Alt + S  | Focus Search       |
| Alt + M  | Open Main Menu     |
| Alt + A  | Go to Account      |
| Alt + ?  | Show Keyboard Help |

### Design Tool Shortcuts

| Shortcut      | Action                    |
| ------------- | ------------------------- |
| Arrow Keys    | Move selected object      |
| Shift + Arrow | Move in larger increments |
| Delete        | Delete selected object    |
| Ctrl + Z      | Undo                      |
| Ctrl + Y      | Redo                      |
| Ctrl + C      | Copy                      |
| Ctrl + V      | Paste                     |
| Ctrl + A      | Select All                |
| Escape        | Deselect / Cancel         |
| Enter         | Confirm / Edit            |
| Space         | Toggle selection          |
| + / -         | Zoom in/out               |
| 0             | Reset zoom                |
| R             | Rotate selected           |
| G             | Toggle grid               |
| L             | Toggle layers panel       |

### Form Shortcuts

| Shortcut      | Action                         |
| ------------- | ------------------------------ |
| Tab           | Next field                     |
| Shift + Tab   | Previous field                 |
| Enter         | Submit (in single-line inputs) |
| Escape        | Cancel / Close                 |
| Space         | Toggle checkbox/radio          |
| Arrow Up/Down | Navigate select options        |

### Shortcut Discovery

**Keyboard Help Dialog**:

- Accessible via Alt + ? or Help menu
- Grouped by context (Global, Design, Forms)
- Searchable
- Printable reference

---

## Component-Specific Navigation

### Buttons

| Key   | Action          |
| ----- | --------------- |
| Tab   | Focus button    |
| Enter | Activate button |
| Space | Activate button |

### Links

| Key   | Action      |
| ----- | ----------- |
| Tab   | Focus link  |
| Enter | Follow link |

### Checkboxes and Radio Buttons

| Key           | Action                         |
| ------------- | ------------------------------ |
| Tab           | Focus checkbox/radio group     |
| Space         | Toggle checkbox / Select radio |
| Arrow Up/Down | Navigate radio group           |

### Dropdown/Select

| Key            | Action                  |
| -------------- | ----------------------- |
| Tab            | Focus dropdown          |
| Enter/Space    | Open dropdown           |
| Arrow Up/Down  | Navigate options        |
| Enter          | Select option           |
| Escape         | Close dropdown          |
| Home/End       | First/Last option       |
| Type character | Jump to matching option |

### Tabs

| Key              | Action         |
| ---------------- | -------------- |
| Tab              | Focus tab list |
| Arrow Left/Right | Navigate tabs  |
| Enter/Space      | Activate tab   |
| Home             | First tab      |
| End              | Last tab       |

### Menus

| Key         | Action                      |
| ----------- | --------------------------- |
| Tab         | Focus menu trigger          |
| Enter/Space | Open menu                   |
| Arrow Down  | First menu item / Next item |
| Arrow Up    | Previous item               |
| Arrow Right | Open submenu                |
| Arrow Left  | Close submenu               |
| Escape      | Close menu                  |
| Home/End    | First/Last item             |

### Modals

| Key    | Action                      |
| ------ | --------------------------- |
| Tab    | Navigate within modal       |
| Escape | Close modal                 |
| Enter  | Confirm (on confirm button) |

### Sliders

| Key             | Action          |
| --------------- | --------------- |
| Tab             | Focus slider    |
| Arrow Left/Down | Decrease value  |
| Arrow Right/Up  | Increase value  |
| Home            | Minimum value   |
| End             | Maximum value   |
| Page Up/Down    | Large increment |

### Data Tables

| Key         | Action                       |
| ----------- | ---------------------------- |
| Tab         | Focus table / Navigate cells |
| Arrow Keys  | Navigate cells               |
| Enter       | Activate cell / Edit         |
| Escape      | Cancel edit                  |
| Ctrl + Home | First cell                   |
| Ctrl + End  | Last cell                    |

### Accordion

| Key           | Action                  |
| ------------- | ----------------------- |
| Tab           | Focus accordion header  |
| Enter/Space   | Expand/Collapse section |
| Arrow Up/Down | Navigate headers        |
| Home/End      | First/Last header       |

---

## Skip Links

### Implementation

Skip links allow keyboard users to bypass repetitive navigation.

**Required Skip Links**:

- Skip to main content
- Skip to navigation
- Skip to search
- Skip to footer

**Visibility**:

- Hidden by default
- Visible on focus
- High contrast styling
- Clear labeling

### Skip Link Targets

| Skip Link            | Target ID     |
| -------------------- | ------------- |
| Skip to main content | #main-content |
| Skip to navigation   | #main-nav     |
| Skip to search       | #search-input |
| Skip to footer       | #footer       |

---

## Focus Indicators

### Requirements

All focusable elements must have visible focus indicators that:

- Are visible against all backgrounds
- Have sufficient contrast (3:1 minimum)
- Are not removed or hidden
- Are distinct from hover states

### Styling Guidelines

| State         | Visual Treatment              |
| ------------- | ----------------------------- |
| Focus         | 2px solid outline, offset 2px |
| Focus-visible | Same as focus (keyboard only) |
| Focus within  | Subtle container highlight    |

### Focus Indicator Colors

| Theme         | Focus Color | Background  |
| ------------- | ----------- | ----------- |
| Light         | #0066CC     | White/Light |
| Dark          | #66B3FF     | Dark        |
| High Contrast | #FFFF00     | Black       |

### Custom Focus Styles

When customizing focus styles:

- Never use outline: none without alternative
- Ensure 3:1 contrast ratio
- Test in all color modes
- Consider high contrast mode

---

## Testing Keyboard Navigation

### Manual Testing Checklist

**Basic Navigation**:

- All interactive elements reachable via Tab
- Tab order follows logical visual flow
- No keyboard traps
- Focus visible at all times
- Skip links work correctly

**Interactive Elements**:

- Buttons activated with Enter and Space
- Links activated with Enter
- Form controls properly navigable
- Menus fully keyboard accessible
- Modals trap focus correctly

**Focus Management**:

- Focus moves to modals when opened
- Focus returns when modals close
- Focus moves to error messages
- Focus moves to new content when loaded

**Shortcuts**:

- Global shortcuts work
- Context-specific shortcuts work
- Shortcuts do not conflict with browser/AT
- Help dialog accessible

### Testing Tools

| Tool                   | Purpose                         |
| ---------------------- | ------------------------------- |
| Tab key                | Basic navigation testing        |
| Browser DevTools       | Focus order inspection          |
| axe DevTools           | Automated accessibility testing |
| Accessibility Insights | Focus order visualization       |

### Common Issues

| Issue                   | Solution                             |
| ----------------------- | ------------------------------------ |
| Element not focusable   | Add tabindex=0 or use native element |
| Wrong tab order         | Fix DOM order or use tabindex        |
| Missing focus indicator | Add :focus styles                    |
| Keyboard trap           | Add escape mechanism                 |
| Focus lost              | Manage focus programmatically        |

---

## Related Documentation

- [WCAG Compliance](./wcag-compliance.md)
- [ARIA Guidelines](./aria-guidelines.md)
- [Screen Reader Support](./screen-readers.md)
- [Component Library](../../development/components.md)

---

## Document Control

| Property       | Value                 |
| -------------- | --------------------- |
| Document Owner | Accessibility Officer |
| Last Reviewed  | 2026-01-10            |
| Version        | 2.0                   |

---

_For accessibility questions, contact accessibility@kitchenxpert.com._
