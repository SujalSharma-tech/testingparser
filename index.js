const busboy = require('busboy');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// const { File } = require('./models/file');
const app = express();
const router = express.Router();

router.post('/files', (req, res) => {
  const fileId = uuidv4();
  
  console.log('Upload request received');
  
  res.json({
    file_id: fileId,
    status: 'uploading',
    progress: 0
  });

  // Handle streaming upload in background
  processStreamingUpload(req, fileId);
});

// function handleStreamingUpload(req, fileId) {
//   const bb = busboy({ headers: req.headers });
  
//   let uploadedBytes = 0;
//   const contentLength = parseInt(req.headers['content-length']) || 0;
//   console.log(`Content-Length: ${contentLength}`);
  
//   bb.on('file', (name, file, info) => {
//     console.log(`Starting upload: ${info.filename}`);
    
//     // Create file record when stream starts
//     // File.create({
//     //   _id: fileId,
//     //   status: 'uploading',
//     //   progress: 0,
//     //   originalName: info.filename,
//     //   // ...
//     // });
//     console.log({
//       _id: fileId,
//       status: 'uploading',
//       progress: 0,
//       originalName: info.filename,
//     })
    
//     const filePath = `uploads/${fileId}-${info.filename}`;
//     const writeStream = fs.createWriteStream(filePath);
    
//     file.on('data', async (chunk) => {
//       uploadedBytes += chunk.length;
//       const progress = Math.floor((uploadedBytes / contentLength) * 100);
      
//     //   await File.findByIdAndUpdate(fileId, {
//     //     progress: progress,
//     //     size: uploadedBytes
//     //   });
//       console.log(`Uploaded ${uploadedBytes} bytes (${progress}%)`);
      
//       console.log(`Upload progress: ${progress}%`);
//     });
    
//     file.pipe(writeStream);
    
//     file.on('end', async () => {
//       console.log('Upload stream completed');
      
//       // Now start parsing
//     //   await File.findByIdAndUpdate(fileId, {
//     //     status: 'parsing',
//     //     progress: 0
//     //   });
//         console.log(`File ${info.filename} uploaded successfully to ${filePath}`);
      
//       // Queue parsing job
//     //   parsingQueue.add('parseFile', { fileId, filePath });
//     });
//   });
  
//   req.pipe(bb);
// }

async function processStreamingUpload(req, fileId) {
  const bb = busboy({ 
    headers: req.headers,
    limits: { fileSize: 500 * 1024 * 1024 }
  });
  
  const totalBytes = parseInt(req.headers['content-length']) || 0;
  let uploadedBytes = 0;
  let lastProgress = -1; // Start with -1 to ensure first update
  
  console.log(`Upload request received`);
  console.log(`Content-Length: ${totalBytes} bytes (${(totalBytes/1024/1024).toFixed(1)}MB)`);
  
  bb.on('file', async (name, file, info) => {
    const { filename, mimeType } = info;
    const filePath = path.join('uploads', `${fileId}-${filename}`);
    
    console.log(`Starting upload: ${filename}`);
    
    // Create initial record
    // await File.create({
    //   _id: fileId,
    //   filename: `${fileId}-${filename}`,
    //   originalName: filename,
    //   mimetype: mimeType,
    //   status: 'uploading',
    //   progress: 0,
    //   size: 0,
    //   totalSize: totalBytes, // Store total size for reference
    //   filePath: filePath,
    //   uploadStarted: new Date()
    // });

    console.log({
      _id: fileId,
      filename: `${fileId}-${filename}`,
      originalName: filename,
      mimetype: mimeType,
      status: 'uploading',
      progress: 0,
      size: 0,
      totalSize: totalBytes,
      filePath: filePath,
    })
    
    const writeStream = fs.createWriteStream(filePath);
    
    file.on('data', async (chunk) => {
      uploadedBytes += chunk.length;
      
      const progress = totalBytes > 0 
        ? Math.round((uploadedBytes / totalBytes) * 100) // Use Math.round for cleaner numbers
        : Math.round(uploadedBytes / (1024 * 1024)); // Fallback: MB count
      
      // Update every 1% or every 2MB (whichever comes first)
      const megabytesUploaded = uploadedBytes / (1024 * 1024);
      const shouldUpdate = 
        (progress > lastProgress) || // Progress percentage changed
        (Math.floor(megabytesUploaded) % 2 === 0 && megabytesUploaded > Math.floor((uploadedBytes - chunk.length) / (1024 * 1024))); // Every 2MB
      
      if (shouldUpdate) {
        // await File.findByIdAndUpdate(fileId, {
        //   progress: progress,
        //   size: uploadedBytes,
        //   updatedAt: new Date()
        // });
        console.log({
          progress: progress,
          size: uploadedBytes,
        })
        
        console.log(`File ${fileId}: Upload ${progress}% (${megabytesUploaded.toFixed(1)}MB / ${(totalBytes/1024/1024).toFixed(1)}MB)`);
        lastProgress = progress;
      }
    });
    
    file.pipe(writeStream);
    
    file.on('end', async () => {
      // Upload completed - ensure 100% is recorded
    //   await File.findByIdAndUpdate(fileId, {
    //     status: 'parsing',
    //     progress: 0, // Reset for parsing
    //     size: uploadedBytes,
    //     uploadCompleted: new Date()
    //   });
        console.log(`File ${fileId}: Upload completed successfully`);
      
      const uploadTimeSeconds = (new Date() - new Date()) / 1000; // You'll need to track start time
      console.log(`File ${fileId}: Upload completed in ${uploadTimeSeconds}s - ${(uploadedBytes/1024/1024).toFixed(1)}MB total`);
      console.log(`File ${fileId}: Starting parsing...`);
      
      // Start parsing
    //   parsingQueue.add('parseFile', {
    //     fileId,
    //     filePath,
    //     mimetype: mimeType
    //   });
    });
  });
  
  req.pipe(bb);
}

app.use('/', router);

app.listen(3000,()=> {
    console.log('Server is running on port 3000');
})