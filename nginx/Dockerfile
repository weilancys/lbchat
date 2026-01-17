FROM nginx:alpine

# Copy config templates
COPY nginx.http.conf /etc/nginx/templates/nginx.http.conf
COPY nginx.ssl.conf.template /etc/nginx/templates/nginx.ssl.conf.template

# Copy and set entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create certbot webroot directory
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
