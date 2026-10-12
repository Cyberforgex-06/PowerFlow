#!/bin/sh
set -eu
if [ -n "${DATABASE_URL:-}" ]; then
  flask --app app init-db
fi
exec gunicorn --workers 1 --threads 4 --timeout 60 --bind "0.0.0.0:${PORT:-8000}" app:app
