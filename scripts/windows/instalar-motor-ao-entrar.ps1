# Instala (ou refaz) o motor do Radar ligando sozinho, sem janela, quando o
# Saulo entra no Windows: copia motor-ao-entrar.cmd para
# %USERPROFILE%\SRR-Ofertas\motor.cmd e (re)cria o atalho
# "SRR Ofertas - Motor" na pasta Inicializacao.
#
# RODE FORA DO APP DO CLAUDE (PowerShell do menu Iniciar). De dentro do app,
# o que se grava em AppData (a pasta Inicializacao fica la) pode ir para uma
# pasta so do app, que o Windows nao enxerga ao ligar. Foi o que deixou o
# motor parado de 11/11 a 12/11/2026.
#
# Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File instalar-motor-ao-entrar.ps1
param([string]$Destino = (Join-Path $env:USERPROFILE 'SRR-Ofertas'))
$ErrorActionPreference = 'Stop'

if ($Destino -like '*\AppData\*') { throw "Destino dentro de AppData ($Destino): use uma pasta fora dele." }

New-Item -ItemType Directory -Force $Destino | Out-Null
$lancador = Join-Path $Destino 'motor.cmd'
# O .cmd precisa de CRLF; o arquivo do repo pode estar com LF.
$texto = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'motor-ao-entrar.cmd')) -replace "`r?`n", "`r`n"
[IO.File]::WriteAllText($lancador, $texto, [Text.Encoding]::ASCII)

$inicializacao = [Environment]::GetFolderPath('Startup')
$caminhoAtalho = Join-Path $inicializacao 'SRR Ofertas - Motor.lnk'
$atalho = (New-Object -ComObject WScript.Shell).CreateShortcut($caminhoAtalho)
# conhost --headless: o laco roda sem janela nenhuma (nem no Terminal do
# Windows), entao ninguem fecha sem querer.
$atalho.TargetPath = Join-Path $env:SystemRoot 'System32\conhost.exe'
$atalho.Arguments = "--headless `"$(Join-Path $env:SystemRoot 'System32\cmd.exe')`" /d /c `"$lancador`""
$atalho.WorkingDirectory = $Destino
$atalho.WindowStyle = 7
$atalho.Description = 'Liga o motor do Radar (sem janela) ao entrar no Windows e religa se cair.'
$atalho.Save()

"Pronto."
"  lancador: $lancador"
"  saida:    $(Join-Path $Destino 'motor-saida.log')"
"  atalho:   $caminhoAtalho"
