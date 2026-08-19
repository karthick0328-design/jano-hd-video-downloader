async function testMobileFB() {
  try {
    const res = await fetch(
      'https://mbasic.facebook.com/video/video.php?v=10153231379946729',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        },
      }
    );
    console.log('Mobile FB status:', res.status);
    const html = await res.text();
    console.log('HTML len:', html.length);
    const m =
      html.match(/href="\/video_redirect\/\?src=([^"]+)"/i) ||
      html.match(/src="([^"]+video[^"]+)"/i);
    console.log(
      'Video redirect src:',
      m ? decodeURIComponent(m[1]).replace(/&amp;/g, '&') : 'none'
    );
  } catch (e) {
    console.log('Err:', e.message);
  }
}

async function testShareChat() {
  try {
    const res = await fetch('https://sharechat.com/video/bXZAWRm', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    console.log('ShareChat status:', res.status);
    const html = await res.text();
    console.log('ShareChat len:', html.length);
    const m = html.match(/"videoUrl":"([^"]+)"/i) || html.match(/og:video"?\s+content="([^"]+)"/i);
    console.log('ShareChat MP4:', m ? m[1].replace(/\\/g, '') : 'none');
  } catch (e) {
    console.log('ShareChat err:', e.message);
  }
}

async function main() {
  await testMobileFB();
  await testShareChat();
}

main();
