#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=$(dirname -- "$script_dir")
requested_port=${1:-8080}

preview_port=$(
  python3 - "$requested_port" <<'PY'
import socket
import sys

port = int(sys.argv[1])

while port <= 65535:
    with socket.socket() as candidate:
        try:
            candidate.bind(("127.0.0.1", port))
        except OSError:
            port += 1
        else:
            print(port)
            break
else:
    raise SystemExit("No available preview port found")
PY
)

cd "$project_dir"

echo "Preview: http://127.0.0.1:${preview_port}/preview/manga/"
python3 -m http.server "$preview_port" --bind 127.0.0.1