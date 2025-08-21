const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { setStatus, updateProgress, getProgress } = require("./uploadProgress");

function parseFileAsync(fileId) {
  const entry = getProgress(fileId);
  if (!entry || !entry.filename) return;

  const filePath = path.join(__dirname, "uploads", `${fileId}-${entry.filename}`);
  const ext = path.extname(entry.filename).toLowerCase();

  if (ext !== ".csv") {
    setStatus(fileId, "ready");
    return;
  }

  setStatus(fileId, "processing");

  let rows = [];
  let rowCount = 0;

  // Get file size for progress calculation
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;
  let processedBytes = 0;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => {
      rows.push(data);
      rowCount++;
      processedBytes += Buffer.byteLength(JSON.stringify(data));
      // Update progress every 10%
      const progress = Math.floor((processedBytes / totalSize) * 100);
      if (progress % 10 === 0) {
        updateProgress(fileId, processedBytes);
      }
    })
    .on("end", () => {
      // Save parsed data to server as JSON
      const outPath = path.join(__dirname, "uploads", `${fileId}-parsed.json`);
      fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
      setStatus(fileId, "ready");
    })
    .on("error", () => {
      setStatus(fileId, "error");
    });
}

module.exports = parseFileAsync;