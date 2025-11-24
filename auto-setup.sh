#!/bin/bash

# Automated Setup Script
# Opens Supabase SQL Editor with setup SQL ready to execute

echo ""
echo "🚀 CTO Dashboard - Automated Setup"
echo "══════════════════════════════════════════════════════════"
echo ""

# Check if complete-setup.sql exists
if [ ! -f "database/complete-setup.sql" ]; then
    echo "❌ Error: database/complete-setup.sql not found"
    exit 1
fi

echo "📋 Setup SQL file found"
echo "📊 File size: $(wc -l < database/complete-setup.sql) lines"
echo ""

# Copy SQL to clipboard (macOS)
if command -v pbcopy &> /dev/null; then
    cat database/complete-setup.sql | pbcopy
    echo "✅ Setup SQL copied to clipboard!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Opening Supabase SQL Editor in your browser..."
    echo "   2. The SQL is already in your clipboard"
    echo "   3. Paste (Cmd+V) into the editor"
    echo "   4. Click 'Run' button"
    echo ""

    # Open Supabase SQL Editor
    open "https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new"

    echo "✨ Browser opened! Paste and run the SQL."
    echo ""
    echo "🎯 After running the SQL, you can login with:"
    echo "   Email:    jonathan.mitchell.anderson@gmail.com"
    echo "   Password: J0n8th8n"
    echo "   URL:      https://cto-dashboard-qyypjst6d-axaiinovation.vercel.app"
    echo ""
else
    echo "⚠️  Clipboard utility not available"
    echo ""
    echo "📝 Manual steps:"
    echo "   1. Open: https://app.supabase.com/project/iithtbuedvwmtbagquxy/sql/new"
    echo "   2. Open file: database/complete-setup.sql"
    echo "   3. Copy all contents and paste into SQL Editor"
    echo "   4. Click 'Run' button"
    echo ""
fi

echo "══════════════════════════════════════════════════════════"
echo ""
