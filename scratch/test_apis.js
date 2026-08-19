async function testApis() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  // Test Cobalt Wuk.sh
  try {
    const res = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl }),
    });
    console.log('wuk.sh status:', res.status, await res.json());
  } catch(e) {
    console.log('wuk.sh err:', e.message);
  }

  // Test VKR API
  try {
    const res = await fetch(`https://api.vkrdownloader.com/server?v=${encodeURIComponent(testUrl)}`);
    console.log('VKR status:', res.status, await res.json());
  } catch(e) {
    console.log('VKR err:', e.message);
  }
}

testApis();
