FROM node:20-alpine AS node-base
FROM python:3.11-alpine

COPY --from=node-base /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY . .

RUN addgroup -S devopsdsl && adduser -S devopsdsl -G devopsdsl \
    && chown -R devopsdsl:devopsdsl /app
USER devopsdsl

ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["python", "server.py"]
