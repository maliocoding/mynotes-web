$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Database = Join-Path $Root "prisma\data\notes.db"
$BackupDir = Join-Path $Root "backups"
if (-not (Test-Path $Database)) { throw "Database tidak ditemukan: $Database" }
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Destination = Join-Path $BackupDir "notes-$Timestamp.db"
Copy-Item $Database $Destination
Get-ChildItem $BackupDir -Filter "notes-*.db" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force
Write-Host "Backup tersimpan: $Destination"
