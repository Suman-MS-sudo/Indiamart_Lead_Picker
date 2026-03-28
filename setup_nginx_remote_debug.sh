#!/bin/bash
# Script to set up Nginx reverse proxy for Chrome remote debugging on port 443
# Usage: sudo bash setup_nginx_remote_debug.sh

DOMAIN_OR_IP="34.139.208.239"
REMOTE_DEBUG_PORT=9222
NGINX_CONF="/etc/nginx/sites-available/remote_debug"

# Install Nginx if not present
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update && apt-get install -y nginx
fi

# Generate self-signed SSL cert (valid 10 years)
SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$SSL_DIR/remote_debug.key" \
  -out "$SSL_DIR/remote_debug.crt" \
  -subj "/CN=$DOMAIN_OR_IP"

# Create Nginx config
cat > "$NGINX_CONF" <<EOF
server {
    listen 443 ssl;
    server_name $DOMAIN_OR_IP;

    ssl_certificate     $SSL_DIR/remote_debug.crt;
    ssl_certificate_key $SSL_DIR/remote_debug.key;

    location / {
        proxy_pass http://localhost:$REMOTE_DEBUG_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Enable config
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/remote_debug

# Remove default config if exists
rm -f /etc/nginx/sites-enabled/default

# Reload Nginx
nginx -t && systemctl reload nginx

echo "Nginx reverse proxy set up!"
echo "Access Chrome remote debugging at: https://$DOMAIN_OR_IP/"
echo "(You may need to accept a self-signed certificate warning in your browser.)"
