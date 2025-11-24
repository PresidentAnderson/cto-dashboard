#!/bin/bash

# Setup Environment Variables for Vercel
# This script adds all required environment variables to Vercel

echo ""
echo "🔧 Setting up Vercel Environment Variables"
echo "══════════════════════════════════════════"
echo ""

# JWT_SECRET
echo "📝 Adding JWT_SECRET..."
echo "9eIYkI29Ui51haY7VtGuXFKg2y+gFWpwruK4y85gBHk=" | vercel env add JWT_SECRET production

# DATABASE_URL
echo ""
echo "📝 Adding DATABASE_URL..."
echo "postgresql://postgres:Success*2026\$\$\$@db.iithtbuedvwmtbagquxy.supabase.co:5432/postgres" | vercel env add DATABASE_URL production

# NEXT_PUBLIC_SUPABASE_URL
echo ""
echo "📝 Adding NEXT_PUBLIC_SUPABASE_URL..."
echo "https://iithtbuedvwmtbagquxy.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production

# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
echo ""
echo "📝 Adding NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY..."
echo "sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35" | vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY production

# AI_GATEWAY_API_KEY
echo ""
echo "📝 Adding AI_GATEWAY_API_KEY..."
echo "vck_3FGj25fwZpbvJOsIkj7cG8HHhurSXfF6wAB3l13Fl4NwWW98HB3MZXJL" | vercel env add AI_GATEWAY_API_KEY production

echo ""
echo "══════════════════════════════════════════"
echo ""
echo "✅ Environment variables added!"
echo ""
echo "Next step: Redeploy with 'vercel --prod'"
echo ""
