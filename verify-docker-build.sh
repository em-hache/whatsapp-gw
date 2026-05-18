#!/bin/bash

echo "=== Verifying Docker build context ==="
echo ""

echo "1. Checking TypeScript compilation locally..."
npm run build
if [ $? -eq 0 ]; then
    echo "   ✓ Local build successful"
else
    echo "   ✗ Local build failed"
    exit 1
fi

echo ""
echo "2. Files that will be copied to Docker:"
echo "   package.json: $(test -f package.json && echo '✓' || echo '✗')"
echo "   package-lock.json: $(test -f package-lock.json && echo '✓' || echo '✗')"
echo "   tsconfig.json: $(test -f tsconfig.json && echo '✓' || echo '✗')"
echo "   src/utils/jwt.ts: $(test -f src/utils/jwt.ts && echo '✓' || echo '✗')"
echo "   src/incoming/conversation_message.ts: $(test -f src/incoming/conversation_message.ts && echo '✓' || echo '✗')"
echo "   src/incoming/conversation_poll.ts: $(test -f src/incoming/conversation_poll.ts && echo '✓' || echo '✗')"

echo ""
echo "3. Rebuild Docker image with --no-cache:"
echo "   Run: docker build --no-cache -t whatsapp-gw ."

