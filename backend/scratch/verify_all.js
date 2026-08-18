const mongoose = require('mongoose');

async function testUrl(url, targetQuality) {
  console.log(`\n==================================================`);
  console.log(`TESTING URL: ${url} (Requested Quality: ${targetQuality})`);
  console.log(`==================================================`);

  // 1. Analyze
  const analyzeRes = await fetch('http://localhost:5000/api/media/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const analyzeData = await analyzeRes.json();

  if (!analyzeData.success) {
    console.error('❌ ANALYZE FAILED:', analyzeData.error);
    return false;
  }

  console.log(`✅ ANALYZE SUCCESS: Title="${analyzeData.title}", MaxQuality=${analyzeData.maxAvailableQuality}`);
  console.log(`Available formats:`, analyzeData.formats.map(f => `${f.quality} (${f.formatId})`));

  let selectedFormat = analyzeData.formats.find(f => f.quality === targetQuality);
  if (!selectedFormat && analyzeData.formats.length > 0) {
    selectedFormat = analyzeData.formats[0];
  }

  console.log(`Selected download format:`, selectedFormat);

  // 2. Download
  const downloadRes = await fetch('http://localhost:5000/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      quality: selectedFormat.quality,
      format: 'mp4',
      formatId: selectedFormat.formatId,
    }),
  });

  const downloadData = await downloadRes.json();
  if (!downloadData.success) {
    console.error('❌ DOWNLOAD TRIGGER FAILED:', downloadData.error);
    return false;
  }

  const jobId = downloadData.jobId;
  console.log(`Created Job ID: ${jobId}`);

  // 3. Poll status
  let finalJob = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    await mongoose.connect('mongodb://localhost:27017/hd_downloader');
    const { JobService } = require('../dist/services/jobService');
    const job = await JobService.getJob(jobId);
    await mongoose.connection.close();

    console.log(`[Job ${jobId}] Status: ${job.status}, Progress: ${job.progress}%`);

    if (job.status === 'completed' || job.status === 'failed') {
      finalJob = job;
      break;
    }
  }

  if (!finalJob || finalJob.status !== 'completed') {
    console.error('❌ JOB FAILED OR TIMED OUT:', finalJob);
    return false;
  }

  // 4. FFprobe validation
  const { FFmpegService } = require('../dist/ffmpeg/FFmpegService');
  const probe = await FFmpegService.probeFile(finalJob.filePath);

  console.log(`✅ DOWNLOAD COMPLETED & PROBED CLEANLY:`);
  console.log(`   File Path: ${finalJob.filePath}`);
  console.log(`   File Size: ${(probe.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Resolution: ${probe.width}x${probe.height}`);
  console.log(`   Video Codec: ${probe.videoCodec}`);
  console.log(`   Audio Codec: ${probe.audioCodec}`);
  console.log(`   Duration: ${probe.duration.toFixed(1)}s`);

  if (probe.height > 0 && probe.videoCodec !== 'unknown' && probe.audioCodec !== 'unknown') {
    console.log(`🎉 VERIFICATION PASSED: Perfect video picture + audio sound!`);
    return true;
  } else {
    console.error(`❌ PROBE VALIDATION FAILED: Missing video or audio codec.`);
    return false;
  }
}

async function runAll() {
  const tests = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', quality: '1080p' },
    { url: 'https://www.youtube.com/shorts/J---aiyznGQ', quality: '720p' },
    { url: 'https://www.instagram.com/reel/DavTm4AT7GK/', quality: '1080p' },
  ];

  const results = [];
  for (const t of tests) {
    const ok = await testUrl(t.url, t.quality);
    results.push({ url: t.url, ok });
  }

  console.log(`\n==================================================`);
  console.log(`SUMMARY RESULTS:`);
  console.log(`==================================================`);
  results.forEach(r => {
    console.log(`${r.ok ? '✅ PASS' : '❌ FAIL'}: ${r.url}`);
  });
}

runAll();
