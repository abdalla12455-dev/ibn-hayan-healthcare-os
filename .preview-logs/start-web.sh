#!/bin/bash
cd /home/z/my-project/apps/web
export DATABASE_URL="postgresql://z@127.0.0.1:5433/ibnhayan_preview?schema=public"
export NEXT_PUBLIC_API_BASE_URL="/api/v1"
export PORT=3002
export PATH="/home/z/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
exec /home/z/.local/bin/pnpm exec next start -p 3002
