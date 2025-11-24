# CTO Dashboard v2.0 - Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Backend API running on port 5000
- PostgreSQL database configured

### 2. Installation

The UI components are already installed and ready to use. No additional npm packages needed beyond what's in package.json.

### 3. Integration

Replace the old ProjectPortfolio component in `src/App.jsx`:

```jsx
// OLD:
import ProjectPortfolio from './ProjectPortfolio';

// NEW:
import { ProjectsView } from './components/ProjectsView';

// In your render:
{currentTab === 'projects' && <ProjectsView />}
```

### 4. Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit http://localhost:3000

## Component Structure

```
src/
├── components/
│   ├── ui/                      # Base UI components
│   │   ├── Button.jsx          # Buttons with variants
│   │   ├── Card.jsx            # Card layouts
│   │   ├── Dialog.jsx          # Modal dialogs
│   │   ├── Badge.jsx           # Status badges
│   │   ├── Input.jsx           # Form inputs
│   │   └── Table.jsx           # Data tables
│   │
│   ├── ProjectsView.jsx        # Main container (USE THIS)
│   ├── ProjectsTable.jsx       # Table view
│   ├── ProjectCard.jsx         # Card view
│   ├── AddProjectModal.jsx     # Add form
│   ├── EditProjectModal.jsx    # Edit form
│   └── DeleteConfirmDialog.jsx # Delete confirmation
│
└── lib/
    └── utils.js                # Helper functions
```

## Features Checklist

### Table View
- [x] Search by name/description
- [x] Filter by status
- [x] Filter by language
- [x] Sort columns (name, language, stars, status)
- [x] Select multiple rows
- [x] Bulk delete
- [x] Pagination (50 per page)
- [x] Edit/Delete actions per row

### Card View
- [x] Beautiful card design
- [x] Hover effects with lift
- [x] GitHub/Demo links
- [x] Status badges
- [x] Language badges
- [x] Star count
- [x] Tags display
- [x] Edit/Delete actions

### Add/Edit Modals
- [x] Form validation
- [x] Error messages
- [x] Success feedback
- [x] Loading states
- [x] URL validation
- [x] Character count
- [x] Tag parsing (comma-separated)

### Delete Dialog
- [x] Confirmation required
- [x] Shows project details
- [x] Warning message
- [x] Error handling
- [x] Cannot close while deleting

### General Features
- [x] Responsive design (mobile-first)
- [x] Loading skeletons
- [x] Empty states
- [x] Error states with retry
- [x] Real-time statistics
- [x] View toggle (table/cards)
- [x] Professional animations
- [x] Keyboard accessible

## API Requirements

Your backend must implement these endpoints:

### GET /api/projects
Returns array of projects.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Project Name",
      "description": "Project description",
      "github_url": "https://github.com/user/repo",
      "demo_url": "https://demo.com",
      "language": "JavaScript",
      "status": "active",
      "tags": ["react", "nodejs"],
      "stars": 1250,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/projects
Creates new project.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Description",
  "github_url": "https://github.com/user/repo",
  "demo_url": "https://demo.com",
  "language": "TypeScript",
  "status": "active",
  "tags": ["typescript", "api"],
  "stars": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* created project */ }
}
```

### PUT /api/projects/:id
Updates existing project.

**Request Body:** Same as POST

**Response:**
```json
{
  "success": true,
  "data": { /* updated project */ }
}
```

### DELETE /api/projects/:id
Deletes project.

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

## Database Schema

If you need to create the projects table:

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  github_url VARCHAR(255),
  demo_url VARCHAR(255),
  language VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  tags TEXT[], -- PostgreSQL array
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_language ON projects(language);
```

## Customization

### Change Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    },
  },
},
```

### Change Branding

Update text in `ProjectsView.jsx`:

```jsx
<h2 className="text-3xl font-bold text-gray-900">
  Your Custom Title
</h2>
```

### Add Custom Fields

1. Add field to form in `AddProjectModal.jsx`:

```jsx
<FormField label="Custom Field" error={errors.customField}>
  <Input
    value={formData.customField}
    onChange={(e) => handleChange('customField', e.target.value)}
  />
</FormField>
```

2. Add to payload:

```javascript
const payload = {
  ...formData,
  customField: formData.customField,
};
```

3. Display in table/card

### Modify Validation

Edit `src/lib/utils.js`:

```javascript
export function validateField(value, rules) {
  // Add custom validation rules
  if (rules.custom) {
    // Your custom validation
  }
  // ...
}
```

## Troubleshooting

### "Cannot read property of undefined"
- Check that backend is running
- Verify API_URL is correct
- Check network tab for failed requests

### Styles not applying
- Clear browser cache
- Rebuild: `npm run build`
- Check Tailwind config includes all paths

### Modal not opening
- Check console for errors
- Verify state management
- Ensure Dialog component is imported

### API errors
- Check backend logs
- Verify request payload format
- Check CORS configuration

### Build errors
- Delete node_modules and reinstall
- Clear npm cache: `npm cache clean --force`
- Check Node version: `node --version`

## Performance Tips

1. **Pagination is enabled by default** (50 items per page)
2. **Search is debounced** (500ms delay)
3. **Memoization used** for expensive operations
4. **Loading skeletons** improve perceived performance
5. **Optimistic updates** for better UX

## Testing Checklist

Before deploying, test:

- [ ] Add new project
- [ ] Edit existing project
- [ ] Delete project
- [ ] Search functionality
- [ ] Filter by status
- [ ] Filter by language
- [ ] Sort columns
- [ ] Pagination
- [ ] Bulk select and delete
- [ ] Toggle between views
- [ ] Responsive on mobile
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states

## Deployment

### Build for Production

```bash
cd frontend
npm run build
```

### Environment Variables

Create `.env.production`:

```
VITE_API_URL=https://your-api-domain.com
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS 14+, Android 10+)

## Documentation

- [Component Documentation](./COMPONENTS_DOCUMENTATION.md) - Detailed API docs
- [Design System](./DESIGN_SYSTEM.md) - Design guidelines
- [Tailwind Docs](https://tailwindcss.com) - CSS framework

## Support

For issues:
1. Check this guide first
2. Review component documentation
3. Check browser console for errors
4. Verify backend API is working

## Next Steps

1. Integrate ProjectsView into App.jsx
2. Test all CRUD operations
3. Customize colors/branding
4. Add any custom fields
5. Deploy to production

## Version History

- **v2.0** - Complete rewrite with modern UI components
- **v1.0** - Initial release with basic functionality

---

**Ready to use!** Just import `ProjectsView` and you're good to go.
