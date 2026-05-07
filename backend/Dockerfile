# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM python:3.11-alpine AS builder

RUN apk add --no-cache gcc musl-dev postgresql-dev libffi-dev openssl-dev

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM python:3.11-alpine

RUN apk add --no-cache \
    bash \
    libpq \
    libffi \
    openssl \
    netcat-openbsd

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN chmod +x start.sh && mkdir -p data

EXPOSE 5010

CMD ["/app/start.sh"]
