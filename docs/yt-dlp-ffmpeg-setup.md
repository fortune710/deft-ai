## Project Struture
```bash
yt-worker/
├─ Dockerfile
├─ package.json
├─ index.js
└─ .env (local only)
```

## Dockerfile
```bash
FROM node:20-slim

# Install ffmpeg + dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node", "index.js"]
```

##Package.json
```json
{
  "name": "yt-worker",
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.19.2"
  }
}
```

## Server Code
```ts
import express from "express";
import { exec } from "child_process";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/download", async (req, res) => {
  const { url, path } = req.body;

  if (!url || !path) {
    return res.status(400).json({ error: "Missing url or path" });
  }

  const outputFile = "/tmp/video.mp4";

  const cmd = `
    yt-dlp -f "bestvideo+bestaudio/best" --merge-output-format mp4 -o "${outputFile}" "${url}"
  `;

  exec(cmd, async (error) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const stream = fs.createReadStream(outputFile);

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, stream, {
        contentType: "video/mp4",
        upsert: true,
      });

    fs.unlinkSync(outputFile);

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    res.json({ success: true });
  });
});

app.listen(3000, () => {
  console.log("yt-worker running on port 3000");
});

```

##Call from Next.js
```ts
// app/api/trigger-download/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { url, id } = await req.json();

  const res = await fetch(
    process.env.YT_WORKER_URL + "/download",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        path: `videos/${id}.mp4`,
      }),
    }
  );

  const data = await res.json();

  return NextResponse.json(data);
}

```

##Extract Audio
```ts
import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // for downloading video if needed
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TMP_DIR = "/tmp";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

/**
 * POST /extract-audio
 * {
 *   "videoUrl": "<Supabase public URL or any video URL>",
 *   "uploadPath": "audios/audio1.mp3" // optional
 * }
 */
app.post("/extract-audio", async (req, res) => {
  const { videoUrl, uploadPath } = req.body;
  if (!videoUrl) return res.status(400).json({ error: "Missing videoUrl" });

  const videoPath = path.join(TMP_DIR, "video.mp4");
  const audioPath = path.join(TMP_DIR, "audio.mp3");

  try {
    // 1️⃣ Download the video to TMP_DIR
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Failed to fetch video");

    const videoStream = fs.createWriteStream(videoPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(videoStream);
      response.body.on("error", reject);
      videoStream.on("finish", resolve);
    });

    // 2️⃣ Extract audio using ffmpeg
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -y -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${audioPath}"`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 3️⃣ If uploadPath provided, upload to Supabase
    if (uploadPath) {
      const stream = fs.createReadStream(audioPath);
      const { error: uploadError } = await supabase.storage
        .from("audios")
        .upload(uploadPath, stream, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      // Cleanup
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);

      return res.json({
        success: true,
        message: "Audio extracted and uploaded",
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/audios/${uploadPath}`,
      });
    }

    // 4️⃣ Otherwise, stream audio back to client
    res.setHeader("Content-Type", "audio/mpeg");
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);

    audioStream.on("end", () => {
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Audio extraction server running on port 3000"));
```