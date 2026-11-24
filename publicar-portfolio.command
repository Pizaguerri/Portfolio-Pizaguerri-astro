#!/bin/bash

# ============================================================
# publicar-portfolio.command
# Abre Terminal y ejecuta sync-content.sh de forma interactiva.
# ============================================================

osascript <<'APPLESCRIPT'
tell application "Terminal"
  activate
  do script "cd '/Users/pabloizaguerri/Library/Mobile Documents/com~apple~CloudDocs/Coding Room/Astro-Portfolio-Pizaguerri' && ./sync-content.sh"
end tell
APPLESCRIPT