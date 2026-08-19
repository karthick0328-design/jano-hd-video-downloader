async function searchInstagramHTML() {
  const url = 'https://www.instagram.com/reel/DavTm4AT7GK/';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });
    const html = await res.text();
    const cleanHtml = html.replace(/\\/g, '');
    
    const mp4Matches = cleanHtml.match(/https?:[^\s"'<>]+?\.mp4[^\s"'<>]*/gi);
    console.log('Cleaned MP4 matches:', mp4Matches ? mp4Matches.slice(0, 3) : 'None');

    const videoUrlMatches = cleanHtml.match(/"video_url":"([^"]+)"/i) || cleanHtml.match(/video_url":"([^"]+)"/i);
    console.log('video_url match:', videoUrlMatches ? videoUrlMatches[1] : 'None');
  } catch (e) {
    console.log('Error:', e.message);
  }
}

searchInstagramHTML();
