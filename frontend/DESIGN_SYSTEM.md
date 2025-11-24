# CTO Dashboard v2.0 - Design System

## Visual Design Language

### Design Principles

1. **Clean & Professional**: Founder-grade interface with attention to detail
2. **Consistent**: Unified design language across all components
3. **Responsive**: Mobile-first approach with fluid layouts
4. **Accessible**: WCAG 2.1 AA compliant
5. **Performant**: Optimized for speed and efficiency

## Color System

### Primary Colors

```
Blue (Primary)
- 50:  #eff6ff
- 100: #dbeafe
- 500: #3b82f6 (Primary)
- 600: #2563eb
- 700: #1d4ed8

Green (Success)
- 50:  #f0fdf4
- 100: #dcfce7
- 500: #22c55e
- 600: #16a34a

Red (Error/Destructive)
- 50:  #fef2f2
- 100: #fee2e2
- 500: #ef4444
- 600: #dc2626

Yellow (Warning)
- 50:  #fefce8
- 100: #fef3c7
- 500: #eab308
- 600: #ca8a04

Gray (Neutral)
- 50:  #f9fafb
- 100: #f3f4f6
- 200: #e5e7eb
- 300: #d1d5db
- 600: #4b5563
- 700: #374151
- 900: #111827
```

### Status Color Mapping

**Project Status:**
- Active → Green (Ready for clients)
- Shipped → Teal (Live in production)
- In Progress → Blue (Under development)
- Planning → Purple (Early stage)
- Deferred → Gray (On hold)
- Cancelled → Red (Discontinued)

**Severity Levels:**
- Critical → Red (#dc2626)
- High → Orange (#f97316)
- Medium → Yellow (#eab308)
- Low → Green (#22c55e)

## Typography

### Font Family
- System Font Stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif

### Font Sizes
```
text-xs    → 12px (0.75rem)   // Metadata, helper text
text-sm    → 14px (0.875rem)  // Body text, descriptions
text-base  → 16px (1rem)      // Default body
text-lg    → 18px (1.125rem)  // Card titles
text-xl    → 20px (1.25rem)   // Section headings
text-2xl   → 24px (1.5rem)    // Page titles
text-3xl   → 30px (1.875rem)  // Hero headings
```

### Font Weights
```
font-normal   → 400  // Regular text
font-medium   → 500  // Labels, emphasis
font-semibold → 600  // Subheadings
font-bold     → 700  // Headings, buttons
```

### Line Heights
```
leading-none    → 1      // Tight headings
leading-tight   → 1.25   // Card titles
leading-snug    → 1.375  // Default
leading-normal  → 1.5    // Body text
leading-relaxed → 1.625  // Long-form content
```

## Spacing Scale

Based on 4px base unit:

```
0.5 → 2px   (0.125rem)
1   → 4px   (0.25rem)
2   → 8px   (0.5rem)
3   → 12px  (0.75rem)
4   → 16px  (1rem)     ← Most common
6   → 24px  (1.5rem)   ← Section spacing
8   → 32px  (2rem)
12  → 48px  (3rem)
16  → 64px  (4rem)
```

### Common Spacing Patterns

**Component Internal Spacing:**
- Button padding: px-4 py-2 (16px × 8px)
- Card padding: p-6 (24px all sides)
- Input padding: px-3 py-2 (12px × 8px)
- Badge padding: px-2.5 py-0.5 (10px × 2px)

**Layout Spacing:**
- Stack items: space-y-4 (16px vertical gap)
- Grid gap: gap-4 (16px)
- Section gap: space-y-6 (24px)
- Page container: px-4 py-8 (16px × 32px)

## Border Radius

```
rounded-sm   → 2px   // Subtle elements
rounded      → 4px   // Default
rounded-lg   → 8px   // Cards, buttons
rounded-xl   → 12px  // Large cards
rounded-full → 9999px // Pills, badges, avatars
```

## Shadows

```
shadow-sm → 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow    → 0 1px 3px 0 rgb(0 0 0 / 0.1)
shadow-md → 0 4px 6px -1px rgb(0 0 0 / 0.1)
shadow-lg → 0 10px 15px -3px rgb(0 0 0 / 0.1)
```

**Usage:**
- Cards: shadow-sm (subtle)
- Hover cards: shadow-lg (lifted)
- Modals: shadow-lg
- Dropdowns: shadow-md

## Component Patterns

### Buttons

**Primary Button (Default Action):**
```jsx
<Button variant="default">
  Save Changes
</Button>
```
- Blue background (#3b82f6)
- White text
- 10px height, 16px horizontal padding
- Rounded corners (8px)
- Hover: Darker blue (#2563eb)

**Destructive Button (Dangerous Actions):**
```jsx
<Button variant="destructive">
  Delete Project
</Button>
```
- Red background (#ef4444)
- White text
- Use sparingly for delete/remove actions

**Outline Button (Secondary Actions):**
```jsx
<Button variant="outline">
  Cancel
</Button>
```
- White background
- Gray border
- Gray text
- Hover: Light gray background

### Cards

**Standard Card:**
```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

**Card Hover Effect:**
- Default: shadow-sm
- Hover: shadow-lg + translate-y-1 (lift effect)
- Transition: 300ms ease

### Forms

**Form Field Structure:**
```jsx
<FormField label="Field Name" required error={error}>
  <Input
    value={value}
    onChange={handleChange}
    placeholder="Enter value"
  />
</FormField>
```

**Validation States:**
- Default: Gray border (#d1d5db)
- Focus: Blue ring (#3b82f6)
- Error: Red border + red ring (#ef4444)
- Disabled: 50% opacity, no interaction

### Tables

**Table Structure:**
- Header: Light gray background (#f9fafb)
- Rows: White background, hover → light gray
- Borders: Light gray (#e5e7eb)
- Cell padding: px-4 py-3

**Sortable Columns:**
- Cursor: pointer
- Hover: Slightly darker background
- Sort indicator: ↑ (asc) ↓ (desc) ↕ (unsorted)

### Badges

**Status Badges:**
```jsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="error">Cancelled</Badge>
```

**Badge Anatomy:**
- Small text (12px)
- Medium weight (500)
- Rounded full corners
- Subtle border
- Contrasting background/text

## Animations & Transitions

### Transition Timing

```
Fast:     150ms - Micro-interactions (hover, focus)
Default:  200ms - Standard interactions (buttons, links)
Slow:     300ms - Complex animations (modals, cards)
```

### Easing Functions

```
ease-in     → Accelerate (subtle starts)
ease-out    → Decelerate (smooth endings) ← Most common
ease-in-out → Both (balanced)
```

### Common Animations

**Fade In:**
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Zoom In:**
```css
@keyframes zoom-in-95 {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Slide Up:**
```css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Component Animation Guidelines

**Modal Dialogs:**
- Backdrop: Fade in (200ms)
- Content: Zoom in + fade (200ms)
- Exit: Reverse animation

**Cards:**
- Hover lift: translate-y-1 (300ms ease)
- Shadow change: 300ms ease

**Buttons:**
- Hover state: 150ms ease
- Active state: Instant
- Loading spinner: Continuous rotation

## Responsive Breakpoints

```
sm  → 640px   // Tablet
md  → 768px   // Small laptop
lg  → 1024px  // Desktop
xl  → 1280px  // Large desktop
2xl → 1536px  // Extra large
```

### Layout Patterns

**Mobile (<640px):**
- Single column
- Full-width cards
- Stacked buttons
- Simplified navigation

**Tablet (640-1024px):**
- 2 columns for cards
- Side-by-side buttons
- Condensed spacing

**Desktop (>1024px):**
- 3-4 columns for cards
- Full feature set
- Optimal spacing

## Accessibility Guidelines

### Color Contrast
- Text on background: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Clear focus indicators

### Focus States
- Blue ring: ring-2 ring-blue-500
- Offset: ring-offset-2
- Always visible, never removed

### Keyboard Navigation
- Tab order follows visual order
- Enter/Space for buttons
- Escape to close modals
- Arrow keys for lists

### Screen Readers
- Semantic HTML (button, nav, main, etc.)
- ARIA labels for icons
- Alt text for images
- Form labels properly associated

## Icon System

Using inline SVG icons for optimal performance and styling flexibility.

### Icon Sizes
```
sm → 16px (w-4 h-4)
md → 20px (w-5 h-5) ← Default
lg → 24px (w-6 h-6)
```

### Common Icons
- Add: Plus (+)
- Edit: Pencil
- Delete: Trash
- View: Eye
- Search: Magnifying glass
- Sort: Arrows up/down
- Close: X
- Success: Check
- Error: X in circle
- Warning: Exclamation
- Info: i in circle

## Loading States

### Spinners
- Size: 16-24px typically
- Color: Matches context (blue for primary, white for dark buttons)
- Animation: Continuous rotation

### Skeleton Screens
- Gray background (#f3f4f6)
- Pulse animation
- Match content structure
- Better UX than spinners for page loads

### Progress Indicators
- Linear bars for file uploads
- Percentage for long operations
- Indeterminate for unknown duration

## Empty States

### Pattern
```jsx
<div className="text-center py-12">
  <Icon /> {/* Large icon (48px) */}
  <h3>No projects yet</h3>
  <p>Get started by creating your first project</p>
  <Button>Add Project</Button>
</div>
```

**Guidelines:**
- Clear icon representing content type
- Descriptive message
- Call-to-action button
- Friendly, encouraging tone

## Error States

### Error Message Pattern
```jsx
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <div className="flex items-center gap-3">
    <ErrorIcon />
    <div>
      <p className="font-medium text-red-900">Error title</p>
      <p className="text-sm text-red-700">Error description</p>
    </div>
    <Button variant="outline">Retry</Button>
  </div>
</div>
```

**Types:**
- Validation errors: Inline below fields
- API errors: Toast or banner
- Fatal errors: Full-page error state

## Best Practices

### Do's
- Use consistent spacing (4px base unit)
- Maintain color contrast ratios
- Provide clear feedback for all actions
- Use loading states for async operations
- Show empty states, not blank pages
- Make errors actionable
- Keep navigation visible and accessible
- Use hover effects to indicate interactivity

### Don'ts
- Don't use too many colors
- Don't make users guess what's clickable
- Don't hide important actions
- Don't forget mobile users
- Don't remove focus indicators
- Don't use tiny touch targets on mobile
- Don't use cryptic error messages
- Don't auto-focus on page load (accessibility)

## Component Checklist

When creating new components, ensure:
- [ ] Responsive on all screen sizes
- [ ] Keyboard navigable
- [ ] Clear focus indicators
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Empty states provided
- [ ] Proper color contrast
- [ ] Smooth transitions
- [ ] Consistent spacing
- [ ] Semantic HTML
- [ ] ARIA labels where needed
- [ ] Works without JavaScript (progressive enhancement)

## Resources

- Tailwind CSS Documentation: https://tailwindcss.com/docs
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Color Contrast Checker: https://webaim.org/resources/contrastchecker/
- React Documentation: https://react.dev/

---

**Version:** 2.0
**Last Updated:** November 2024
**Maintained by:** CTO Dashboard Team
