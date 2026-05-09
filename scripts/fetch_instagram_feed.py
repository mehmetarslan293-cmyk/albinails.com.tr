import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUT_FILE = ROOT / "instagram-feed.json"


def http_json(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "albi-instagram-feed-updater/1.0"})
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> None:
    user_id = os.getenv("IG_USER_ID", "").strip()
    access_token = os.getenv("IG_ACCESS_TOKEN", "").strip()

    if not user_id or not access_token:
        print(
            "::warning::IG_USER_ID veya IG_ACCESS_TOKEN tanimli degil. "
            "GitHub repo > Settings > Secrets and variables > Actions ile ekleyin. "
            "Feed dosyasi degistirilmedi.",
            file=sys.stderr,
        )
        sys.exit(0)

    try:
        params = {
            "fields": "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp",
            "limit": "8",
            "access_token": access_token,
        }
        url = f"https://graph.facebook.com/v21.0/{user_id}/media?{urlencode(params)}"
        data = http_json(url)
        raw_items = data.get("data", [])

        items = []
        for item in raw_items:
            media_type = item.get("media_type", "")
            image = item.get("media_url", "")
            if media_type in {"VIDEO", "REELS"}:
                image = item.get("thumbnail_url", "") or image
            if not image:
                continue
            items.append(
                {
                    "id": item.get("id", ""),
                    "caption": (item.get("caption", "") or "").replace("\n", " ").strip(),
                    "image": image,
                    "permalink": item.get("permalink", ""),
                    "timestamp": item.get("timestamp", ""),
                }
            )
            if len(items) == 4:
                break

        payload = {
            "source": "kalipso_albi_turkey",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "items": items,
        }
        OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except HTTPError as e:
        print(f"::warning::Instagram API HTTP {e.code}: {e.reason}. Feed dosyasi degistirilmedi.", file=sys.stderr)
        sys.exit(0)
    except URLError as e:
        print(f"::warning::Instagram API baglanti hatasi: {e}. Feed dosyasi degistirilmedi.", file=sys.stderr)
        sys.exit(0)
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print(f"::warning::Instagram feed okunamadi: {e}. Feed dosyasi degistirilmedi.", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
