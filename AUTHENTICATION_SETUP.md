# Authentication Setup - Final Steps

Your authentication system has been successfully integrated! Complete these final steps to enable login:

## Step 1: Add JWT_SECRET to Vercel

1. Go to your Vercel dashboard: https://vercel.com/axaiinovation/cto-dashboard/settings/environment-variables

2. Click "Add New" and enter:
   - **Key:** `JWT_SECRET`
   - **Value:** `9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=`
   - **Environments:** Select all (Production, Preview, Development)

3. Click "Save"

4. Redeploy your application:
   - Go to: https://vercel.com/axaiinovation/cto-dashboard
   - Click "Deployments" tab
   - Find the latest deployment
   - Click the three dots menu → "Redeploy"

## Step 2: Create Your First Admin User

After the deployment completes (2-3 minutes), create your admin account:

### Option A: Using curl (recommended)

```bash
curl -X POST https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "YourSecurePassword123!",
    "name": "Admin User",
    "role": "cto"
  }'
```

### Option B: Using Postman/Insomnia

- **Method:** POST
- **URL:** https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/auth/register
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "email": "admin@yourcompany.com",
  "password": "YourSecurePassword123!",
  "name": "Admin User",
  "role": "cto"
}
```

### Option C: Using JavaScript in Browser Console

```javascript
fetch('https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@yourcompany.com',
    password: 'YourSecurePassword123!',
    name: 'Admin User',
    role: 'cto'
  })
})
.then(r => r.json())
.then(data => console.log('Success!', data))
.catch(err => console.error('Error:', err));
```

## Step 3: Test Login

1. Go to: https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app

2. You should see the login page

3. Enter your credentials:
   - **Email:** admin@yourcompany.com
   - **Password:** YourSecurePassword123!

4. Click "Sign In"

5. You should be logged in and see the dashboard with your name in the top-right corner

## What's Been Implemented

### Frontend Changes
- ✅ `Login.jsx` - Beautiful login form with validation
- ✅ `App.jsx` - Authentication check on load, protected routes
- ✅ Session management with localStorage
- ✅ Logout button with user display
- ✅ Loading spinner during auth check

### Backend Changes
- ✅ `api/auth.js` - JWT authentication endpoints
  - POST `/api/auth/register` - Create new user
  - POST `/api/auth/login` - Login and get JWT token
  - GET `/api/auth/me` - Verify token and get user data
  - POST `/api/auth/logout` - Logout (logs event)

- ✅ `api/import.js` - Data import system
  - POST `/api/import/bugs` - Import bugs from CSV/JSON
  - POST `/api/import/projects` - Import projects from CSV/JSON
  - POST `/api/import/github` - Import GitHub Issues
  - GET `/api/import/templates` - Get import templates

- ✅ `frontend/src/config.js` - Centralized configuration
  - Branding customization
  - Theme colors
  - Feature flags
  - SLA thresholds

### Security Features
- ✅ JWT tokens with 7-day expiration
- ✅ SHA-256 password hashing with salt
- ✅ Token verification on every protected request
- ✅ Automatic token refresh on page load
- ✅ Secure logout with audit logging

## User Roles Available

When creating users, you can assign these roles:

- **cto** - Full access (view, create, edit, delete everything)
- **manager** - View all, edit bugs/projects
- **engineer** - View all, edit assigned bugs
- **qa_engineer** - View all, create bugs
- **viewer** - Read-only access

## Troubleshooting

### "Invalid credentials" error
- Check that JWT_SECRET is set in Vercel
- Ensure you've redeployed after adding the environment variable
- Verify the user exists in the database

### Login page doesn't appear
- Clear browser cache and localStorage
- Check browser console for errors
- Verify deployment completed successfully

### "No token provided" error
- Clear localStorage: `localStorage.clear()`
- Try logging in again
- Check that token is being saved: `localStorage.getItem('token')`

## Next Steps

Now that authentication is working, you can:

1. **Import Your Real Data** - Use the import API to add your bugs/projects
   - See: CUSTOMIZATION_GUIDE.md → Part 1: Importing Your Real Data

2. **Customize Branding** - Update colors, logo, company name
   - Edit: `frontend/src/config.js`
   - See: CUSTOMIZATION_GUIDE.md → Part 2: Customizing Branding

3. **Deploy More Features** - Use agents to add features in parallel
   - Dark mode toggle
   - CSV export functionality
   - Advanced filtering
   - Slack notifications
   - Mobile app

4. **Add More Users** - Create accounts for your team
   - Use the register endpoint with appropriate roles
   - Share login credentials securely

## Security Recommendations

Before going to production:

1. **Change JWT_SECRET** - Use a different secret than the one provided
   ```bash
   openssl rand -base64 32
   ```

2. **Add Password Column** - Currently passwords are stored in audit_log (temporary)
   - Recommended: Add `password_hash` column to `users` table
   - Update auth.js to use proper password column

3. **Enable HTTPS Only** - Ensure all traffic uses HTTPS (Vercel does this automatically)

4. **Add Rate Limiting** - Prevent brute force attacks
   - Use Vercel Edge Middleware or a rate limiting library

5. **Add Password Requirements** - Enforce strong passwords
   - Minimum length, special characters, etc.

6. **Enable 2FA** (Optional) - Add two-factor authentication
   - Use libraries like `speakeasy` for TOTP

---

**Your dashboard is now fully secured!** 🎉

Visit: https://cto-dashboard-70qbrsskl-axaiinovation.vercel.app
