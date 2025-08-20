const { setStatus } = require("./uploadProgress");

// Simulate async parsing
function parseFileAsync(fileId) {
  setStatus(fileId, "processing");
  setTimeout(() => {
    setStatus(fileId, "ready");
  }, 5000);
}

module.exports = parseFileAsync;