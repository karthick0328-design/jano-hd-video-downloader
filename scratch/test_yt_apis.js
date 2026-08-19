async function testInvidious(videoId) {
  const instances = [
    'https://invidious.nerdvpn.de',
    'https://invidious.drgns.space',
    'https://inv.tux.pizza',
    'https://invidious.projectsegfau.lt',
  ];

  for (const inst of instances) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        const format = data.formatStreams ? data.formatStreams[0] : null;
        if (format && format.url) {
          console.log(`Invidious instance ${inst} SUCCESS:`, format.url.substring(0, 100));
          return format.url;
        }
      }
    } catch (e) {
      console.log(`Inst ${inst} err:`, e.message);
    }
  }
  return null;
}

testInvidious('dQw4w9WgXcQ');
