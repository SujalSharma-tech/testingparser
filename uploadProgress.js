const progressMap = new Map();
const subscribers = new Map();
const lastBroadcast = new Map(); // fileId -> timestamp

function initProgress(fileId, filename, filesize) {
  progressMap.set(fileId, {
    fileId,
    filename,
    filesize,
    uploaded: 0,
    status: 'uploading',
    progress: 0,
  });
}

function updateProgress(fileId, uploaded) {
  const entry = progressMap.get(fileId);
  if (!entry) return;

  entry.uploaded = uploaded;
  entry.progress = Math.min(
    Math.round((uploaded / entry.filesize) * 100),
    100
  );

  // only broadcast if >3s since last or upload done
  // const now = Date.now();
  // const last = lastBroadcast.get(fileId) || 0;
  // if ((now - last >= 3000) || entry.progress === 100) {
    broadcast(fileId, entry);
    // lastBroadcast.set(fileId, now);
  // }
}

function setStatus(fileId, status) {
  const entry = progressMap.get(fileId);
  if (!entry) return;

  entry.status = status;
  if (status === 'ready') entry.progress = 100;

  broadcast(fileId, entry); // always broadcast status changes immediately
}

function getProgress(fileId) {
  return progressMap.get(fileId);
}

function subscribe(fileId, res) {
  if (!subscribers.has(fileId)) subscribers.set(fileId, new Set());
  subscribers.get(fileId).add(res);
}

function unsubscribe(fileId, res) {
  if (subscribers.has(fileId)) subscribers.get(fileId).delete(res);
}

function broadcast(fileId, data) {
  if (!subscribers.has(fileId)) return;
  for (const res of subscribers.get(fileId)) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

module.exports = {
  initProgress,
  updateProgress,
  setStatus,
  getProgress,
  subscribe,
  unsubscribe,
};
