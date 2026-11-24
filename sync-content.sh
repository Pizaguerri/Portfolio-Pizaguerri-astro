
#!/bin/bash

# ============================================================
# sync-content.sh
#
# Flujo editorial:
# Obsidian -> Astro -> R2 -> GitHub -> Cloudflare Workers
# ============================================================

set -Eeuo pipefail

# --- RUTAS ---

OBSIDIAN_SOURCE="/Users/pabloizaguerri/Library/Mobile Documents/iCloud~md~obsidian/Documents/Pizaguerri/03 Projectes/Portfolio-Pizaguerri"

ASTRO_REPO="/Users/pabloizaguerri/Library/Mobile Documents/com~apple~CloudDocs/Coding Room/Astro-Portfolio-Pizaguerri"

CONTENT_DEST="$ASTRO_REPO/src/content"
MANIFEST_FILE="src/data/media-manifest.json"
MANIFEST_SCRIPT="src/scripts/generate-media-manifest.js"

# --- PUBLICACIÓN ---

R2_REMOTE="r2-pablo:pabloizaguerri-media"
GIT_REMOTE="origin"
GIT_BRANCH="main"

PUBLIC_URL="https://pabloizaguerri.org"
LOCAL_URL="http://localhost:4321"

# --- VARIABLES INTERNAS ---

DEV_PID=""
SYNC_PREVIEW=""
HAS_CONTENT_CHANGES=false

# Opciones compartidas por la simulación y la sincronización real.
# Evitan copiar archivos .DS_Store y modificar fechas de directorios.
RSYNC_OPTIONS=(
  --exclude='.DS_Store'
  --omit-dir-times
)

# --- FUNCIONES ---

error() {
  echo ""
  echo "ERROR: $1"
  exit 1
}

confirm() {
  local answer
  read -r -p "$1 (s/n): " answer
  [[ "$answer" =~ ^[sS]$ ]]
}

stop_preview() {
  if [[ -n "$DEV_PID" ]]; then
    echo ""
    echo "Deteniendo servidor local..."

    pkill -TERM -P "$DEV_PID" 2>/dev/null || true
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true

    DEV_PID=""
  fi
}

cleanup() {
  stop_preview

  if [[ -n "$SYNC_PREVIEW" ]]; then
    rm -f "$SYNC_PREVIEW"
  fi
}

# Comprueba que todos los cambios Git estén dentro
# de las rutas permitidas para el flujo editorial.
check_git_changes() {
  local unexpected_changes

  unexpected_changes=$(git status --porcelain --untracked-files=all -- \
    . \
    ':(exclude)src/content' \
    ':(exclude)src/data/media-manifest.json' \
    ':(exclude)publicar-portfolio.command' \
    ':(exclude)sync-content.sh' \
    ':(exclude).gitignore')

  if [[ -n "$unexpected_changes" ]]; then

    echo ""
    echo "ATENCIÓN: hay cambios ajenos al contenido editorial."
    echo ""
    echo "No se continuará para evitar desplegar cambios"
    echo "locales que no estén preparados para publicarse."
    echo ""

    printf '%s\n' "$unexpected_changes"

    echo ""
    echo "Revisa estos archivos antes de volver a publicar."

    return 1
  fi

  return 0
}

# Comprueba que el índice de Git esté limpio.
# Evita mezclar cambios preparados anteriormente
# con el commit editorial.
check_git_index() {
  if ! git diff --cached --quiet; then
    echo ""
    echo "ERROR: hay cambios preparados en el índice de Git."
    echo ""
    echo "El sincronizador necesita un índice limpio."
    echo "Registra o retira esos cambios antes de continuar."
    return 1
  fi

  return 0
}

trap cleanup EXIT

# --- VALIDACIONES INICIALES ---

echo ""
echo "============================================================"
echo " PUBLICACIÓN DEL PORTFOLIO"
echo "============================================================"
echo ""

echo "Origen Obsidian: $OBSIDIAN_SOURCE"
echo "Destino Astro:   $CONTENT_DEST"
echo ""

[[ -d "$OBSIDIAN_SOURCE" ]] || error "No se encuentra la carpeta de Obsidian."
[[ -d "$ASTRO_REPO" ]] || error "No se encuentra el repositorio Astro."
[[ -d "$CONTENT_DEST" ]] || error "No se encuentra src/content."

[[ -f "$ASTRO_REPO/package.json" ]] || error "No se encuentra package.json."
[[ -f "$ASTRO_REPO/wrangler.jsonc" ]] || error "No se encuentra wrangler.jsonc."
[[ -f "$ASTRO_REPO/$MANIFEST_SCRIPT" ]] || error "No se encuentra el generador del manifiesto."

# Recuento de archivos excluyendo los metadatos de macOS.
OBSIDIAN_FILE_COUNT=$(find "$OBSIDIAN_SOURCE" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
ASTRO_FILE_COUNT=$(find "$CONTENT_DEST" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')

[[ "$OBSIDIAN_FILE_COUNT" -gt 0 ]] || error "La carpeta de Obsidian está vacía."

cd "$ASTRO_REPO"

CURRENT_BRANCH=$(git branch --show-current)

[[ "$CURRENT_BRANCH" == "$GIT_BRANCH" ]] || \
  error "La rama actual es '$CURRENT_BRANCH', no '$GIT_BRANCH'."

git remote get-url "$GIT_REMOTE" >/dev/null 2>&1 || \
  error "No existe el remoto Git '$GIT_REMOTE'."

command -v rsync >/dev/null 2>&1 || error "No se encuentra rsync."
command -v rclone >/dev/null 2>&1 || error "No se encuentra rclone."
command -v npm >/dev/null 2>&1 || error "No se encuentra npm."
command -v node >/dev/null 2>&1 || error "No se encuentra node."
command -v curl >/dev/null 2>&1 || error "No se encuentra curl."

echo "Archivos en Obsidian: $OBSIDIAN_FILE_COUNT"
echo "Archivos en Astro:    $ASTRO_FILE_COUNT"
echo ""
echo "Validaciones iniciales completadas."

# Comprobar que no haya cambios ajenos al contenido.
check_git_changes || exit 1

# No comenzar con cambios previamente preparados.
check_git_index || exit 1

# --- SIMULACIÓN DE SINCRONIZACIÓN ---

echo ""
echo "============================================================"
echo " SIMULACIÓN DE SINCRONIZACIÓN"
echo "============================================================"
echo ""

echo "Analizando cambios sin modificar archivos..."
echo ""

SYNC_PREVIEW=$(mktemp)

rsync -ani --delete \
  "${RSYNC_OPTIONS[@]}" \
  "$OBSIDIAN_SOURCE/" \
  "$CONTENT_DEST/" | tee "$SYNC_PREVIEW"

echo ""

if grep -q '^\*deleting ' "$SYNC_PREVIEW"; then

  echo "ATENCIÓN: la sincronización eliminará archivos de src/content."
  echo "Revisa cuidadosamente la lista anterior."
  echo ""

  if ! confirm "¿Confirmas estas eliminaciones y la sincronización completa?"; then
    echo "Sincronización cancelada. No se ha modificado src/content."
    exit 0
  fi

else

  if [[ "$OBSIDIAN_FILE_COUNT" -lt "$ASTRO_FILE_COUNT" ]]; then

    echo "ATENCIÓN: Obsidian contiene menos archivos que Astro."
    echo "Revisa que iCloud haya terminado de sincronizar."
    echo ""

    if ! confirm "¿Quieres continuar de todos modos?"; then
      exit 0
    fi

  else

    if ! confirm "¿Aplicar la sincronización de Obsidian a Astro?"; then
      echo "Sincronización cancelada."
      exit 0
    fi

  fi

fi

# --- SINCRONIZACIÓN REAL ---

echo ""
echo "============================================================"
echo " SINCRONIZANDO OBSIDIAN -> ASTRO"
echo "============================================================"
echo ""

rsync -av --delete \
  "${RSYNC_OPTIONS[@]}" \
  "$OBSIDIAN_SOURCE/" \
  "$CONTENT_DEST/"

echo ""
echo "Contenido sincronizado."
echo ""

# --- GENERACIÓN DEL MANIFIESTO ---

echo ""
echo "============================================================"
echo " GENERANDO MANIFIESTO DE IMÁGENES"
echo "============================================================"
echo ""

node "$MANIFEST_SCRIPT"

echo ""

# --- DETECCIÓN DE CAMBIOS ---

echo "============================================================"
echo " COMPROBANDO CAMBIOS EDITORIALES"
echo "============================================================"
echo ""

check_git_changes || exit 1

CHANGED_CONTENT=$(git status --porcelain --untracked-files=all -- src/content/ "$MANIFEST_FILE")

if [[ -n "$CHANGED_CONTENT" ]]; then

  HAS_CONTENT_CHANGES=true

  echo "Se han detectado cambios en contenido o manifiesto:"
  echo ""
  printf '%s\n' "$CHANGED_CONTENT"

else

  HAS_CONTENT_CHANGES=false

  echo "No hay cambios editoriales respecto a Git."
  echo ""
  echo "No será necesario publicar contenido."

fi

# --- PREVISUALIZACIÓN LOCAL ---

echo ""

if confirm "¿Quieres previsualizar la web en local?"; then

  echo ""
  echo "Iniciando Astro..."
  echo "Se abrirá $LOCAL_URL"
  echo "Cuando termines, pulsa Ctrl+C para continuar."
  echo ""

  npm run dev > /tmp/astro-portfolio-preview.log 2>&1 &
  DEV_PID=$!

  SERVER_READY=false

  for i in {1..30}; do

    if ! kill -0 "$DEV_PID" 2>/dev/null; then
      cat /tmp/astro-portfolio-preview.log
      error "Astro no ha podido iniciar."
    fi

    if curl -fsS "$LOCAL_URL" >/dev/null 2>&1; then
      SERVER_READY=true
      break
    fi

    sleep 1
  done

  if [[ "$SERVER_READY" != true ]]; then
    cat /tmp/astro-portfolio-preview.log
    error "Astro no ha respondido en 30 segundos."
  fi

  open "$LOCAL_URL"

  trap 'stop_preview' INT

  while [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; do
    sleep 1 || true
  done

  stop_preview
  trap - INT

  echo ""
  echo "Servidor local detenido."

fi

# --- SALIDA SI NO HAY CAMBIOS ---

if [[ "$HAS_CONTENT_CHANGES" != true ]]; then

  echo ""
  echo "============================================================"
  echo " NO HAY CAMBIOS QUE PUBLICAR"
  echo "============================================================"
  echo ""
  echo "No se ha subido nada a R2."
  echo "No se ha realizado ningún commit ni push a GitHub."
  echo "No se ha desplegado Cloudflare Workers."
  echo ""
  echo "Proceso finalizado."

  exit 0
fi

# --- CONFIRMACIÓN DE PUBLICACIÓN ---

echo ""

if ! confirm "¿Quieres publicar los cambios en R2, GitHub y Cloudflare?"; then

  echo ""
  echo "Publicación cancelada."
  echo "El contenido permanece sincronizado localmente en src/content."
  exit 0

fi

# --- SUBIDA DE IMÁGENES A R2 ---

echo ""
echo "============================================================"
echo " SUBIENDO IMÁGENES A CLOUDFLARE R2"
echo "============================================================"
echo ""

rclone copy "$CONTENT_DEST" "$R2_REMOTE" \
  --include "*.[jJ][pP][gG]" \
  --include "*.[jJ][pP][eE][gG]" \
  --include "*.[pP][nN][gG]" \
  --include "*.[wW][eE][bB][pP]" \
  --exclude "*" \
  --progress

echo ""
echo "Subida a R2 completada."
echo ""

# --- GIT: COMMIT Y PUSH ---

echo "============================================================"
echo " PUBLICANDO EN GITHUB"
echo "============================================================"
echo ""

# Preparar exclusivamente contenido y manifiesto.
git add -A -- src/content/ "$MANIFEST_FILE"

if git diff --cached --quiet; then

  echo "No hay cambios preparados para registrar en Git."

else

  read -r -p "Mensaje de commit (vacío para usar uno automático): " COMMIT_MSG

  if [[ -z "$COMMIT_MSG" ]]; then
    COMMIT_MSG="content: sync desde Obsidian $(date +'%Y-%m-%d %H:%M')"
  fi

  git commit -m "$COMMIT_MSG" -- src/content/ "$MANIFEST_FILE"

fi

git push "$GIT_REMOTE" "$GIT_BRANCH"

echo ""
echo "Push a GitHub completado."
echo ""

# --- BUILD Y DEPLOY ---

echo "============================================================"
echo " DESPLEGANDO EN CLOUDFLARE WORKERS"
echo "============================================================"
echo ""

npm run deploy

echo ""
echo "============================================================"
echo " PUBLICACIÓN COMPLETADA"
echo "============================================================"
echo ""
echo "Web publicada: $PUBLIC_URL"
echo ""

open "$PUBLIC_URL"

echo "Proceso finalizado."
