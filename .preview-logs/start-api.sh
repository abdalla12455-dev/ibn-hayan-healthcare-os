#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://z@127.0.0.1:5433/ibnhayan_preview?schema=public"
export API_PORT=3001
export WEB_ORIGIN="http://localhost:3000"
export PATH="/home/z/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
unset NODE_ENV
exec /home/z/.local/bin/pnpm --filter @ibn-hayan/api start:dev
