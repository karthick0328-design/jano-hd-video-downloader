async function testInstagramOG() {
  const url = 'https://www.instagram.com/reel/DavTm4AT7GK/';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    console.log('Instagram OG status:', res.status);
    const html = await res.text();
    console.log('Instagram HTML len:', html.length);

    const m =
      html.match(/og:video:secure_url"?\s+content="([^"]+)"/i) ||
      html.match(/og:video"?\s+content="([^"]+)"/i) ||
      html.match(/"video_url":"([^"]+)"/i);
    console.log('Instagram direct video URL:', m ? m[1].replace(/\\/g, '').replace(/&amp;/g, '&') : 'None');
  } catch (e) {
    console.log('Instagram err:', e.message);
  }
}

async function testFacebookOG() {
  const url = 'https://www.facebook.com/watch/?v=10153231379946729';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    console.log('Facebook OG status:', res.status);
    const html = await res.text();
    const m =
      html.match(/"browser_native_hd_url":"([^"]+)"/i) ||
      html.match(/"browser_native_sd_url":"([^"]+)"/i) ||
      html.match(/"playable_url_quality_hd":"([^"]+)"/i) ||
      html.match(/"playable_url":"([^"]+)"/i) ||
      html.match(/og:video:secure_url"?\s+content="([^"]+)"/i) ||
      html.match(/og:video"?\s+content="([^"]+)"/i);
    console.log('Facebook direct video URL:', m ? m[1].replace(/\\/g, '').replace(/&amp;/g, '&') : 'None');
  } catch (e) {
    console.log('Facebook err:', e.message);
  }
}

async function main() {
  await testInstagramOG();
  await testFacebookOG();
}

main();
