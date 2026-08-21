async function testExtractors() {
  const instagramUrl = 'https://www.instagram.com/reel/DavTm4AT7GK/';
  const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  console.log('--- Testing Instagram Extraction ---');
  // Test Cobalt API instance
  try {
    const res = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({ url: instagramUrl })
    });
    console.log('Cobalt IG status:', res.status);
    const data = await res.json();
    console.log('Cobalt IG data:', data);
  } catch (err) {
    console.log('Cobalt IG error:', err.message);
  }

  // Test Rapid / VKR / Invidious / Pub APIs
  try {
    const res = await fetch(`https://api.vkrdownloader.com/server?v=${encodeURIComponent(instagramUrl)}`);
    console.log('VKR IG status:', res.status);
    const data = await res.json();
    console.log('VKR IG data keys:', Object.keys(data), data.data ? data.data.downloadUrl : null);
  } catch (err) {
    console.log('VKR IG error:', err.message);
  }

  console.log('\n--- Testing YouTube Extraction ---');
  try {
    const res = await fetch(`https://api.vkrdownloader.com/server?v=${encodeURIComponent(youtubeUrl)}`);
    console.log('VKR YT status:', res.status);
    const data = await res.json();
    console.log('VKR YT data keys:', Object.keys(data), data.data ? data.data.downloadUrl : null);
  } catch (err) {
    console.log('VKR YT error:', err.message);
  }
}

testExtractors();
