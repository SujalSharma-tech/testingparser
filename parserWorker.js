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

  // Get file size for progress calculation
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;
  let processedBytes = 0;
  let firstRow = true;

  // Stream output as JSON array
  const outPath = path.join(__dirname, "uploads", `${fileId}-parsed.json`);
  const outStream = fs.createWriteStream(outPath);
  outStream.write("[\n");

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => {
      processedBytes += Buffer.byteLength(JSON.stringify(data));
      const progress = Math.floor((processedBytes / totalSize) * 100);
      if (progress % 10 === 0) {
        updateProgress(fileId, processedBytes);
      }
      // Write each row as JSON, comma separated
      if (!firstRow) outStream.write(",\n");
      outStream.write(JSON.stringify(data));
      firstRow = false;
    })
    .on("end", () => {
      outStream.write("\n]\n");
      outStream.end();
      setStatus(fileId, "ready");
    })
    .on("error", () => {
      outStream.end();
      setStatus(fileId, "error");
    });
}

module.exports = parseFileAsync;
