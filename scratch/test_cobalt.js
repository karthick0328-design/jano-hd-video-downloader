async function testCobalt() {
  const cobaltInstances = [
    'https://api.cobalt.tools/',
    'https://co.wuk.sh/',
    'https://cobalt.qtf.tw/',
  ];

  const targetVideo = 'https://www.youtube.com/watch?v=-yzJsDPoReo';

  for (const inst of cobaltInstances) {
    try {
      console.log('Testing Cobalt instance:', inst);
      const res = await fetch(inst, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: targetVideo,
          videoQuality: '1080',
        }),
      });

      console.log('Status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Cobalt Response:', JSON.stringify(data, null, 2));
        if (data.url) {
          console.log('\n==================================================');
          console.log('SUCCESS! Direct MP4 stream URL:', data.url);
          console.log('==================================================');
          return;
        }
      } else {
        console.log('Res text:', await res.text());
      }
    } catch (e) {
      console.error('Error testing Cobalt:', e.message);
    }
  }
}

testCobalt();
