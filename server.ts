import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { WebcastPushConnection } from "tiktok-live-connector";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  
  // Set up Socket.io for frontend communication
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    }
  });

  // Track active TikTok connections (for simplicity, only one active connection for now, 
  // or a map if we want to handle multiple, but usually preview environment just needs one)
  let tiktokLiveConnection: WebcastPushConnection | null = null;
  let currentUsername = "";

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send current connection status
    socket.emit("tiktok_status", { 
      connected: tiktokLiveConnection !== null, 
      username: currentUsername 
    });

    socket.on("tiktok_connect", async (username: string) => {
      console.log(`Requested TikTok connection for: ${username}`);
      
      try {
        if (tiktokLiveConnection) {
          tiktokLiveConnection.disconnect();
          tiktokLiveConnection = null;
        }

        currentUsername = username;
        tiktokLiveConnection = new WebcastPushConnection(username, {
          processInitialData: false,
          enableExtendedGiftInfo: true,
          enableWebsocketUpgrade: true,
        });

        tiktokLiveConnection.on('chat', (data) => {
          console.log(`${data.uniqueId} (userId:${data.userId}) writes: ${data.comment}`);
          io.emit("tiktok_chat", {
            username: data.uniqueId,
            comment: data.comment,
            profilePictureUrl: data.profilePictureUrl
          });
        });

        tiktokLiveConnection.on('streamEnd', (actionId) => {
          console.log(`Stream ended: ${actionId}`);
          tiktokLiveConnection = null;
          currentUsername = "";
          io.emit("tiktok_status", { connected: false, username: "" });
        });

        await tiktokLiveConnection.connect();
        socket.emit("tiktok_status", { connected: true, username: username });

      } catch (err) {
        console.error("Failed to connect", err);
        socket.emit("tiktok_error", { message: err instanceof Error ? err.message : "Failed to connect" });
        tiktokLiveConnection = null;
        currentUsername = "";
        socket.emit("tiktok_status", { connected: false, username: "" });
      }
    });

    socket.on("tiktok_disconnect", () => {
      if (tiktokLiveConnection) {
        tiktokLiveConnection.disconnect();
        tiktokLiveConnection = null;
        currentUsername = "";
        io.emit("tiktok_status", { connected: false, username: "" });
      }
    });

    socket.on("simulate_chat", ({ username, comment, profilePictureUrl }: { username: string, comment: string, profilePictureUrl?: string }) => {
      console.log(`Simulated chat from ${username}: ${comment}`);
      io.emit("tiktok_chat", {
        username: username,
        comment: comment,
        profilePictureUrl: profilePictureUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve the static v1 game
  app.use('/v1', express.static(path.join(process.cwd(), 'public', 'v1')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
