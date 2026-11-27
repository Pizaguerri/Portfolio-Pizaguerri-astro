
#!/bin/bash

# ============================================================
# sync-content.sh
#
# Flujo editorial:
# Obsidian -> Astro -> R2 -> Cloudflare Cache -> GitHub -> Workers
#
# Obsidian es la fuente de verdad.
# R2 refleja exclusivamente las imágenes de src/content.
# ============================================================

set -Eeuo pipefail

# --- RUTAS ---

OBSIDIAN_SOURCE="/Users/pabloizaguerri/Library/Mobile Documents/iCloud~md~obsidian/Documents/Pizaguerri/03 Projectes/Portfolio-Pizaguerri"

ASTRO_REPO="/Users/pabloizaguerri/Library/Mobile Documents/com~apple~CloudDocs/Coding Room/Astro-Portfolio-Pizaguerri"

CONTENT_DEST="$ASTRO_REPO/src/content"

MANIFEST_FILE="src/data/media-manifest.json"
MANIFEST_SCRIPT="src/scripts/generate-media-manifest.js"

# --- PUBLICACIÓN ---

R2_REMOTE="r2-pablo:pizaguerri-portfolio"

GIT_REMOTE="origin"
GIT_BRANCH="main"

PUBLIC_URL="https://pabloizaguerri.org"
LOCAL_URL="http://localhost:4321"

MEDIA_URL="https://media.pabloizaguerri.org"

CF_ZONE_ID="8b8956f41269b6b4901c26a5b482aa0c"
CF_KEYCHAIN_SERVICE="cloudflare-pablo-cache-purge"

# --- PURGAS PENDIENTES ---

PENDING_DIR="$HOME/Library/Application Support/PizaguerriPortfolio"
PENDING_FILE="$PENDING_DIR/pending-purge-urls.txt"

# --- FILTROS R2 ---

R2_FILTERS=(
  --filter "+ *.[jJ][pP][gG]"
  --filter "+ *.[jJ][pP][eE][gG]"
  --filter "+ *.[pP][nN][gG]"
  --filter "+ *.[wW][eE][bB][pP]"
  --filter "- *"
)

# --- VARIABLES INTERNAS ---

DEV_PID=""
SYNC_PREVIEW=""
HAS_CONTENT_CHANGES=false
HAS_GIT_CHANGES=false
R2_CHANGE_COUNT=0
CF_TOKEN=""

# Opciones compartidas por la simulación y la sincronización real.
RSYNC_OPTIONS=(
  --exclude='.DS_Store'
  --omit-dir-times
)

# --- FUNCIONES GENERALES ---

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

  unset CF_TOKEN
}

# --- VALIDACIÓN GIT ---

check_git_changes() {
  local unexpected_changes

  unexpected_changes=$(git status --porcelain --untracked-files=all -- \
    . \
    ':(exclude)src/content' \
    ':(exclude)src/data/media-manifest.json' \
    ':(exclude)src/scripts/generate-media-manifest.js' \
    ':(exclude)sync-content.sh' \
    ':(exclude)publicar-portfolio.command' \
    ':(exclude).gitignore')

  if [[ -n "$unexpected_changes" ]]; then

    echo ""
    echo "ATENCIÓN: hay cambios ajenos al contenido editorial."
    echo ""
    printf '%s\n' "$unexpected_changes"
    echo ""
    echo "No se continuará para evitar publicar cambios"
    echo "locales que no estén preparados."

    return 1
  fi

  return 0
}

check_git_index() {
  if ! git diff --cached --quiet; then

    echo ""
    echo "ERROR: hay cambios preparados en el índice de Git."
    echo "Registra o retira esos cambios antes de continuar."

    return 1
  fi

  return 0
}

# --- VALIDACIÓN DEL MANIFIESTO ---

validate_manifest() {

  [[ -s "$MANIFEST_FILE" ]] || \
    error "El manifiesto no existe o está vacío."

  node -e '
    const fs = require("fs");
    JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  ' "$MANIFEST_FILE" || \
    error "El manifiesto contiene JSON inválido."

  echo "Manifiesto JSON válido."
}

# --- AUTENTICACIÓN CLOUDFLARE ---

load_cloudflare_token() {

  echo "Leyendo token de Cloudflare desde el Llavero..."

  CF_TOKEN=$(security find-generic-password \
    -a "$USER" \
    -s "$CF_KEYCHAIN_SERVICE" \
    -w 2>/dev/null) || \
    error "No se encuentra el token de Cloudflare en el Llavero."

  [[ -n "$CF_TOKEN" ]] || \
    error "El token de Cloudflare está vacío."

  echo "Token encontrado."
}

validate_cloudflare_auth() {

  local response

  response=$(curl -fsS \
    "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json") || \
    error "No se pudo consultar la zona de Cloudflare."

  printf '%s' "$response" | python3 -c '
import json, sys
data = json.load(sys.stdin)
if not data.get("success"):
    print("Autenticación Cloudflare no válida:", data.get("errors"))
    sys.exit(1)
' || error "El token no tiene acceso válido a la zona."

  echo "Autenticación Cloudflare correcta."
}

# --- CONVERSIÓN DE RUTAS A URL PÚBLICAS ---

path_to_url() {

  local relative_path="$1"

  node -e '
    const path = process.argv[1];
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    console.log(process.env.MEDIA_URL + "/" + encoded);
  ' "$relative_path"
}

# --- REGISTRO DE PURGAS PENDIENTES ---

queue_purge_urls() {

  local source_file="$1"
  local line
  local status
  local relative_path
  local url
  local temp_file

  temp_file=$(mktemp)

  while IFS= read -r line || [[ -n "$line" ]]; do

    [[ ${#line} -ge 3 ]] || continue

    status="${line:0:1}"
    relative_path="${line:2}"

    case "$status" in
      +|\*|-)
        url=$(path_to_url "$relative_path")
        printf '%s\n' "$url" >> "$temp_file"
        ;;
      !)
        rm -f "$temp_file"
        error "Rclone ha detectado un error: $relative_path"
        ;;
    esac

  done < "$source_file"

  if [[ -s "$temp_file" ]]; then

    mkdir -p "$PENDING_DIR"

    if [[ -f "$PENDING_FILE" ]]; then
      cat "$PENDING_FILE" "$temp_file" |
        sort -u > "$PENDING_FILE.tmp"
    else
      sort -u "$temp_file" > "$PENDING_FILE.tmp"
    fi

    mv "$PENDING_FILE.tmp" "$PENDING_FILE"

  fi

  rm -f "$temp_file"
}

# --- PURGA CLOUDFLARE ---

purge_batch() {

  local urls=("$@")
  local payload
  local response

  payload=$(printf '%s\n' "${urls[@]}" | python3 -c '
import json, sys
urls = [line.strip() for line in sys.stdin if line.strip()]
print(json.dumps({"files": urls}))
')

  response=$(curl -fsS \
    -X POST \
    "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary "$payload") || \
    error "Falló la petición de purga a Cloudflare."

  printf '%s' "$response" | python3 -c '
import json, sys
data = json.load(sys.stdin)
if not data.get("success"):
    print("Error de purga:", data.get("errors"))
    sys.exit(1)
' || error "Cloudflare no ha confirmado la purga."

  echo "Lote purgado correctamente: ${#urls[@]} URL."
}

purge_pending_urls() {

  local batch=()

  [[ -s "$PENDING_FILE" ]] || {
    echo "No hay URL pendientes de purga."
    return 0
  }

  echo ""
  echo "============================================================"
  echo " PURGANDO CACHÉ DE CLOUDFLARE"
  echo "============================================================"
  echo ""

  echo "URL pendientes: $(wc -l < "$PENDING_FILE" | tr -d ' ')"

  while IFS= read -r url || [[ -n "$url" ]]; do

    [[ -n "$url" ]] || continue

    batch+=("$url")

    if [[ ${#batch[@]} -ge 30 ]]; then
      purge_batch "${batch[@]}"
      batch=()
    fi

  done < "$PENDING_FILE"

  if [[ ${#batch[@]} -gt 0 ]]; then
    purge_batch "${batch[@]}"
  fi

  # Solo se vacía el archivo cuando todos los lotes
  # han sido aceptados correctamente por Cloudflare.
  : > "$PENDING_FILE"

  echo ""
  echo "Todas las URL pendientes han sido purgadas."
}

# --- TRAP ---

trap cleanup EXIT

# --- VALIDACIONES INICIALES ---

echo ""
echo "============================================================"
echo " PUBLICACIÓN DEL PORTFOLIO"
echo "============================================================"
echo ""

echo "Origen Obsidian: $OBSIDIAN_SOURCE"
echo "Destino Astro:   $CONTENT_DEST"
echo "Destino R2:      $R2_REMOTE"
echo ""

[[ -d "$OBSIDIAN_SOURCE" ]] || \
  error "No se encuentra la carpeta de Obsidian."

[[ -d "$ASTRO_REPO" ]] || \
  error "No se encuentra el repositorio Astro."

[[ -d "$CONTENT_DEST" ]] || \
  error "No se encuentra src/content."

[[ -d "$OBSIDIAN_SOURCE/bio" ]] || \
  error "No se encuentra bio en Obsidian."

[[ -d "$OBSIDIAN_SOURCE/text" ]] || \
  error "No se encuentra text en Obsidian."

[[ -d "$OBSIDIAN_SOURCE/work" ]] || \
  error "No se encuentra work en Obsidian."

[[ -f "$ASTRO_REPO/package.json" ]] || \
  error "No se encuentra package.json."

[[ -f "$ASTRO_REPO/wrangler.jsonc" ]] || \
  error "No se encuentra wrangler.jsonc."

[[ -f "$ASTRO_REPO/$MANIFEST_SCRIPT" ]] || \
  error "No se encuentra el generador del manifiesto."

OBSIDIAN_FILE_COUNT=$(find "$OBSIDIAN_SOURCE" \
  -type f ! -name '.DS_Store' | wc -l | tr -d ' ')

ASTRO_FILE_COUNT=$(find "$CONTENT_DEST" \
  -type f ! -name '.DS_Store' | wc -l | tr -d ' ')

[[ "$OBSIDIAN_FILE_COUNT" -gt 0 ]] || \
  error "La carpeta de Obsidian está vacía."

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
command -v python3 >/dev/null 2>&1 || error "No se encuentra python3."

mkdir -p "$PENDING_DIR"

echo "Archivos en Obsidian: $OBSIDIAN_FILE_COUNT"
echo "Archivos en Astro:    $ASTRO_FILE_COUNT"
echo ""

echo "Validaciones iniciales completadas."

check_git_changes || exit 1
check_git_index || exit 1

# --- SIMULACIÓN OBSIDIAN -> ASTRO ---

echo ""
echo "============================================================"
echo " SIMULACIÓN DE SINCRONIZACIÓN"
echo "============================================================"
echo ""

SYNC_PREVIEW=$(mktemp)

rsync -ani --delete \
  "${RSYNC_OPTIONS[@]}" \
  "$OBSIDIAN_SOURCE/" \
  "$CONTENT_DEST/" | tee "$SYNC_PREVIEW"

echo ""

if grep -q '^\*deleting ' "$SYNC_PREVIEW"; then

  echo "ATENCIÓN: se eliminarán archivos de src/content."
  echo ""

  confirm "¿Confirmas estas eliminaciones y la sincronización?" || {
    echo "Sincronización cancelada."
    exit 0
  }

else

  if [[ "$OBSIDIAN_FILE_COUNT" -lt "$ASTRO_FILE_COUNT" ]]; then

    echo "ATENCIÓN: Obsidian contiene menos archivos que Astro."
    echo "Comprueba que iCloud haya terminado de sincronizar."
    echo ""

    confirm "¿Quieres continuar de todos modos?" || exit 0

  else

    confirm "¿Aplicar la sincronización de Obsidian a Astro?" || {
      echo "Sincronización cancelada."
      exit 0
    }

  fi

fi

# --- SINCRONIZACIÓN OBSIDIAN -> ASTRO ---

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

# --- GENERACIÓN DEL MANIFIESTO ---

echo ""
echo "============================================================"
echo " GENERANDO MANIFIESTO DE IMÁGENES"
echo "============================================================"
echo ""

npm run generate:media

validate_manifest

# --- DETECCIÓN DE CAMBIOS GIT ---

echo ""
echo "============================================================"
echo " COMPROBANDO CAMBIOS EDITORIALES"
echo "============================================================"
echo ""

check_git_changes || exit 1

CHANGED_CONTENT=$(git status --porcelain --untracked-files=all -- \
  src/content/ "$MANIFEST_FILE")

if [[ -n "$CHANGED_CONTENT" ]]; then

  HAS_GIT_CHANGES=true

  echo "Cambios detectados:"
  printf '%s\n' "$CHANGED_CONTENT"

else

  HAS_GIT_CHANGES=false

  echo "No hay cambios editoriales respecto a Git."

fi

CONTENT_STATUS=$(git status --porcelain --untracked-files=all -- src/content/)

if [[ -n "$CONTENT_STATUS" ]]; then
  HAS_CONTENT_CHANGES=true
else
  HAS_CONTENT_CHANGES=false
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

  [[ "$SERVER_READY" == true ]] || {
    cat /tmp/astro-portfolio-preview.log
    error "Astro no ha respondido en 30 segundos."
  }

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

# --- SIMULACIÓN R2 ---

echo ""
echo "============================================================"
echo " SIMULACIÓN DE SINCRONIZACIÓN R2"
echo "============================================================"
echo ""

SYNC_PREVIEW=$(mktemp)

rclone sync "$CONTENT_DEST" "$R2_REMOTE" \
  --checksum \
  "${R2_FILTERS[@]}" \
  --dry-run \
  --combined "$SYNC_PREVIEW"

cat "$SYNC_PREVIEW"

echo ""

R2_CHANGE_COUNT=0

while IFS= read -r line || [[ -n "$line" ]]; do

  [[ ${#line} -ge 3 ]] || continue

  status="${line:0:1}"

  case "$status" in
    +|\*|-)
      R2_CHANGE_COUNT=$((R2_CHANGE_COUNT + 1))
      ;;
    !)
      error "Rclone ha detectado un error: ${line:2}"
      ;;
  esac

done < "$SYNC_PREVIEW"

echo "Cambios detectados en R2: $R2_CHANGE_COUNT"

if grep -q '^- ' "$SYNC_PREVIEW"; then

  echo ""
  echo "ATENCIÓN: hay imágenes que se eliminarán de R2."
  echo "Estas eliminaciones corresponden a archivos que ya no"
  echo "existen en src/content."
  echo ""

  confirm "¿Confirmas las eliminaciones de imágenes en R2?" || {
    echo "Sincronización R2 cancelada."
    exit 0
  }

fi

# --- CONFIRMACIÓN GENERAL ---

echo ""

if [[ "$R2_CHANGE_COUNT" -eq 0 && "$HAS_GIT_CHANGES" != true ]]; then

  if [[ ! -s "$PENDING_FILE" ]]; then

    echo "No hay cambios en Astro, R2 ni GitHub."
    echo "No es necesario publicar."
    exit 0

  fi

else

  echo "Resumen de publicación:"
  echo "  Cambios en R2: $R2_CHANGE_COUNT"
  echo "  Cambios Git:   $HAS_GIT_CHANGES"
  echo "  Cambios web:   $HAS_CONTENT_CHANGES"
  echo ""

  confirm "¿Quieres continuar con la publicación?" || {
    echo "Publicación cancelada."
    exit 0
  }

fi

# --- REGISTRAR PURGAS ANTES DE MODIFICAR R2 ---

queue_purge_urls "$SYNC_PREVIEW"

# --- AUTENTICACIÓN CLOUDFLARE ---

load_cloudflare_token
validate_cloudflare_auth

# --- SINCRONIZACIÓN REAL R2 ---

if [[ "$R2_CHANGE_COUNT" -gt 0 ]]; then

  echo ""
  echo "============================================================"
  echo " SINCRONIZANDO IMÁGENES CON R2"
  echo "============================================================"
  echo ""

  rclone sync "$CONTENT_DEST" "$R2_REMOTE" \
    --checksum \
    "${R2_FILTERS[@]}" \
    --progress

  echo ""
  echo "Sincronización R2 completada."

else

  echo ""
  echo "R2 ya está sincronizado."

fi

# --- PURGA DE CACHÉ ---

purge_pending_urls

# --- GIT: COMMIT Y PUSH ---

if [[ "$HAS_GIT_CHANGES" == true ]]; then

  echo ""
  echo "============================================================"
  echo " PUBLICANDO EN GITHUB"
  echo "============================================================"
  echo ""

  git add -A -- \
    src/content/ \
    "$MANIFEST_FILE" \
    "$MANIFEST_SCRIPT" \
    sync-content.sh \
    .gitignore

  if ! git diff --cached --quiet; then

    read -r -p "Mensaje de commit (vacío para usar uno automático): " COMMIT_MSG

    if [[ -z "$COMMIT_MSG" ]]; then
      COMMIT_MSG="content: sync desde Obsidian $(date +'%Y-%m-%d %H:%M')"
    fi

    git commit -m "$COMMIT_MSG"

  fi

  git push "$GIT_REMOTE" "$GIT_BRANCH"

  echo ""
  echo "Push a GitHub completado."

else

  echo ""
  echo "No hay cambios que registrar en GitHub."

fi

# --- BUILD Y DEPLOY ---

if [[ "$HAS_CONTENT_CHANGES" == true ]]; then

  echo ""
  echo "============================================================"
  echo " DESPLEGANDO EN CLOUDFLARE WORKERS"
  echo "============================================================"
  echo ""

  npm run deploy

else

  echo ""
  echo "No hay cambios en src/content."
  echo "No es necesario desplegar Workers."

fi

# --- FINAL ---

echo ""
echo "============================================================"
echo " PUBLICACIÓN COMPLETADA"
echo "============================================================"
echo ""

echo "Web: $PUBLIC_URL"
echo "Medios: $MEDIA_URL"
echo ""

open "$PUBLIC_URL"

echo "Proceso finalizado."
