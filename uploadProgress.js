const progressMap = new Map();
const subscribers = new Map();

function setFileName(fileId, filename) {
  const entry = progressMap.get(fileId);
  if (entry) {
    entry.filename = filename;
  } else {
    progressMap.set(fileId, { fileId, filename, uploaded: 0, status: 'uploading', progress: 0 });
  }
}

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
  const newProgress = Math.min(
    Math.round((uploaded / entry.filesize) * 100),
    100
  );

  if (
    newProgress !== entry.progress &&
    (newProgress % 10 === 0 || newProgress === 100)
  ) {
    entry.progress = newProgress;
    broadcast(fileId, entry);
  } else {
    entry.progress = newProgress;
  }
}

function setStatus(fileId, status) {
  const entry = progressMap.get(fileId);
  if (!entry) return;

  entry.status = status;
  if (status === 'ready') entry.progress = 100;

  broadcast(fileId, entry); 
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
  setFileName
};