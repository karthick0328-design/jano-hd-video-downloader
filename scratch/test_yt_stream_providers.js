async function testStreamProviders(videoId, url) {
  console.log('Testing Stream Providers for:', videoId, url);

  const providers = [
    `https://api.vkrdownloader.com/server?v=${encodeURIComponent(url)}`,
    `https://ytdl.cloud/api/v1/download?url=${encodeURIComponent(url)}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://api.cobalt.tools/api/json`,
  ];

  for (const p of providers) {
    try {
      if (p.includes('cobalt')) {
        const res = await fetch(p, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ url }),
        });
        console.log('Cobalt status:', res.status, await res.text());
      } else {
        const res = await fetch(p);
        console.log(`Provider ${p.substring(0, 45)} status:`, res.status);
        if (res.ok) {
          const text = await res.text();
          console.log(`  Output snippet:`, text.substring(0, 150));
        }
      }
    } catch (e) {
      console.log(`Provider ${p} err:`, e.message);
    }
  }
}

testStreamProviders('dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
