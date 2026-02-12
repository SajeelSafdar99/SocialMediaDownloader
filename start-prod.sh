#!/bin/bash

# Production Build Test Script
# Tests the production build with Cloudflare Tunnel

set -e

echo "🚀 Starting Production Build Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kill any existing processes
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
pkill -f "node dist/index.js" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: dist/ folder not found${NC}"
    echo ""
    echo "Please build the project first:"
    echo "  npm run build"
    echo ""
    exit 1
fi

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}❌ Error: dist/index.js not found${NC}"
    echo ""
    echo "Please build the project first:"
    echo "  npm run build"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Build files found${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "The server may not have all environment variables"
    echo ""
fi

# Start the production server in the background
echo -e "${BLUE}🔧 Starting production server...${NC}"
NODE_ENV=production node dist/index.js &
SERVER_PID=$!

# Give server time to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server started (PID: $SERVER_PID)${NC}"
echo ""

# Start Cloudflare Tunnel
echo -e "${BLUE}🌐 Starting Cloudflare Tunnel...${NC}"
echo ""
echo "Tunneling to vidgrabber.online..."
echo ""

cloudflared tunnel --config tunnel-config.yml run 2>&1 &
TUNNEL_PID=$!

# Give tunnel time to connect
sleep 3

echo ""
echo -e "${GREEN}✅ Production build is running!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📍 Access your app at:${NC}"
echo ""
echo "   🌐 https://vidgrabber.online"
echo "   🔧 https://admin.vidgrabber.online"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  Note: This is the PRODUCTION BUILD${NC}"
echo "   - Using bundled code from dist/"
echo "   - No hot reload"
echo "   - Same as production environment"
echo ""
echo -e "${BLUE}ℹ️  Server running on: http://localhost:5006${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${BLUE}🛑 Stopping services...${NC}"

    # Kill server
    if kill -0 $SERVER_PID 2>/dev/null; then
        kill $SERVER_PID 2>/dev/null || true
        echo "✅ Server stopped"
    fi

    # Kill tunnel
    if kill -0 $TUNNEL_PID 2>/dev/null; then
        kill $TUNNEL_PID 2>/dev/null || true
        echo "✅ Tunnel stopped"
    fi

    # Kill any remaining processes
    pkill -f "node dist/index.js" 2>/dev/null || true
    pkill -f "cloudflared tunnel" 2>/dev/null || true

    echo ""
    echo -e "${GREEN}✅ All services stopped${NC}"
    echo ""
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Wait for user to press Ctrl+C
wait
