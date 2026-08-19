async function testShareChatHome() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  try {
    const res = await fetch('https://sharechat.com', { headers });
    console.log('ShareChat Home Status:', res.status);
    const html = await res.text();
    console.log('ShareChat Home HTML len:', html.length);
    const videoUrls = html.match(/https?:[^\s"'<>\\]+?\.mp4[^\s"'<>\\]*/gi) || html.match(/https?:\\\/\\\/[^\s"'<>\\]+?\.mp4[^\s"'<>\\]*/gi);
    console.log('ShareChat MP4 URLs on homepage:', videoUrls ? videoUrls.slice(0, 5) : 'none');
  } catch (e) {
    console.log('Err:', e.message);
  }
}
testShareChatHome();
