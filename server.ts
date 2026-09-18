import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import {
  transcribeAndSegmentFile,
  evaluateRecording,
  transcribeAndSegmentDocumentText,
} from "./server/transcriber.js";

dotenv.config();

const PORT = 3000;
const app = express();

// Ensure upload directory exists
const UPLOAD_DIR = "/tmp/uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage for high-capacity media files (up to 250MB)
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 250 * 1024 * 1024 },
});

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * Audio / Video Processing:
 * Speech-to-Text & Sentence Segmentation using FFmpeg and Whisper
 * Supports both Multipart File Upload (FormData) and Base64 JSON
 */
app.post("/api/process-audio", upload.single("file"), async (req, res) => {
  let tempFilePath = "";
  let shouldCleanupFile = false;

  try {
    let filename = "uploaded_media";

    if (req.file) {
      tempFilePath = req.file.path;
      filename = req.file.originalname || "uploaded_video.mp4";
      shouldCleanupFile = true;
      console.log(`[API /process-audio] Received multipart file: ${filename} (${req.file.size} bytes)`);
    } else if (req.body && req.body.audioBase64) {
      filename = req.body.filename || "uploaded_audio.mp3";
      const ext = path.extname(filename) || ".mp4";
      tempFilePath = path.join(
        UPLOAD_DIR,
        `base64_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`
      );
      const buffer = Buffer.from(req.body.audioBase64, "base64");
      fs.writeFileSync(tempFilePath, buffer);
      shouldCleanupFile = true;
      console.log(`[API /process-audio] Received base64 payload: ${filename} (${buffer.length} bytes)`);
    } else {
      return res.status(400).json({ error: "No media file or audioBase64 provided" });
    }

    // Detect document files vs media files
    const ext = path.extname(filename).toLowerCase();
    const isDoc = [".txt", ".srt", ".vtt", ".md"].includes(ext);

    let result;
    if (isDoc) {
      console.log(`[API /process-audio] Parsing text/subtitle document: ${filename}`);
      const content = fs.readFileSync(tempFilePath, "utf8");
      result = await transcribeAndSegmentDocumentText(content, filename);
    } else {
      // Process uploaded file using FFmpeg and local Whisper model with windowed coverage
      console.log(`[API /process-audio] Starting transcription & segmentation for: ${filename}`);
      result = await transcribeAndSegmentFile(tempFilePath, filename);
    }

    console.log(`[API /process-audio] Finished! Transcribed ${result.sentences.length} sentences across ${result.duration}s`);

    return res.json({
      success: true,
      source: isDoc ? "document_parser" : "whisper_ffmpeg",
      duration: result.duration,
      sentences: result.sentences,
      documentReport: result.documentReport,
      isDocument: isDoc,
    });
  } catch (err: any) {
    console.error("[API /process-audio] Processing error:", err);
    return res.status(500).json({
      error: err.message || "Failed to process media or document file",
    });
  } finally {
    if (shouldCleanupFile && tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
    }
  }
});

/**
 * Text / Document direct import route
 */
app.post("/api/process-document", async (req, res) => {
  try {
    const { text, filename = "document.txt" } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text content is required" });
    }

    const result = await transcribeAndSegmentDocumentText(text, filename);
    return res.json({
      success: true,
      source: "document_parser",
      duration: result.duration,
      sentences: result.sentences,
      documentReport: result.documentReport,
      isDocument: true,
    });
  } catch (err: any) {
    console.error("[API /process-document] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse document" });
  }
});

/**
 * Pronunciation Evaluation:
 * Compares user spoken audio against target sentence
 */
app.post("/api/analyze-pronunciation", async (req, res) => {
  try {
    const {
      originalText,
      userAudioBase64,
      duration = 3,
    } = req.body;

    if (!originalText) {
      return res.status(400).json({ error: "originalText is required" });
    }

    if (!userAudioBase64) {
      return res.status(400).json({ error: "userAudioBase64 is required" });
    }

    const audioBuffer = Buffer.from(userAudioBase64, "base64");

    // Evaluate recording with Whisper and phonetic alignment
    const feedback = await evaluateRecording(audioBuffer, originalText, Number(duration) || 3);

    return res.json({
      success: true,
      source: "whisper_evaluation",
      feedback,
    });
  } catch (err: any) {
    console.error("Pronunciation evaluation failed:", err);
    res.status(500).json({ error: err.message || "Failed to analyze pronunciation" });
  }
});

// Vite / Static setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
