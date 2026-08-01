#!/bin/bash

# Define the project directory
PROJECT_DIR="/Users/genautech/afiliados/afiliads_app/nextjs_space"
PRISMA_CHECK_SCRIPT="$PROJECT_DIR/scripts/pre-prisma-push-check.sh"

echo "Attempting to find and kill existing next dev process on port 3000..."

# Find the PID of the next dev server listening on port 3000
PID=$(lsof -t -i:3000 -sTCP:LISTEN)

if [ -n "$PID" ]; then
  echo "Found next dev process running on port 3000 with PID $PID. Killing it..."
  kill -9 "$PID"
  sleep 2 # Give it a moment to terminate
else
  echo "No next dev process found running on port 3000."
fi

echo "Running safe Prisma DB push check..."
# Run the safe prisma push script
"$PRISMA_CHECK_SCRIPT" "$@"
PRISMA_PUSH_EXIT_CODE=$?

if [ $PRISMA_PUSH_EXIT_CODE -eq 0 ]; then
  echo "Prisma DB push completed successfully. Restarting next dev..."
  # Restart next dev in the background
  cd "$PROJECT_DIR"
  npm run dev & # Start in background
  echo "next dev restarted in background. Check your terminal output or logs for status."
else
  echo "Prisma DB push was cancelled or failed (exit code $PRISMA_PUSH_EXIT_CODE). Not restarting next dev."
fi
