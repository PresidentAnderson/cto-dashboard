# Required Dependencies for Server Actions

## NPM Packages

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "zod": "^3.22.4",
    "date-fns": "^3.0.6"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  }
}
```

## Installation Command

```bash
npm install zod date-fns
# or
pnpm add zod date-fns
# or
yarn add zod date-fns
```

## Next.js Configuration

Ensure your `next.config.js` supports Server Actions:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '10mb', // For CSV uploads
    },
  },
}

module.exports = nextConfig
```

## TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## Environment Variables

Add to `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Optional: For GitHub sync
GITHUB_TOKEN="ghp_..."
GITHUB_API_URL="https://api.github.com"

# Optional: For rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## Prisma Setup

If not already done:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```
