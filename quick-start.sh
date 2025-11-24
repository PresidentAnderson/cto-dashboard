#!/bin/bash

###############################################################################
# CTO DASHBOARD - QUICK START SCRIPT
# One-command setup for the complete CTO Dashboard system
###############################################################################

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║              CTO DASHBOARD - QUICK START                             ║"
echo "║              Bug Tracking & Portfolio Management                     ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "   Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    echo "   Please install docker-compose"
    exit 1
fi

echo "✅ Docker detected"
echo ""

# Step 1: Check for .env file
echo "📝 Step 1: Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo "   Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "   ⚠️  IMPORTANT: Edit backend/.env and set a secure DB_PASSWORD"
    echo "   Press Enter to continue after editing, or Ctrl+C to exit and edit manually"
    read -r
fi
echo "✅ Environment configured"
echo ""

# Step 2: Start Docker containers
echo "🐳 Step 2: Starting Docker containers..."
docker-compose down -v  # Clean start
docker-compose up -d
echo "✅ Containers started"
echo ""

# Step 3: Wait for database to be ready
echo "⏳ Step 3: Waiting for PostgreSQL to be ready..."
sleep 10
echo "✅ Database ready"
echo ""

# Step 4: Seed database
echo "🌱 Step 4: Seeding database with sample data..."
docker-compose exec -T api npm run seed
echo "✅ Database seeded"
echo ""

# Step 5: Verify services
echo "🔍 Step 5: Verifying services..."

# Check API
if curl -s http://localhost:5000/health | grep -q "healthy"; then
    echo "✅ API is running (http://localhost:5000)"
else
    echo "⚠️  Warning: API health check failed"
    echo "   Check logs: docker-compose logs api"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running (http://localhost:3000)"
else
    echo "⚠️  Warning: Frontend may still be starting..."
    echo "   Wait 30 seconds and try http://localhost:3000"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                       ║"
echo "║                    🎉 SETUP COMPLETE!                                ║"
echo "║                                                                       ║"
echo "║   Dashboard:  http://localhost:3000                                  ║"
echo "║   API:        http://localhost:5000                                  ║"
echo "║                                                                       ║"
echo "║   Sample data included:                                               ║"
echo "║   • 6 users                                                          ║"
echo "║   • 3 projects                                                       ║"
echo "║   • ~50 bugs (5 critical, 12 high, 18 medium, 15 low)              ║"
echo "║   • 5 months of metrics                                             ║"
echo "║                                                                       ║"
echo "║   Next steps:                                                         ║"
echo "║   1. Open http://localhost:3000 in your browser                      ║"
echo "║   2. Explore all 4 tabs (Overview, Bugs, Projects, Analytics)       ║"
echo "║   3. Read docs/HANDOFF.md for customization guide                    ║"
echo "║                                                                       ║"
echo "║   Useful commands:                                                    ║"
echo "║   • View logs:     docker-compose logs -f                            ║"
echo "║   • Stop:          docker-compose down                               ║"
echo "║   • Restart:       docker-compose restart                            ║"
echo "║   • Re-seed data:  docker-compose exec api npm run seed             ║"
echo "║                                                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
