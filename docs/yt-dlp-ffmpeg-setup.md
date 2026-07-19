# yt-dlp and FFmpeg Worker Setup

The content-analysis worker downloads media to temporary disk, processes it with yt-dlp/FFmpeg, and stores durable files in Convex Storage.

## Runtime requirements

- Node.js 20+
- `yt-dlp`
- `ffmpeg`
- `NEXT_PUBLIC_CONVEX_URL`
- `TRIGGER_CONVEX_SECRET`

The secret must have the same value in the Convex deployment and Trigger.dev environment.

## Storage flow

1. The Next.js client requests an authenticated upload URL from `convex/fileStorage.ts`.
2. The uploaded Convex `_storage` ID is saved on the `content_analytics` document.
3. `trigger/process-content-analytics.ts` invokes `convex/triggerWorkers.ts` using `TRIGGER_CONVEX_SECRET`.
4. The worker resolves file URLs only for processing and stores generated audio/thumbnails back in Convex Storage.
5. Cleanup deletes the corresponding storage IDs through a Convex mutation.

## Docker image

```dockerfile
FROM node:20-slim

RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]
```

Do not expose Convex worker mutations publicly or pass `TRIGGER_CONVEX_SECRET` to browser code.
