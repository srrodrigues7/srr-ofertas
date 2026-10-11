# SRR Ofertas — desinstalar o motor deste computador.
# Desliga o motor, tira do Agendador de Tarefas e apaga C:\SRR-Ofertas.
# O Node e o Git continuam instalados (podem servir a outras coisas).

$ErrorActionPreference = 'Continue'
$Pasta = 'C:\SRR-Ofertas'
$Tarefa = 'SRR Ofertas - Motor'

$eu = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $eu.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Clear-Host
Write-Host "Isto DESLIGA o motor do SRR Ofertas neste computador e apaga a pasta $Pasta." -ForegroundColor Yellow
$resposta = Read-Host "Para confirmar, digite SIM e aperte Enter"
if ($resposta -ne 'SIM') { Write-Host "Nada foi feito."; Read-Host "Aperte Enter para fechar"; exit }

Stop-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $Tarefa -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Tarefa '$Tarefa' removida."

$arq = Join-Path $Pasta 'estado.json'
if (Test-Path $arq) {
  $e = Get-Content $arq -Raw | ConvertFrom-Json
  foreach ($p in @($e.vigiaPid, $e.motorPid)) { if ($p) { & taskkill.exe /pid $p /T /F 2>$null | Out-Null } }
}
Start-Sleep -Seconds 3
Remove-Item "$env:PUBLIC\Desktop\Conferir SRR Ofertas.lnk" -ErrorAction SilentlyContinue
# Sai da pasta antes de apagá-la (este arquivo pode estar rodando de dentro dela).
Set-Location $env:SystemRoot
Remove-Item $Pasta -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $Pasta) { Write-Host "Alguns arquivos ficaram em $Pasta (em uso). Reinicie e apague a pasta." -ForegroundColor Yellow }
else { Write-Host "Pasta $Pasta apagada." }

Write-Host ""
Write-Host "Pronto. Se não for reinstalar, apague também a chave 'Motor - $env:COMPUTERNAME'"
Write-Host "no GitHub (projeto > Settings > Deploy keys)."
Read-Host "Aperte Enter para fechar"
