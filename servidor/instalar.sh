#!/usr/bin/env bash
# Instala/atualiza o servidor de GIF do Mail Studio (Docker).
set -e
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  read -rsp "Crie uma senha para o upload de imagens: " P; echo
  [ -n "$P" ] || { echo "Senha vazia, cancelado."; exit 1; }
  printf 'UPLOAD_TOKEN=%s\nALLOWED_ORIGINS=https://mailstudio.lamarketing.com.br\n' "$P" > .env
  chmod 600 .env
fi
docker compose up -d --build
echo
echo "Pronto. Teste local:"
echo "  curl -s -o /tmp/t.gif -w '%{http_code} %{content_type}\n' 'http://127.0.0.1:8081/api/countdown.php?end=2000000000'"
