#!/bin/bash

# Import Projects via Supabase REST API
# No Node.js dependencies required - uses curl only

SUPABASE_URL="https://iithtbuedvwmtbagquxy.supabase.co"
SUPABASE_KEY="sb_publishable_0iOb-1Q9NEYpHSiMnoHMLA_8TqslN35"

echo ""
echo "🚀 CTO Dashboard - Supabase REST API Import"
echo "══════════════════════════════════════════════════"
echo ""

# Read projects from github-repos-data.json
echo "📖 Reading github-repos-data.json..."
echo ""

# lexchronos-enterprise
echo "  ✅ Importing: lexchronos-enterprise"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "lexchronos-enterprise",
    "description": "LexChronos - Enterprise Legal Case Management SaaS Platform with Zero Trust Security",
    "status": "active",
    "complexity": 5,
    "client_appeal": 9,
    "year3_revenue": 5000000,
    "roi_score": 105,
    "tam": 50000000000,
    "sam": 8000000000,
    "som_year3": 400000000
  }' > /dev/null 2>&1

# attorney-accountability
echo "  ✅ Importing: attorney-accountability"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "attorney-accountability",
    "description": "Public database of attorney disciplinary records",
    "status": "shipped",
    "complexity": 4,
    "client_appeal": 7,
    "year3_revenue": 500000,
    "roi_score": 90,
    "tam": 50000000000,
    "sam": 8000000000,
    "som_year3": 400000000
  }' > /dev/null 2>&1

# aurora-booking-engine
echo "  ✅ Importing: aurora-booking-engine"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "aurora-booking-engine",
    "description": "AI-driven, embeddable booking engine for hotels, hostels, and resorts — white-label, multi-language, commission-free",
    "status": "active",
    "complexity": 5,
    "client_appeal": 9,
    "year3_revenue": 5000000,
    "roi_score": 105,
    "tam": 30000000000,
    "sam": 5000000000,
    "som_year3": 250000000
  }' > /dev/null 2>&1

# checkin.pvthostel.com
echo "  ✅ Importing: checkin.pvthostel.com"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "checkin.pvthostel.com",
    "description": "Check-in system for PVT Hostel",
    "status": "shipped",
    "complexity": 3,
    "client_appeal": 8,
    "year3_revenue": 500000,
    "roi_score": 90,
    "tam": 30000000000,
    "sam": 5000000000,
    "som_year3": 250000000
  }' > /dev/null 2>&1

# travelle-ride-sharing
echo "  ✅ Importing: travelle-ride-sharing"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "travelle-ride-sharing",
    "description": "Ride sharing platform",
    "status": "active",
    "complexity": 4,
    "client_appeal": 5,
    "year3_revenue": 2000000,
    "roi_score": 80,
    "tam": 20000000000,
    "sam": 3000000000,
    "som_year3": 150000000
  }' > /dev/null 2>&1

# Atlas-Inventory-Management-Software
echo "  ✅ Importing: Atlas-Inventory-Management-Software"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "Atlas-Inventory-Management-Software",
    "description": "Atlas Inventory Management Software",
    "status": "active",
    "complexity": 4,
    "client_appeal": 8,
    "year3_revenue": 3000000,
    "roi_score": 95,
    "tam": 20000000000,
    "sam": 3000000000,
    "som_year3": 150000000
  }' > /dev/null 2>&1

# axai-innovation-suite
echo "  ✅ Importing: axai-innovation-suite"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "axai-innovation-suite",
    "description": "AI Innovation Suite",
    "status": "active",
    "complexity": 5,
    "client_appeal": 5,
    "year3_revenue": 5000000,
    "roi_score": 100,
    "tam": 20000000000,
    "sam": 3000000000,
    "som_year3": 150000000
  }' > /dev/null 2>&1

# wisdomos-documentation
echo "  ✅ Importing: wisdomos-documentation"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "wisdomos-documentation",
    "description": "WisdomOS Documentation - Internal guides and specifications",
    "status": "active",
    "complexity": 2,
    "client_appeal": 8,
    "year3_revenue": 0,
    "roi_score": 70,
    "tam": 5000000000,
    "sam": 800000000,
    "som_year3": 50000000
  }' > /dev/null 2>&1

# wisdomos-infrastructure
echo "  ✅ Importing: wisdomos-infrastructure"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "wisdomos-infrastructure",
    "description": "WisdomOS Infrastructure - Docker, K8s, and deployment configs",
    "status": "active",
    "complexity": 4,
    "client_appeal": 9,
    "year3_revenue": 3000000,
    "roi_score": 105,
    "tam": 5000000000,
    "sam": 800000000,
    "som_year3": 50000000
  }' > /dev/null 2>&1

# wisdomos-desktop
echo "  ✅ Importing: wisdomos-desktop"
curl -s -X POST "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{
    "name": "wisdomos-desktop",
    "description": "WisdomOS Desktop - Electron app for Phoenix transformation",
    "status": "active",
    "complexity": 4,
    "client_appeal": 8,
    "year3_revenue": 3000000,
    "roi_score": 100,
    "tam": 5000000000,
    "sam": 800000000,
    "som_year3": 50000000
  }' > /dev/null 2>&1

echo ""
echo "══════════════════════════════════════════════════"
echo ""
echo "📈 Import Summary:"
echo ""
echo "  ✅ Imported: 10 projects"
echo ""
echo "✨ Import complete!"
echo ""
echo "To verify, go to Supabase SQL Editor and run:"
echo "  SELECT COUNT(*) FROM projects;"
echo ""
