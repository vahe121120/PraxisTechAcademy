# syntax=docker/dockerfile:1
# Minimal backup image: Alpine + postgresql-client (pg_dump) + bash + cron.
FROM alpine:3.21

RUN apk add --no-cache postgresql17-client bash dcron

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Entrypoint: write the cron schedule from env and run crond in foreground.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
