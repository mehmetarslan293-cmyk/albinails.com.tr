"""
Sunucunun GitHub'a git pull yapabilmesi icin deploy key uretir.

Calistirma (proje kokunden):
  python scripts/generate_deploy_key.py

PUBLIC (.pub) -> GitHub Repo Settings > Deploy keys > Key alani
PRIVATE (uzantisiz) -> sunucu ~/.ssh/ (asla Git'e commit etmeyin)
"""
from __future__ import annotations

import subprocess
import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "deploy-keys"
KEY = OUT_DIR / "albinails_deploy_ed25519"


def main() -> None:
    ssh_bin = shutil.which("ssh-keygen")
    if not ssh_bin and sys.platform == "win32":
        win = Path(r"C:\Windows\System32\OpenSSH\ssh-keygen.exe")
        ssh_bin = str(win) if win.exists() else None
    if not ssh_bin:
        print("ssh-keygen bulunamadi (PATH veya Windows OpenSSH).")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pub_path = Path(str(KEY) + ".pub")
    for p in (KEY, pub_path):
        if p.exists():
            p.unlink()

    subprocess.run(
        [
            ssh_bin,
            "-t",
            "ed25519",
            "-C",
            "albinails-deploy-github",
            "-f",
            str(KEY),
            "-q",
            "-N",
            "",
        ],
        check=True,
    )

    pub = pub_path.read_text(encoding="ascii").strip()
    print("Tamam.\n")
    print("PRIVATE dosya (sunucuya kopyalayin):", KEY)
    print("PUBLIC dosya:", pub_path)
    print("\nGitHub > Deploy keys > Key alanina tam olarak su satiri yapistirin:\n")
    print(pub)


if __name__ == "__main__":
    main()
