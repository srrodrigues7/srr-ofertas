# SRR Ofertas — "Conferir motor": mostra, em português, se o motor está de pé.
# Não muda nada no computador. Aberto pelo atalho "Conferir SRR Ofertas".

$ErrorActionPreference = 'Continue'
$Pasta = 'C:\SRR-Ofertas'
$Tarefa = 'SRR Ofertas - Motor'
$Node = 'C:\Program Files\nodejs\node.exe'

# O .env (com a senha do banco) só abre para administrador.
$eu = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $eu.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

function Titulo($t) { Write-Host ""; Write-Host $t -ForegroundColor Cyan }

Clear-Host
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   SRR Ofertas — conferência do motor" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

Titulo "Ligar sozinho com o Windows"
$t = Get-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
if ($t) {
  $info = $t | Get-ScheduledTaskInfo
  $estadoTarefa = @{ Running = 'rodando'; Ready = 'pronta (não está rodando agora)'; Disabled = 'DESLIGADA' }[[string]$t.State]
  Write-Host "   Tarefa '$Tarefa': $estadoTarefa. Última vez que ligou: $($info.LastRunTime)"
} else {
  Write-Host "   A tarefa '$Tarefa' NÃO existe. Rode o instalador." -ForegroundColor Red
}

Titulo "Vigia e versão"
$arq = Join-Path $Pasta 'estado.json'
if (Test-Path $arq) {
  $e = Get-Content $arq -Raw | ConvertFrom-Json
  $vivo = $e.vigiaPid -and (Get-Process -Id $e.vigiaPid -ErrorAction SilentlyContinue)
  $motorVivo = $e.motorPid -and (Get-Process -Id $e.motorPid -ErrorAction SilentlyContinue)
  Write-Host "   Vigia: $(if ($vivo) { 'rodando' } else { 'NÃO está rodando' })"
  Write-Host "   Motor: $(if ($motorVivo) { 'rodando' } else { 'NÃO está rodando' })"
  if ($e.atual) { Write-Host "   Versão atual: $($e.atual.Substring(0, 7))" }
  if ($e.anterior) { Write-Host "   Versão anterior (para voltar, se precisar): $($e.anterior.Substring(0, 7))" }
  if ($e.ultimaVerificacao) { Write-Host "   Última vez que olhou o GitHub: $($e.ultimaVerificacao)" }
  if ($e.ultimaAtualizacao) { Write-Host "   Última atualização: $($e.ultimaAtualizacao)" }
  $recusadas = @($e.recusadas.PSObject.Properties)
  foreach ($r in $recusadas) {
    Write-Host "   Versão recusada $($r.Name.Substring(0, 7)): $($r.Value.motivo)" -ForegroundColor Yellow
  }
} else {
  Write-Host "   Ainda não há estado gravado." -ForegroundColor Yellow
}

foreach ($quem in 'vigia', 'motor') {
  Titulo "Últimas linhas do log do $quem"
  $log = Get-ChildItem "$Pasta\logs\$quem-*.log" -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
  if ($log) { Get-Content $log.FullName -Tail 12 -Encoding UTF8 | ForEach-Object { Write-Host "   $_" } }
  else { Write-Host "   (sem log ainda)" }
}

Titulo "O que o banco diz"
if ($e -and $e.atual) {
  $versao = Join-Path "$Pasta\versoes" ($e.atual.Substring(0, 12))
  foreach ($l in Get-Content "$Pasta\.env" -Encoding UTF8 -ErrorAction SilentlyContinue) {
    if ($l -match '^\s*DATABASE_URL\s*=\s*"?(.*?)"?\s*$') { $env:DATABASE_URL = $Matches[1] }
  }
  if (-not $env:DATABASE_URL) {
    Write-Host "   Não consegui ler a conexão do banco no .env." -ForegroundColor Yellow
  } else {
    Push-Location $versao
    & $Node --import tsx scripts/ver-saude.ts
    Pop-Location
  }
}

Write-Host ""
Read-Host "Aperte Enter para fechar"
