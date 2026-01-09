$ErrorActionPreference = "Stop"

$url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v24.02.0-0/Release-24.02.0-0.zip"
$zipPath = "poppler.zip"
$destDir = "scraper/bin"
$tmpDir = "temp_poppler"

Write-Host "Downloading Poppler from $url..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

Write-Host "Setting up binary directory..."
if (-not (Test-Path $destDir)) {
  New-Item -ItemType Directory -Path $destDir | Out-Null
}

# The zip structure is usually Release-...\Library\bin
$binSrc = Get-ChildItem -Path $tmpDir -Recurse | Where-Object { $_.Name -eq "pdftoppm.exe" } | Select-Object -ExpandProperty DirectoryName

if ($binSrc) {
  Copy-Item -Path "$binSrc\*" -Destination $destDir -Force -Recurse
  Write-Host "Poppler binaries installed to $destDir"
}
else {
  Write-Error "Could not locate bin directory in extracted files."
}

# Cleanup
Remove-Item $zipPath -Force
Remove-Item $tmpDir -Recurse -Force

Write-Host "Done! You can now run the scraper."
