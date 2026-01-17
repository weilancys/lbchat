#!/bin/sh
# Entrypoint script for nginx container
# Replaces ${DOMAIN} in the config template with actual value from environment

set -e

# Check if we're in SSL mode (DOMAIN is set and SSL cert exists)
if [ -n "$DOMAIN" ] && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "SSL mode: Using domain $DOMAIN"
    # Substitute environment variables in SSL template
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx.ssl.conf.template > /etc/nginx/nginx.conf
else
    echo "HTTP mode: SSL not configured (DOMAIN=$DOMAIN)"
    # Use HTTP-only config
    cp /etc/nginx/templates/nginx.http.conf /etc/nginx/nginx.conf
fi

# Start nginx
exec nginx -g 'daemon off;'
