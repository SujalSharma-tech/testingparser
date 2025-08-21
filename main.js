const express = require("express");
const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");
const { v4: uuidv4 } = require("uuid");

const { initProgress, updateProgress, setStatus, getProgress, subscribe, unsubscribe, setFileName } = require("./uploadProgress");
const parseFileAsync = require("./parserWorker");

const app = express();
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);


app.post("/files/reserve", (req, res) => {
  const fileId = uuidv4();
  initProgress(fileId, "pending", 0);
  res.json({ file_id: fileId });
});

app.post("/files/:fileId", (req, res) => {
  const fileId = req.params.fileId;
  const busboy = Busboy({ headers: req.headers });
  let uploaded = 0;

  const totalSize = parseInt(req.headers["content-length"] || "0");
  initProgress(fileId, "pending", totalSize);

  busboy.on("file", (name, file, info) => {
    const { filename } = info;
    setFileName(fileId, filename);
    const filePath = path.join(uploadDir, `${fileId}-${filename}`);
    const writeStream = fs.createWriteStream(filePath);

    file.on("data", (chunk) => {
      uploaded += chunk.length;
      updateProgress(fileId, uploaded);
    });

    file.on("end", () => {
      setStatus(fileId, "uploaded");
      parseFileAsync(fileId);
    });

    file.pipe(writeStream);
  });

  busboy.on("finish", () => {
    res.json({ file_id: fileId, status: "uploading" });
  });

  req.pipe(busboy);
});

app.get("/files/:fileId/progress", (req, res) => {
  const fileId = req.params.fileId;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const entry = getProgress(fileId);
  if (entry) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  subscribe(fileId, res);

  req.on("close", () => {
    unsubscribe(fileId, res);
  });
});

app.listen(4000, () => console.log("🚀 Running on http://localhost:4000"));