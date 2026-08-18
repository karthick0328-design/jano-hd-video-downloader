const mongoose = require('mongoose');

async function testSingle() {
  const url = 'https://youtu.be/QmHX0whk6Rg?si=gMyIMSj4P9sX21CC';
  console.log('Testing specific link:', url);

  const analyzeRes = await fetch('http://localhost:5000/api/media/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const analyzeData = await analyzeRes.json();
  console.log('ANALYZE RESULT:', analyzeData);

  const downloadRes = await fetch('http://localhost:5000/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      quality: analyzeData.formats[0].quality,
      format: 'mp4',
      formatId: analyzeData.formats[0].formatId,
    }),
  });
  const downloadData = await downloadRes.json();
  console.log('DOWNLOAD CREATED:', downloadData);

  const jobId = downloadData.jobId;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await mongoose.connect('mongodb://localhost:27017/hd_downloader');
    const { JobService } = require('../dist/services/jobService');
    const job = await JobService.getJob(jobId);
    await mongoose.connection.close();

    console.log(`[Job ${jobId}] Status: ${job.status}, Progress: ${job.progress}%`);
    if (job.status === 'completed' || job.status === 'failed') {
      console.log('FINAL JOB RESULT:', job);
      break;
    }
  }
}

testSingle();
