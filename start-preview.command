#!/bin/bash
# CHACE STUDIO — local preview launcher
# Double-click this file to start the local dev server.

cd "$(dirname "$0")" || exit 1
clear
echo "CHACE STUDIO — local preview"
echo "-----------------------------------------"

# Make sure Node/npm is available
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js / npm is not installed on this Mac."
  echo "Install Node (LTS) from https://nodejs.org, then double-click this file again."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

# Install dependencies on first run
if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (this can take a minute)..."
  npm install || { echo "Install failed."; read -n 1 -s -r -p "Press any key to close..."; exit 1; }
  echo ""
fi

echo "Starting dev server... a browser tab will open at http://localhost:4321"
echo "Leave this window open while you preview. Press Ctrl+C here to stop."
echo ""

# Open the browser once the server has had a moment to boot
( sleep 4 && open http://localhost:4321 ) >/dev/null 2>&1 &

npm run dev
