# CTO Dashboard v2.0 - UI Components Documentation

## Overview

This documentation covers the production-grade UI components built for the CTO Dashboard v2.0 with full CRUD operations for projects management.

## Component Architecture

### Base UI Components (in `src/components/ui/`)

#### Button (`Button.jsx`)
Professional button component with multiple variants and states.

**Variants:**
- `default` - Primary blue button
- `destructive` - Red button for dangerous actions
- `outline` - Outlined button
- `secondary` - Gray button
- `ghost` - Transparent button
- `link` - Link-styled button

**Sizes:**
- `default` - Standard size (h-10)
- `sm` - Small size (h-9)
- `lg` - Large size (h-11)
- `icon` - Square icon button (10x10)

**Props:**
- `loading` - Shows spinner and "Loading..." text
- `disabled` - Disables the button
- `variant` - Button style variant
- `size` - Button size

**Example:**
```jsx
import { Button } from './components/ui/Button';

<Button variant="default" size="lg" onClick={handleClick}>
  Save Changes
</Button>

<Button variant="destructive" loading={isDeleting}>
  Delete Project
</Button>
```

#### Card Components (`Card.jsx`)
Beautiful card layouts for content display.

**Components:**
- `Card` - Main card container
- `CardHeader` - Card header section
- `CardTitle` - Card title (h3)
- `CardDescription` - Card description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Example:**
```jsx
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Project Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your content here</p>
  </CardContent>
</Card>
```

#### Dialog Components (`Dialog.jsx`)
Modal dialog system for forms and confirmations.

**Components:**
- `Dialog` - Dialog wrapper (manages open/close state)
- `DialogContent` - Dialog content container with backdrop
- `DialogHeader` - Header section
- `DialogTitle` - Dialog title
- `DialogDescription` - Dialog description
- `DialogFooter` - Footer with actions

**Features:**
- Auto-locks body scroll when open
- Click backdrop to close
- Built-in close button
- Smooth animations

**Example:**
```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/Dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent onClose={() => setIsOpen(false)}>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="destructive">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Form Components (`Input.jsx`)
Form inputs with validation states.

**Components:**
- `Input` - Text input field
- `Textarea` - Multi-line text input
- `Select` - Dropdown select
- `Label` - Form label
- `FormField` - Complete field with label and error

**Props:**
- `error` - Shows error state and styling
- `required` - Adds asterisk to label

**Example:**
```jsx
import { Input, FormField } from './components/ui/Input';

<FormField label="Project Name" required error={errors.name}>
  <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Enter project name"
    error={errors.name}
  />
</FormField>
```

#### Badge (`Badge.jsx`)
Status badges and labels.

**Variants:**
- `default` - Blue badge
- `success` - Green badge
- `warning` - Yellow badge
- `error` - Red badge
- `secondary` - Gray badge
- `outline` - Outlined badge

**Example:**
```jsx
import { Badge } from './components/ui/Badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning">In Progress</Badge>
```

#### Table Components (`Table.jsx`)
Data table with sorting support.

**Components:**
- `Table` - Table wrapper with overflow handling
- `TableHeader` - Table header (thead)
- `TableBody` - Table body (tbody)
- `TableRow` - Table row with hover effects
- `TableHead` - Header cell with optional sorting
- `TableCell` - Data cell

**Example:**
```jsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/Table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead sortable sorted="asc" onClick={() => handleSort('name')}>
        Name
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Project Name</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Project Management Components

#### ProjectsView (`ProjectsView.jsx`)
Main view component that orchestrates all project management features.

**Features:**
- Toggle between table and card views
- Add new projects
- Edit existing projects
- Delete projects with confirmation
- Real-time project statistics
- Error handling and retry logic
- Loading states
- Empty states

**Usage:**
```jsx
import { ProjectsView } from './components/ProjectsView';

function App() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectsView />
    </div>
  );
}
```

#### ProjectsTable (`ProjectsTable.jsx`)
Full-featured data table with advanced functionality.

**Features:**
- Search by name and description
- Filter by status and language
- Sortable columns (name, language, stars, status)
- Bulk selection with checkboxes
- Bulk delete action
- Pagination (50 items per page)
- Row actions (Edit, Delete)
- Loading skeletons
- Empty state

**Props:**
- `projects` - Array of project objects
- `onEdit` - Callback for edit action
- `onDelete` - Callback for delete action
- `loading` - Loading state

**Example:**
```jsx
<ProjectsTable
  projects={projects}
  onEdit={(project) => handleEdit(project)}
  onDelete={(id) => handleDelete(id)}
  loading={isLoading}
/>
```

#### ProjectCard (`ProjectCard.jsx`)
Beautiful card view for portfolio display.

**Features:**
- Thumbnail/hero display
- Project name and description
- Language badge with colored dot
- Star count with icon
- Status badge
- Tags (shows first 4, +N more)
- GitHub and demo links
- Hover effects with lift animation
- Edit and delete actions

**Props:**
- `project` - Project object
- `onEdit` - Edit callback
- `onDelete` - Delete callback

**Example:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {projects.map(project => (
    <ProjectCard
      key={project.id}
      project={project}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ))}
</div>
```

#### AddProjectModal (`AddProjectModal.jsx`)
Modal form for creating new projects.

**Features:**
- Complete form validation
- Real-time error display
- Client-side validation rules
- Success/error messages
- Character count for description
- Tag parsing (comma-separated)
- URL validation
- Loading state

**Props:**
- `open` - Controls modal visibility
- `onClose` - Close callback
- `onSuccess` - Success callback with new project data

**Validation Rules:**
- Name: Required, 2-100 characters
- Description: Max 500 characters
- URLs: Valid URL format
- Stars: Positive number

#### EditProjectModal (`EditProjectModal.jsx`)
Modal form for editing existing projects.

**Features:**
- Pre-filled form with existing data
- Same validation as AddProjectModal
- Updates project via PUT API
- Success feedback

**Props:**
- `open` - Controls modal visibility
- `onClose` - Close callback
- `project` - Project object to edit
- `onSuccess` - Success callback with updated project data

#### DeleteConfirmDialog (`DeleteConfirmDialog.jsx`)
Confirmation dialog for project deletion.

**Features:**
- Shows project details
- Warning message with consequences
- Error handling
- Loading state during deletion
- Cannot close while deleting

**Props:**
- `open` - Controls dialog visibility
- `onClose` - Close callback
- `project` - Project to delete
- `onSuccess` - Success callback with deleted project ID

## Utility Functions (`src/lib/utils.js`)

### Helper Functions

```javascript
import { cn, formatCurrency, formatNumber, validateField } from '../lib/utils';

// Merge class names
cn('base-class', condition && 'conditional-class', className)

// Format currency
formatCurrency(1500000) // "$1,500,000"
formatCurrency(1500000, 2) // "$1,500,000.00"

// Format numbers with k/M/B suffix
formatNumber(1500) // "1.5k"
formatNumber(1500000) // "1.5M"
formatNumber(2500000000) // "2.5B"

// Format dates
formatDate('2024-01-15') // "Jan 15, 2024"

// Validate form fields
validateField(value, { required: true, minLength: 2 })
validateField(url, { url: true })

// Get status colors
getStatusColor('active') // "bg-green-100 text-green-800 border-green-300"

// Extract API error messages
getErrorMessage(error) // Returns user-friendly error message
```

## Integration Guide

### Step 1: Replace existing projects view in App.jsx

```jsx
import { ProjectsView } from './components/ProjectsView';

// In your App component, replace the ProjectPortfolio component:
function App() {
  // ... other code

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <div className="bg-white border-b-2 border-gray-200">
        {/* ... navigation code */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {currentTab === 'overview' && <DashboardOverview kpis={kpis} />}
        {currentTab === 'bugs' && <BugTracker />}
        {currentTab === 'projects' && <ProjectsView />} {/* NEW */}
        {currentTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
}
```

### Step 2: Verify API endpoint

Ensure your backend has the following API routes:

```
GET    /api/projects          - List all projects
POST   /api/projects          - Create new project
GET    /api/projects/:id      - Get single project
PUT    /api/projects/:id      - Update project
DELETE /api/projects/:id      - Delete project
```

### Step 3: Test the components

1. Start your backend server: `cd backend && npm start`
2. Start your frontend: `cd frontend && npm run dev`
3. Navigate to the Projects tab
4. Test all CRUD operations

## Design System

### Colors

**Status Colors:**
- Active: Green (#22c55e)
- Shipped: Teal (#14b8a6)
- In Progress: Blue (#3b82f6)
- Planning: Purple (#a855f7)
- Deferred: Gray (#6b7280)
- Cancelled: Red (#ef4444)

**Severity Colors:**
- Critical: Red (#dc2626)
- High: Orange (#f97316)
- Medium: Yellow (#eab308)
- Low: Green (#22c55e)

### Typography Scale

- Title: text-3xl (30px)
- Heading: text-2xl (24px)
- Subheading: text-xl (20px)
- Body: text-base (16px)
- Small: text-sm (14px)
- Extra Small: text-xs (12px)

### Spacing

- Section gap: space-y-6 (24px)
- Card gap: gap-4 (16px)
- Form field gap: space-y-4 (16px)
- Button gap: gap-2 (8px)

### Border Radius

- Small: rounded (4px)
- Medium: rounded-lg (8px)
- Large: rounded-xl (12px)
- Full: rounded-full (9999px)

## Responsive Design

All components are fully responsive:

- Mobile: Single column layout
- Tablet (md): 2 columns
- Desktop (lg): 3-4 columns
- Table view: Horizontal scroll on mobile

## Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Semantic HTML

## Performance Optimizations

- useMemo for expensive computations
- Debounced search
- Pagination to limit rendered items
- Loading skeletons
- Optimistic UI updates

## Future Enhancements

- CSV import functionality
- GitHub sync integration
- Drag-and-drop for bulk operations
- Advanced filters (tags, date ranges)
- Export functionality
- Project templates
- Bulk edit
- Project duplication

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Dialog.jsx
│   │   ├── Badge.jsx
│   │   ├── Input.jsx
│   │   └── Table.jsx
│   ├── ProjectsView.jsx
│   ├── ProjectsTable.jsx
│   ├── ProjectCard.jsx
│   ├── AddProjectModal.jsx
│   ├── EditProjectModal.jsx
│   └── DeleteConfirmDialog.jsx
└── lib/
    └── utils.js
```

## Support

For issues or questions, contact the development team or refer to the main repository documentation.
