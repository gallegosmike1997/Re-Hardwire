<#
.SYNOPSIS
    Start the Re-Hardwire FastAPI backend, automatically choosing the LLM provider.

.DESCRIPTION
    Probes Ollama on http://localhost:11434. When reachable the backend is
    started with LLM_PROVIDER=ollama; otherwise it falls back to the local
    scripted provider (LLM_PROVIDER=local).

    Ollama runs locally on loopback, so this checks whether the Ollama service
    is up - it does NOT require an external internet connection once a model
    has been pulled. Crisis replies always use the local scripted reply and
    never call a provider, regardless of this setting.

.PARAMETER Provider
    Force a provider: local, ollama, or auto (default). auto probes Ollama.
.PARAMETER NoReload
    Run uvicorn without --reload (useful under process managers).
.PARAMETER Port
    Port to listen on (default 8000).

.EXAMPLE
    ./backend/start_backend.ps1
    # auto: Ollama -> ollama provider, otherwise -> local provider

.EXAMPLE
    ./backend/start_backend.ps1 -Provider local -NoReload
    # force the local scripted provider, no file watcher
#>
[CmdletBinding()]
param(
    [ValidateSet("local", "ollama", "auto")]
    [string]$Provider = "auto",

    [switch]$NoReload,

    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $BackendDir | Out-Null

$OllamaBase = if ($env:OLLAMA_BASE_URL) { $env:OLLAMA_BASE_URL.TrimEnd('/') } else { "http://localhost:11434" }
$OllamaProbeUrl = "$OllamaBase/api/tags"

function Test-OllamaReachable {
    param([string]$Url)
    try {
        $null = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 3 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Decide provider -----------------------------------------------------------
$chosenProvider = $Provider
if ($chosenProvider -eq "auto") {
    if (Test-OllamaReachable -Url $OllamaProbeUrl) {
        $chosenProvider = "ollama"
        Write-Host "[backend] Ollama reachable at $OllamaProbeUrl -> using Ollama provider." -ForegroundColor Green
    } else {
        $chosenProvider = "local"
        Write-Host "[backend] Ollama not reachable at $OllamaProbeUrl -> falling back to local scripted provider." -ForegroundColor Yellow
    }
}

# Apply environment for this uvicorn process only. load_dotenv() does NOT
# override existing environment variables, so these values win over backend/.env
# without rewriting it.
switch ($chosenProvider) {
    "ollama" {
        $env:LLM_PROVIDER = "ollama"
        if (-not $env:LLM_MODEL) { $env:LLM_MODEL = "phi3:mini" }
        if (-not $env:LLM_BASE_URL) { $env:LLM_BASE_URL = $OllamaBase }
    }
    "local" {
        $env:LLM_PROVIDER = "local"
        if (-not $env:LLM_MODEL) { $env:LLM_MODEL = "re-hardwire-local" }
    }
}

Write-Host "[backend] LLM_PROVIDER=$env:LLM_PROVIDER  LLM_MODEL=$env:LLM_MODEL"
Write-Host "[backend] Starting uvicorn on http://127.0.0.1:$Port ..."

$VenvDir = $null
foreach ($candidate in @("$BackendDir\venv", "$BackendDir\.venv")) {
    if (Test-Path "$candidate\Scripts\python.exe") { $VenvDir = $candidate; break }
}
if (-not $VenvDir) {
    throw "No Python venv found under $BackendDir. Run the backend setup (scripts/setup_backend.sh) first."
}
$uvicorn = "$VenvDir\Scripts\uvicorn.exe"
if (-not (Test-Path $uvicorn)) {
    throw "uvicorn not found at $uvicorn."
}

$args = @("app.main:app", "--host", "127.0.0.1", "--port", $Port)
if (-not $NoReload) {
    $args += "--reload"
}

& $uvicorn @args
