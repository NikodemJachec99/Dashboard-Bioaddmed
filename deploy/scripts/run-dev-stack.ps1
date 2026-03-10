$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
$dockerExe = Join-Path $dockerBin "docker.exe"
$tempDockerConfig = Join-Path $repoRoot (".docker-tmp-" + [guid]::NewGuid().ToString("N"))
$envFile = Join-Path $repoRoot ".env"
$sourceDockerConfig = Join-Path $env:USERPROFILE ".docker"

New-Item -ItemType Directory -Force -Path $tempDockerConfig | Out-Null

if (Test-Path $sourceDockerConfig) {
    Copy-Item -Path (Join-Path $sourceDockerConfig "*") -Destination $tempDockerConfig -Recurse -Force
}

$configPath = Join-Path $tempDockerConfig "config.json"
$config = @{ auths = @{} }
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json -AsHashtable
}
$null = $config.Remove("credsStore")
if (-not $config.ContainsKey("auths")) {
    $config["auths"] = @{}
}
$config | ConvertTo-Json -Depth 10 | Set-Content -Path $configPath -Encoding Ascii

$env:PATH = "$dockerBin;$env:PATH"
$env:DOCKER_CONFIG = $tempDockerConfig

Get-Content $envFile | ForEach-Object {
    if (-not $_ -or $_.StartsWith("#")) { return }
    $parts = $_.Split("=", 2)
    if ($parts.Length -eq 2) {
        [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1])
    }
}

Set-Location $repoRoot

& $dockerExe compose -f deploy/docker-compose.dev.yml up -d --build
& $dockerExe compose -f deploy/docker-compose.dev.yml exec -T -e DJANGO_DISABLE_APP_MIGRATIONS=False backend python manage.py migrate --fake-initial
& $dockerExe compose -f deploy/docker-compose.dev.yml exec -T backend python manage.py bootstrap_bioaddmed
& $dockerExe compose -f deploy/docker-compose.dev.yml ps
