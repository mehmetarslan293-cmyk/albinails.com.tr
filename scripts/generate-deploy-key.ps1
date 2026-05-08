# Calistirma: .\scripts\generate-deploy-key.ps1
# Python ile bos parolali Ed25519 anahtari uretir (deploy-keys/ klasorunde).

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
python scripts/generate_deploy_key.py
if ($LASTEXITCODE -ne 0) {
  Write-Host "Python bulunamadi veya hata. Manuel:"
  Write-Host '  ssh-keygen -t ed25519 -C "albinails-deploy-github" -f "./deploy-keys/albinails_deploy_ed25519"'
  Write-Host "  (Parola soruldugunda iki kez Enter)"
}
