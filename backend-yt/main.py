import os
import urllib.request
import json
import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Jano HD Downloader Python Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

@app.get("/")
def home():
    return {"status": "ok", "service": "Jano HD Downloader Python Worker"}

def extract_via_invidious(video_id: str):
    instances = [
        f"https://invidious.nerdvpn.de/api/v1/videos/{video_id}",
        f"https://invidious.drgns.space/api/v1/videos/{video_id}",
        f"https://inv.tux.pizza/api/v1/videos/{video_id}",
        f"https://pipedapi.kavin.rocks/streams/{video_id}"
    ]

    for inst_url in instances:
        try:
            req = urllib.request.Request(
                inst_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=5) as res:
                data = json.loads(res.read().decode('utf-8'))
                streams = data.get("formatStreams") or data.get("videoStreams") or []
                for s in streams:
                    stream_url = s.get("url")
                    if stream_url and ("googlevideo.com" in stream_url or ".mp4" in stream_url):
                        title = data.get("title") or "YouTube Video"
                        thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                        return {
                            "success": True,
                            "mediaUrl": stream_url,
                            "title": title,
                            "thumbnail": thumbnail,
                            "mediaId": video_id
                        }
        except Exception:
            continue
    return None

@app.post("/extract")
def extract_video(req: VideoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    import re
    match = re.search(r'(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})', url)
    video_id = match.group(1) if match else None

    cookies_env = os.environ.get("YOUTUBE_COOKIES")
    cookie_path = None
    if cookies_env:
        try:
            cleaned = cookies_env.replace('\\n', '\n').strip('"\'')
            lines = []
            for line in cleaned.splitlines():
                l_str = line.strip()
                if l_str.startswith('#') or not l_str:
                    lines.append(l_str)
                else:
                    parts = l_str.split()
                    if len(parts) >= 6:
                        lines.append('\t'.join(parts))
                    else:
                        lines.append(l_str)
            formatted = "# Netscape HTTP Cookie File\n" + '\n'.join(lines)
            cookie_path = "/tmp/youtube_cookies.txt"
            with open(cookie_path, "w", encoding="utf-8") as f:
                f.write(formatted)
        except Exception:
            cookie_path = None

    # If cookies are provided, run standard cookie-authenticated extraction first
    if cookie_path and os.path.exists(cookie_path):
        ydl_opts = {
            'no_warnings': True,
            'quiet': True,
            'skip_download': True,
            'cookiefile': cookie_path,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info:
                    stream_url = info.get('url')
                    if not stream_url and info.get('formats'):
                        for f in info['formats']:
                            if f.get('url') and f.get('vcodec') != 'none':
                                stream_url = f['url']
                                break
                    if stream_url:
                        return {
                            "success": True,
                            "mediaUrl": stream_url,
                            "title": info.get('title') or 'YouTube Video',
                            "thumbnail": info.get('thumbnail') or '',
                            "mediaId": info.get('id') or ''
                        }
        except Exception as e:
            last_error = f"Cookie extraction failed: {str(e)}"

    client_candidates = [
        None, # Default yt-dlp clients
        ['android_creator'],
        ['ios'],
        ['tv_embedded'],
        ['mweb']
    ]

    last_error = None

    for client_list in client_candidates:
        ydl_opts = {
            'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
            'no_warnings': True,
            'quiet': True,
            'skip_download': True,
        }
        
        if client_list:
            ydl_opts['extractor_args'] = {
                'youtube': {
                    'player_client': client_list,
                }
            }
            
        if cookie_path and os.path.exists(cookie_path):
            ydl_opts['cookiefile'] = cookie_path

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    continue

                stream_url = info.get('url')
                
                # If a direct 'url' is not available, find the first format that has both video and audio
                if not stream_url and info.get('formats'):
                    for f in info['formats']:
                        # We want a format that has both audio and video
                        if f.get('url') and f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                            stream_url = f['url']
                            break
                            
                if stream_url:
                    title = info.get('title') or 'YouTube Video'
                    thumbnail = info.get('thumbnail') or ''
                    media_id = info.get('id') or ''

                    return {
                        "success": True,
                        "mediaUrl": stream_url,
                        "title": title,
                        "thumbnail": thumbnail,
                        "mediaId": media_id
                    }
        except Exception as e:
            last_error = str(e)

    if video_id:
        invidious_result = extract_via_invidious(video_id)
        if invidious_result:
            return invidious_result

    raise HTTPException(status_code=500, detail=last_error or "Unable to extract YouTube video stream")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

from fastapi import Request
from fastapi.responses import StreamingResponse
import httpx

@app.get("/proxy")
async def proxy_stream(request: Request, url: str):
    headers = {"User-Agent": "Mozilla/5.0"}
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header
    client = httpx.AsyncClient()
    req = client.build_request("GET", url, headers=headers)
    response = await client.send(req, stream=True)
    res_headers = {}
    if "content-length" in response.headers:
        res_headers["Content-Length"] = response.headers["content-length"]
    if "content-range" in response.headers:
        res_headers["Content-Range"] = response.headers["content-range"]
    res_headers["Content-Type"] = response.headers.get("content-type", "video/mp4")
    res_headers["Accept-Ranges"] = "bytes"
    async def stream_generator():
        async for chunk in response.aiter_bytes():
            yield chunk
    return StreamingResponse(stream_generator(), status_code=response.status_code, headers=res_headers)

