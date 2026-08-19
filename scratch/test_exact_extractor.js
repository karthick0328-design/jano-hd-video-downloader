async function getShareChatMediaUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    const html = await res.text();
    const match =
      html.match(/"videoUrl":"([^"]+)"/i) ||
      html.match(/og:video:secure_url"?\s+content="([^"]+)"/i) ||
      html.match(/og:video"?\s+content="([^"]+)"/i);

    if (match && match[1]) {
      return match[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    }
  } catch (e) {
    console.log('ShareChat extract error:', e.message);
  }
  return null;
}

async function getFacebookMediaUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    const html = await res.text();
    const match =
      html.match(/"browser_native_hd_url":"([^"]+)"/i) ||
      html.match(/"browser_native_sd_url":"([^"]+)"/i) ||
      html.match(/"playable_url_quality_hd":"([^"]+)"/i) ||
      html.match(/"playable_url":"([^"]+)"/i) ||
      html.match(/og:video:secure_url"?\s+content="([^"]+)"/i) ||
      html.match(/og:video"?\s+content="([^"]+)"/i);

    if (match && match[1]) {
      return match[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    }
  } catch (e) {
    console.log('Facebook extract error:', e.message);
  }
  return null;
}

async function getInstagramMediaUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    const html = await res.text();
    const match =
      html.match(/"video_url":"([^"]+)"/i) ||
      html.match(/og:video:secure_url"?\s+content="([^"]+)"/i) ||
      html.match(/og:video"?\s+content="([^"]+)"/i);

    if (match && match[1]) {
      return match[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    }
  } catch (e) {
    console.log('Instagram extract error:', e.message);
  }
  return null;
}

async function getYouTubeMediaUrl(url) {
  try {
    const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    if (cobaltRes.ok) {
      const data = await cobaltRes.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (e) {
    console.log('YouTube Cobalt API error:', e.message);
  }
  return null;
}

async function testAll() {
  console.log('Testing Exact Extraction:');
  const sc = await getShareChatMediaUrl('https://sharechat.com/post/bXZAWRm');
  console.log('ShareChat exact MP4:', sc);

  const fb = await getFacebookMediaUrl('https://www.facebook.com/watch/?v=10153231379946729');
  console.log('Facebook exact MP4:', fb);

  const yt = await getYouTubeMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  console.log('YouTube exact MP4:', yt);
}

testAll();
