#!/bin/bash

# VidGrabber - Quick Setup & Run
# Use this script to start everything in one command

echo "🚀 VidGrabber - Starting..."
echo ""

# Function to kill all related processes
kill_all_processes() {
    echo "🧹 Cleaning up existing processes..."

    # Kill processes by port
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    lsof -ti:5006 | xargs kill -9 2>/dev/null

    # Kill processes by name/pattern
    pkill -9 -f "npm run dev" 2>/dev/null
    pkill -9 -f "npm run client" 2>/dev/null
    pkill -9 -f "npm run server" 2>/dev/null
    pkill -9 -f "tsx server" 2>/dev/null
    pkill -9 cloudflared 2>/dev/null
    pkill -9 -f "concurrently" 2>/dev/null

    # Wait a moment for processes to die
    sleep 2

    echo "✅ All existing processes terminated"
}

# Function to clear Vite cache
clear_cache() {
    echo "🧹 Clearing Vite cache..."
    rm -rf node_modules/.vite 2>/dev/null
    echo "✅ Cache cleared"
}

# Kill existing processes first
kill_all_processes

# Clear Vite cache
clear_cache

echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  Cloudflared not installed"
    echo ""
    read -p "Install cloudflared now? (y/n): " install
    if [ "$install" == "y" ]; then
        echo "Installing cloudflared..."
        brew install cloudflared
    else
        echo "Run without tunnel (localhost only)"
        npm run dev
        exit 0
    fi
fi

# Start everything
echo "Starting VidGrabber..."
echo ""
echo "✅ Project will be accessible at:"
echo "   https://vidgrabber.online"
echo "   https://www.vidgrabber.online"
echo "   https://admin.vidgrabber.online"
echo ""
echo "⚠️  Note: HMR (Hot Module Replacement) is disabled through tunnel"
echo "   To see code changes, manually refresh the browser (Cmd+R / Ctrl+R)"
echo ""
echo "Press Ctrl+C to stop everything"
echo ""

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."

    # Kill the main npm process
    kill $APP_PID 2>/dev/null

    # Kill all child processes
    pkill -P $APP_PID 2>/dev/null

    # Kill cloudflared
    pkill -9 cloudflared 2>/dev/null

    # Force kill any remaining processes
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    lsof -ti:5006 | xargs kill -9 2>/dev/null
    pkill -9 -f "npm run dev" 2>/dev/null
    pkill -9 -f "tsx server" 2>/dev/null

    echo "✅ All services stopped"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start the application in the background
npm run dev &
APP_PID=$!

# Wait for the app to start
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5006/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
done

# Check if backend actually started
if ! curl -s http://localhost:5006/health > /dev/null 2>&1; then
    echo "❌ Backend failed to start. Check logs above for errors."
    cleanup
    exit 1
fi

# Start cloudflared tunnel using config file
echo "🌐 Starting Cloudflare Tunnel..."
cloudflared tunnel --config tunnel-config.yml run vidgrabber-dev

# When tunnel stops, trigger cleanup
cleanup
