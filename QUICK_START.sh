#!/bin/bash

echo "🚀 Kudi AI Bank - Quick Start Script"
echo "===================================="
echo ""

# Check for network connectivity
echo "🔍 Checking network connectivity to Prisma binaries..."
if curl -s --connect-timeout 3 https://binaries.prisma.sh > /dev/null 2>&1; then
    echo "✅ Network access available!"
    echo ""
    echo "Running Prisma setup..."
    npm run prisma:generate
    
    if [ $? -eq 0 ]; then
        echo "✅ Prisma client generated successfully!"
        echo ""
        echo "Building application..."
        npm run build
        
        if [ $? -eq 0 ]; then
            echo "✅ Build successful!"
            echo ""
            echo "You can now start the services:"
            echo "  npm run start:mobile-api    # Port 3001"
            echo "  npm run start:web-api       # Port 3002"
            echo "  npm run start:admin-api     # Port 3003"
        else
            echo "❌ Build failed. Check BUILD_STATUS.md for details"
        fi
    else
        echo "❌ Prisma generation failed"
    fi
else
    echo "❌ No network access to Prisma binaries"
    echo ""
    echo "WORKAROUND OPTIONS:"
    echo "=================="
    echo ""
    echo "Option 1: Request Network Access"
    echo "  - Contact your infrastructure team"
    echo "  - Ask to unblock: binaries.prisma.sh"
    echo "  - Then run: npm run prisma:generate"
    echo ""
    echo "Option 2: Use Docker with Prisma"
    echo "  docker run -it -v \$(pwd):/app node:20"
    echo "  cd /app && npm install && npm run prisma:generate"
    echo ""
    echo "Option 3: Pre-built Prisma Client"
    echo "  - Get .prisma folder from colleague with network access"
    echo "  - Place in: node_modules/.prisma/"
    echo "  - Then run: npm run build"
    echo ""
    echo "Option 4: Test Without Build (Read Documentation)"
    echo "  - All endpoints documented in COMPLETE_ENDPOINT_TESTING_GUIDE.md"
    echo "  - Architecture in /docs folder"
    echo "  - Once you have network, build will work instantly"
fi

echo ""
echo "📚 Documentation:"
echo "  - BUILD_STATUS.md - Current status & solutions"
echo "  - COMPLETE_ENDPOINT_TESTING_GUIDE.md - All 72 endpoints"
echo "  - TESTING_SUMMARY.md - Quick reference"
