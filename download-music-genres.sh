#!/usr/bin/env bash
# ==============================================================================
# Resonance v2.0 — Descargador Multi-Género con Etiquetado ID3 + Sync Navidrome
# ==============================================================================
# Descarga canciones en MP3 con carátula incrustada y fuerza las etiquetas ID3
# (Genre, Artist, Title, Album) para que Navidrome y Resonance muestren todos
# los filtros de géneros poblados y sin "[Unknown Artist]".
#
# Modos de uso:
#   1) Descargar pack automático de 10 géneros (3 canciones por género = 30 pistas):
#        ./download-music-genres.sh pack ./musica_descargada 3
#
#   2) Descargar un género o búsqueda/URL específica (YouTube, SoundCloud, etc.):
#        ./download-music-genres.sh custom "Pop" "ytsearch5:Dua Lipa official audio" ./musica_descargada
#        ./download-music-genres.sh custom "Hip-Hop" "https://www.youtube.com/watch?v=..." ./musica_descargada
#
#   3) Disparar re-escaneo en Navidrome (movil + musica) y sincronizar Resonance:
#        ./download-music-genres.sh sync
# ==============================================================================

set -euo pipefail

MODE="${1:-help}"
SUBSONIC_USER="Nidus"
SUBSONIC_PASS="115r935m"
PRIMARY_NAVIDROME="https://movil.res0nance.pp.ua"
SECONDARY_NAVIDROME="https://musica.res0nance.pp.ua"
LOCAL_API="http://localhost:5000"

check_deps() {
  for cmd in yt-dlp ffmpeg; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "❌ Falta '$cmd'. Instálalo primero:"
      echo "   • Debian/Ubuntu/Fedora: sudo apt install -y yt-dlp ffmpeg  (o sudo dnf install yt-dlp ffmpeg)"
      echo "   • Termux (Android):     pkg install -y python ffmpeg && pip install -U yt-dlp"
      exit 1
    fi
  done
}

# Descarga una búsqueda o URL con yt-dlp y fuerza la etiqueta ID3 'genre' con ffmpeg
download_with_genre() {
  local genre="$1"
  local query="$2"
  local out_root="$3"
  local genre_dir="${out_root}/${genre//\//-}"
  mkdir -p "$genre_dir"

  echo ""
  echo "🎵 [Género: ${genre}] Descargando: ${query}"
  echo "   Carpeta destino: ${genre_dir}"

  yt-dlp \
    --ignore-errors \
    --no-playlist \
    --extract-audio \
    --audio-format mp3 \
    --audio-quality 0 \
    --embed-thumbnail \
    --embed-metadata \
    --add-metadata \
    --parse-metadata "title:%(artist)s - %(title)s" \
    --postprocessor-args "Metadata:-metadata genre=${genre}" \
    --output "${genre_dir}/%(artist,uploader|Resonance Artist)s - %(title)s.%(ext)s" \
    "$query" || true
}

trigger_sync() {
  echo ""
  echo "🔄 1/2 Solicitando startScan en Navidrome (movil y musica)..."
  curl -fsSL "${PRIMARY_NAVIDROME}/rest/startScan.view?u=${SUBSONIC_USER}&p=${SUBSONIC_PASS}&v=1.16.1&c=Resonance&f=json" >/dev/null 2>&1 \
    && echo "   ✅ Scan iniciado en ${PRIMARY_NAVIDROME}" \
    || echo "   ⚠️ No se pudo iniciar scan en ${PRIMARY_NAVIDROME}"

  curl -fsSL "${SECONDARY_NAVIDROME}/rest/startScan.view?u=${SUBSONIC_USER}&p=${SUBSONIC_PASS}&v=1.16.1&c=Resonance&f=json" >/dev/null 2>&1 \
    && echo "   ✅ Scan iniciado en ${SECONDARY_NAVIDROME}" \
    || echo "   ⚠️ No se pudo iniciar scan en ${SECONDARY_NAVIDROME}"

  sleep 3
  echo "🔄 2/2 Sincronizando catálogo Subsonic -> PostgreSQL 16 en Resonance..."
  for api_base in "$LOCAL_API" "$PRIMARY_NAVIDROME" "$SECONDARY_NAVIDROME"; do
    if curl -fsSL -X POST "${api_base}/api/songs/sync-server?source=both" 2>/dev/null; then
      echo ""
      echo "   ✅ Catálogo sincronizado en ${api_base}"
    fi
  done
}

case "$MODE" in
  pack)
    check_deps
    OUT_DIR="${2:-./musica_resonancia}"
    PER_GENRE="${3:-3}"
    mkdir -p "$OUT_DIR"

    echo "🚀 Iniciando descarga de Pack Multi-Género (${PER_GENRE} canciones por género) en: ${OUT_DIR}"

    declare -a GENRE_QUERIES=(
      "Pop|ytsearch${PER_GENRE}:The Weeknd Blinding Lights Daft Punk Dua Lipa official audio"
      "Rock en Español|ytsearch${PER_GENRE}:Soda Stereo Cerati Heroes del Silencio Enanitos Verdes audio"
      "Alternative Rock|ytsearch${PER_GENRE}:Arctic Monkeys Muse The Strokes Linkin Park official audio"
      "Hip-Hop|ytsearch${PER_GENRE}:Kendrick Lamar Travis Scott Eminem Post Malone official audio"
      "Electronic|ytsearch${PER_GENRE}:Daft Punk Disclosure Rufus Du Sol Justice official audio"
      "Latino Urbano|ytsearch${PER_GENRE}:Bad Bunny Feid Rauw Alejandro Tainy official audio"
      "Indie|ytsearch${PER_GENRE}:Tame Impala Gorillaz MGMT Foster The People official audio"
      "Jazz Lo-Fi|ytsearch${PER_GENRE}:Nujabes Lofi Hip Hop Chillhop Kamasi Washington audio"
      "Synthwave|ytsearch${PER_GENRE}:Kavinsky Nightcall Carpenter Brut The Midnight Perturbator audio"
      "Metal|ytsearch${PER_GENRE}:Bring Me The Horizon Spiritbox Deftones Slipknot official audio"
    )

    for entry in "${GENRE_QUERIES[@]}"; do
      IFS='|' read -r genre query <<< "$entry"
      download_with_genre "$genre" "$query" "$OUT_DIR"
    done

    echo ""
    echo "✅ Pack Multi-Género completado en: ${OUT_DIR}"
    echo "💡 Copia las carpetas dentro del directorio MusicFolder de tu Navidrome y luego corre:"
    echo "   ./download-music-genres.sh sync"
    ;;

  custom)
    check_deps
    GENRE="${2:-}"
    QUERY="${3:-}"
    OUT_DIR="${4:-./musica_resonancia}"
    if [[ -z "$GENRE" || -z "$QUERY" ]]; then
      echo "Uso: ./download-music-genres.sh custom \"<Género>\" \"<ytsearchN:búsqueda o URL>\" [carpeta_destino]"
      exit 1
    fi
    download_with_genre "$GENRE" "$QUERY" "$OUT_DIR"
    echo "✅ Descarga personalizada completada en: ${OUT_DIR}/${GENRE//\//-}"
    ;;

  sync)
    trigger_sync
    ;;

  *)
    cat <<'EOF'
Uso de ./download-music-genres.sh:

  1. Descargar Pack Automático de 10 Géneros (Pop, Rock en Español, Alternative Rock,
     Hip-Hop, Electronic, Latino Urbano, Indie, Jazz Lo-Fi, Synthwave, Metal):
       ./download-music-genres.sh pack [carpeta_destino] [canciones_por_genero]
     Ejemplo:
       ./download-music-genres.sh pack ./musica_resonancia 4

  2. Descargar cualquier canción, artista o playlist asignándole un Género ID3:
       ./download-music-genres.sh custom "<Género>" "<ytsearchN:... o URL>" [carpeta_destino]
     Ejemplos:
       ./download-music-genres.sh custom "Reggaeton" "ytsearch5:Bad Bunny Un Verano Sin Ti audio"
       ./download-music-genres.sh custom "Salsa" "ytsearch5:Hector Lavoe Willie Colon audio"

  3. Re-escanear Navidrome (movil + musica) y sincronizar PostgreSQL en Resonance:
       ./download-music-genres.sh sync
EOF
    ;;
esac
