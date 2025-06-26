#!/bin/sh

# Replace variables in env.prod.js with Docker runtime environment values
envsubst < /usr/share/nginx/html/assets/env.prod.js > /usr/share/nginx/html/assets/env.js

# Start nginx
exec "$@"