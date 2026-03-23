import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OAuth URLs
  app.get("/api/auth/youtube/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/youtube/callback`;
    const params = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || 'dummy_id',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get("/api/auth/instagram/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/instagram/callback`;
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID || 'dummy_id',
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
      response_type: 'code'
    });
    res.json({ url: `https://api.instagram.com/oauth/authorize?${params}` });
  });

  // OAuth Callbacks
  app.get("/auth/youtube/callback", (req, res) => {
    const { code } = req.query;
    // In a real app, exchange code for tokens here
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'YOUTUBE_AUTH_SUCCESS', code: '${code}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>YouTube connected! This window should close.</p>
        </body>
      </html>
    `);
  });

  app.get("/auth/instagram/callback", (req, res) => {
    const { code } = req.query;
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'INSTAGRAM_AUTH_SUCCESS', code: '${code}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Instagram connected! This window should close.</p>
        </body>
      </html>
    `);
  });

  // Kling AI Proxy
  app.post("/api/generate-video", async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.VIDEO_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "VIDEO_API_KEY not configured" });
    }

    try {
      // 1. Create Task
      console.log("Creating Kling AI task with prompt:", prompt);
      const createResponse = await fetch("https://api.klingai.com/v1/videos/text2video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-API-KEY": apiKey // Fallback for some proxy providers
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: "9:16",
          duration: "5"
        })
      });

      const createData = await createResponse.json();
      if (!createResponse.ok) {
        console.error("Kling AI Create Task Failed:", createData);
        throw new Error(createData.message || createData.error?.message || "Auth failed or invalid request");
      }

      const taskId = createData.data.task_id;
      console.log("Kling AI Task Created:", taskId);

      // 2. Poll for completion
      let videoUrl = null;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes (videos take time)

      while (!videoUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusResponse = await fetch(`https://api.klingai.com/v1/videos/task/${taskId}`, {
          headers: { 
            "Authorization": `Bearer ${apiKey}`,
            "X-API-KEY": apiKey
          }
        });
        const statusData = await statusResponse.json();
        
        if (statusData.data.task_status === "succeed") {
          videoUrl = statusData.data.video_url;
          console.log("Kling AI Video Ready:", videoUrl);
        } else if (statusData.data.task_status === "failed") {
          console.error("Kling AI Task Failed:", statusData.data);
          throw new Error("Task failed: " + (statusData.data.task_status_msg || "Unknown error"));
        }
        attempts++;
      }

      if (!videoUrl) throw new Error("Timed out waiting for video");

      // 3. Fetch video and return as blob (or just return URL)
      // Since we're in a proxy, we can return the URL and let the client handle it,
      // but to be consistent with geminiService returning a blob, let's fetch it.
      const videoResponse = await fetch(videoUrl);
      const arrayBuffer = await videoResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader("Content-Type", "video/mp4");
      res.send(buffer);

    } catch (error) {
      console.error("Kling AI Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
