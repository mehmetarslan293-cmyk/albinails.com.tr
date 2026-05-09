"""
Instagram Graph API ile en fazla iki hesabin son medyalarini cekip
`instagram-feed.json` dosyasina yazar (surum 2: `accounts` dizisi).

Ortam degiskenleri (GitHub Actions > Secrets):
  Hesap 1 (@kalipso_albi_turkey):
    IG_USER_ID, IG_ACCESS_TOKEN
  Hesap 2 (@lovely_albi_kalipso):
    IG_USER_ID_2  — zorunlu (ikinci hesap icin)
    IG_ACCESS_TOKEN_2 — bos birakilirsa IG_ACCESS_TOKEN kullanilir (aynı uygulama
                        tokeni her iki Instagram kullanicisina yetkiliyse).

Kurulum: Meta for Developers + Instagram Business baglantisı; her hesap icin
Graph API `instagram_user_id` degerini secret olarak kaydedin.
"""
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

ACCOUNT_DEFAULTS = [
    {
        "id": "kalipso_albi_turkey",
        "handle": "@kalipso_albi_turkey",
        "profile_url": "https://www.instagram.com/kalipso_albi_turkey/",
    },
    {
        "id": "lovely_albi_kalipso",
        "handle": "@lovely_albi_kalipso",
        "profile_url": "https://www.instagram.com/lovely_albi_kalipso/",
    },
]


def http_json(url: str) -> dict:
    req = Request(url, headers={"User-Agent": "albi-instagram-feed-updater/1.0"})
    with urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def pick_image_url_from_media(item: dict) -> str:
    """Graph API: CAROUSEL_ALBUM kokunde genelde media_url yok; ilk cocuktan al."""
    if not isinstance(item, dict):
        return ""
    media_type = (item.get("media_type") or "").strip()
    if media_type == "CAROUSEL_ALBUM":
        kids = item.get("children") or {}
        if isinstance(kids, dict):
            for ch in kids.get("data") or []:
                u = pick_image_url_from_media(ch)
                if u:
                    return u
        return ""
    if media_type in {"VIDEO", "REELS"}:
        return (item.get("thumbnail_url") or item.get("media_url") or "").strip()
    return (item.get("media_url") or item.get("thumbnail_url") or "").strip()


def fetch_media_items(user_id: str, access_token: str) -> list[dict]:
    params = {
        "fields": (
            "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,"
            "children{media_type,media_url,thumbnail_url}"
        ),
        "limit": "12",
        "access_token": access_token,
    }
    url = f"https://graph.facebook.com/v21.0/{user_id}/media?{urlencode(params)}"
    data = http_json(url)
    raw_items = data.get("data", [])
    items: list[dict] = []
    for item in raw_items:
        image = pick_image_url_from_media(item)
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
    return items


def default_v2_payload() -> dict:
    return {
        "version": 2,
        "accounts": [
            {
                **meta,
                "updated_at": "",
                "items": [],
            }
            for meta in ACCOUNT_DEFAULTS
        ],
    }


def normalize_v2(data: dict) -> dict:
    """Dosyada eksik alan varsa sablonla tamamla."""
    by_id = {a["id"]: a for a in data.get("accounts", []) if isinstance(a, dict) and a.get("id")}
    accounts = []
    for meta in ACCOUNT_DEFAULTS:
        cur = by_id.get(meta["id"], {})
        items = cur.get("items", [])
        if not isinstance(items, list):
            items = []
        accounts.append(
            {
                "id": meta["id"],
                "handle": str(cur.get("handle") or meta["handle"]),
                "profile_url": str(cur.get("profile_url") or meta["profile_url"]),
                "updated_at": str(cur.get("updated_at") or ""),
                "items": items,
            }
        )
    return {"version": 2, "accounts": accounts}


def read_existing() -> dict:
    if not OUT_FILE.exists():
        return default_v2_payload()
    try:
        raw = OUT_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return default_v2_payload()

    if isinstance(data, dict) and data.get("version") == 2 and isinstance(data.get("accounts"), list):
        return normalize_v2(data)

    # Surum 1: tek `source` + `items`
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        v2 = default_v2_payload()
        v2["accounts"][0]["items"] = data["items"]
        v2["accounts"][0]["updated_at"] = str(data.get("updated_at") or "")
        return v2

    return default_v2_payload()


def main() -> None:
    existing = read_existing()
    existing_by_id = {a["id"]: a for a in existing["accounts"]}

    env1_uid = os.getenv("IG_USER_ID", "").strip()
    env1_tok = os.getenv("IG_ACCESS_TOKEN", "").strip()
    if not env1_uid or not env1_tok:
        print(
            "::warning::IG_USER_ID veya IG_ACCESS_TOKEN tanimli degil. "
            "Feed dosyasi degistirilmedi.",
            file=sys.stderr,
        )
        sys.exit(0)

    env2_uid = os.getenv("IG_USER_ID_2", "").strip()
    env2_tok = os.getenv("IG_ACCESS_TOKEN_2", "").strip() or env1_tok

    new_accounts: list[dict] = []

    for meta in ACCOUNT_DEFAULTS:
        acc_id = meta["id"]
        prev = existing_by_id.get(acc_id, {})

        if acc_id == "kalipso_albi_turkey":
            uid, tok = env1_uid, env1_tok
        else:
            uid, tok = env2_uid, env2_tok

        if acc_id == "lovely_albi_kalipso" and not uid:
            print(
                "::notice::IG_USER_ID_2 tanimli degil; @lovely_albi_kalipso icin API cagrilmadi "
                "(ikinci hesap icin repo secret ekleyin).",
                file=sys.stderr,
            )
            new_accounts.append(
                {
                    "id": meta["id"],
                    "handle": meta["handle"],
                    "profile_url": meta["profile_url"],
                    "updated_at": str(prev.get("updated_at") or ""),
                    "items": prev.get("items", []) if isinstance(prev.get("items"), list) else [],
                }
            )
            continue

        if not tok:
            print(f"::warning::{acc_id}: access token yok; onceki items korunur.", file=sys.stderr)
            new_accounts.append(
                {
                    "id": meta["id"],
                    "handle": meta["handle"],
                    "profile_url": meta["profile_url"],
                    "updated_at": str(prev.get("updated_at") or ""),
                    "items": prev.get("items", []) if isinstance(prev.get("items"), list) else [],
                }
            )
            continue

        try:
            items = fetch_media_items(uid, tok)
            new_accounts.append(
                {
                    "id": meta["id"],
                    "handle": meta["handle"],
                    "profile_url": meta["profile_url"],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "items": items,
                }
            )
        except HTTPError as e:
            print(
                f"::warning::{acc_id}: Instagram API HTTP {e.code}: {e.reason}. Onceki items korunur.",
                file=sys.stderr,
            )
            new_accounts.append(
                {
                    "id": meta["id"],
                    "handle": meta["handle"],
                    "profile_url": meta["profile_url"],
                    "updated_at": str(prev.get("updated_at") or ""),
                    "items": prev.get("items", []) if isinstance(prev.get("items"), list) else [],
                }
            )
        except URLError as e:
            print(f"::warning::{acc_id}: Baglanti hatasi: {e}. Onceki items korunur.", file=sys.stderr)
            new_accounts.append(
                {
                    "id": meta["id"],
                    "handle": meta["handle"],
                    "profile_url": meta["profile_url"],
                    "updated_at": str(prev.get("updated_at") or ""),
                    "items": prev.get("items", []) if isinstance(prev.get("items"), list) else [],
                }
            )
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as e:
            print(f"::warning::{acc_id}: Feed islenemedi: {e}. Onceki items korunur.", file=sys.stderr)
            new_accounts.append(
                {
                    "id": meta["id"],
                    "handle": meta["handle"],
                    "profile_url": meta["profile_url"],
                    "updated_at": str(prev.get("updated_at") or ""),
                    "items": prev.get("items", []) if isinstance(prev.get("items"), list) else [],
                }
            )

    payload = {"version": 2, "accounts": new_accounts}

    try:
        OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as e:
        print(f"::warning::instagram-feed.json yazilamadi: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
