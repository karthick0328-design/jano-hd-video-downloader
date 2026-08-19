async function testCobaltV10() {
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoQuality: '1080',
      }),
    });
    console.log('Cobalt v10 status:', res.status);
    const data = await res.json();
    console.log('Cobalt v10 response:', data);
  } catch (e) {
    console.log('Cobalt v10 error:', e.message);
  }
}

testCobaltV10();
