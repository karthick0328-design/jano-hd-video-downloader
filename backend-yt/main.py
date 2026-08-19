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

    client_candidates = [
        ['android_creator'],
        ['android_testsuite'],
        ['android'],
        ['mweb'],
        ['ios']
    ]

    last_error = None

    for client_list in client_candidates:
        ydl_opts = {
            'no_warnings': True,
            'quiet': True,
            'skip_download': True,
            'extractor_args': {
                'youtube': {
                    'player_client': client_list,
                }
            }
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    continue

                stream_url = info.get('url')
                if not stream_url and info.get('formats'):
                    for f in info['formats']:
                        if f.get('url') and f.get('vcodec') != 'none':
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
