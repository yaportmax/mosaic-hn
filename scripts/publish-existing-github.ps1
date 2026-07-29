param(
  [string]$RemoteUrl = "https://github.com/yaportmax/mosaic-hn.git"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required"
}

git remote remove github 2>$null
git remote add github $RemoteUrl
git branch -M main
git push --force-with-lease -u github main
git push github --tags

Write-Host "Published to $($RemoteUrl -replace '\.git$','')"
