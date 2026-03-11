FROM alpine:3.22

ARG PB_VERSION=0.27.2
ARG TARGETARCH

WORKDIR /pb

RUN apk add --no-cache ca-certificates curl unzip

RUN case "${TARGETARCH}" in \
    "amd64") PB_ARCH="amd64" ;; \
    "arm64") PB_ARCH="arm64" ;; \
    *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
  esac \
  && curl -fsSL -o /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
  && unzip /tmp/pocketbase.zip -d /pb \
  && rm /tmp/pocketbase.zip \
  && chmod +x /pb/pocketbase

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/pb/pb_data", "/pb/pb_public"]

EXPOSE 8090

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
