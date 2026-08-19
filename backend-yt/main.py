import os
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

@app.post("/extract")
def extract_video(req: VideoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

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
            'format': 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best',
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

    raise HTTPException(status_code=500, detail=last_error or "Unable to extract stream")
