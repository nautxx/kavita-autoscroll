FROM nginx:alpine

ARG AUTOSCROLL_VERSION=dev

ENV KAVITA_UPSTREAM=http://kavita:5000 \
    AUTOSCROLL_VERSION=${AUTOSCROLL_VERSION} \
    AUTOSCROLL_TOGGLE_SHORTCUT=s \
    AUTOSCROLL_SLOWER_SHORTCUT=[ \
    AUTOSCROLL_FASTER_SHORTCUT=] \
    AUTOSCROLL_HIDE_SHORTCUT=a \
    AUTOSCROLL_SPEED_STEP=25 \
    AUTOSCROLL_AUTO_START=false \
    AUTOSCROLL_SLIP_MODE=false \
    NGINX_ENVSUBST_FILTER='^(KAVITA_UPSTREAM|AUTOSCROLL_VERSION|AUTOSCROLL_TOGGLE_SHORTCUT|AUTOSCROLL_SLOWER_SHORTCUT|AUTOSCROLL_FASTER_SHORTCUT|AUTOSCROLL_HIDE_SHORTCUT|AUTOSCROLL_SPEED_STEP|AUTOSCROLL_AUTO_START|AUTOSCROLL_SLIP_MODE)$'

LABEL org.opencontainers.image.title="Scrollito Injector" \
      org.opencontainers.image.description="Injects Scrollito into proxied Kavita pages" \
      org.opencontainers.image.source="https://github.com/nautxx/scrollito" \
      org.opencontainers.image.licenses="MIT"

COPY injector/default.conf.template /etc/nginx/templates/default.conf.template
COPY scrollito.user.js /usr/share/nginx/html/scrollito.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --output-document=/dev/null http://127.0.0.1/_scrollito/scrollito.js || exit 1
