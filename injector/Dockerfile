FROM nginx:alpine

ARG AUTOSCROLL_VERSION=dev

ENV KAVITA_UPSTREAM=http://kavita:5000 \
    AUTOSCROLL_VERSION=${AUTOSCROLL_VERSION} \
    AUTOSCROLL_TOGGLE_SHORTCUT=s \
    AUTOSCROLL_SLOWER_SHORTCUT=[ \
    AUTOSCROLL_FASTER_SHORTCUT=] \
    AUTOSCROLL_SPEED_STEP=5 \
    NGINX_ENVSUBST_FILTER='^(KAVITA_UPSTREAM|AUTOSCROLL_VERSION|AUTOSCROLL_TOGGLE_SHORTCUT|AUTOSCROLL_SLOWER_SHORTCUT|AUTOSCROLL_FASTER_SHORTCUT|AUTOSCROLL_SPEED_STEP)$'

LABEL org.opencontainers.image.title="Kavita Webtoon Auto-scroll Injector" \
      org.opencontainers.image.description="Injects Kavita Webtoon Auto-scroll into proxied Kavita pages" \
      org.opencontainers.image.source="https://github.com/nautxx/kavita-autoscroll" \
      org.opencontainers.image.licenses="MIT"

COPY injector/default.conf.template /etc/nginx/templates/default.conf.template
COPY kavita-autoscroll.user.js /usr/share/nginx/html/kavita-autoscroll.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --output-document=/dev/null http://127.0.0.1/_kavita-autoscroll/kavita-autoscroll.js || exit 1
