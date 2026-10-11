# SRR Ofertas — instalador do motor no computador dedicado.
#
# O Saulo dá dois cliques em "Instalar SRR Ofertas.cmd", que chama este
# arquivo. Pode rodar de novo quantas vezes quiser: serve também para
# reinstalar ou para trocar o vigia por um mais novo.
#
# O que ele faz, na ordem:
#   1. pede permissão de administrador (o Windows pergunta "permitir alterações?");
#   2. instala o Node e o Git pelo instalador oficial da Microsoft (winget), se faltarem;
#   3. cria C:\SRR-Ofertas e copia o vigia e o .env do pen drive;
#   4. cria a chave que deixa ESTE computador só BAIXAR o código do GitHub
#      (o Saulo cola essa chave no GitHub uma vez — o instalador abre a página);
#   5. baixa o código e prepara a primeira versão do motor;
#   6. impede o computador de dormir quando está na tomada;
#   7. registra o motor no Agendador de Tarefas do Windows, para ligar sozinho
#      quando o computador inicia, mesmo sem ninguém entrar;
#   8. confere no banco que o motor bateu.

$ErrorActionPreference = 'Stop'
$Pasta = 'C:\SRR-Ofertas'
$Origem = $PSScriptRoot
$Tarefa = 'SRR Ofertas - Motor'

function Passo($n, $t) { Write-Host ""; Write-Host "[$n/8] $t" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   OK  $t" -ForegroundColor Green }
function Info($t) { Write-Host "       $t" }
function Falha($t) {
  Write-Host ""
  Write-Host "   ERRO  $t" -ForegroundColor Red
  Write-Host ""
  Write-Host "   A instalação parou aqui. Tire uma foto desta tela e mande para o suporte."
  Read-Host "   Aperte Enter para fechar"
  exit 1
}

# --- 1. administrador -----------------------------------------------------------
$eu = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $eu.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Clear-Host
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   SRR Ofertas — instalação do motor" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

try {

Passo 1 "Conferindo o pacote"
$envOrigem = Join-Path $Origem '.env'
if (-not (Test-Path $envOrigem)) { Falha "Não achei o arquivo .env ao lado do instalador. O pacote veio incompleto." }
if (-not (Test-Path (Join-Path $Origem 'vigia.mjs'))) { Falha "Não achei o vigia.mjs ao lado do instalador. O pacote veio incompleto." }
$cfg = @{}
foreach ($l in Get-Content $envOrigem -Encoding UTF8) {
  if ($l -match '^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$') { $cfg[$Matches[1]] = $Matches[2] }
}
foreach ($n in 'DATABASE_URL', 'SRR_REPO', 'SRR_RAMO', 'ATUALIZAR_A_CADA_MIN') {
  if (-not $cfg[$n]) { Falha "O .env do pacote não tem $n." }
}
if ($cfg['SRR_REPO'] -notmatch '^git@github\.com:(.+?)(\.git)?$') { Falha "SRR_REPO no .env não é um endereço do GitHub (git@github.com:conta/projeto.git)." }
$RepoNome = $Matches[1]
Ok "Pacote completo. Código: github.com/$RepoNome, ramo $($cfg['SRR_RAMO'])."

# --- 2. Node e Git -------------------------------------------------------------
Passo 2 "Node e Git (programas de que o motor precisa)"
$Node = 'C:\Program Files\nodejs\node.exe'
$Git = 'C:\Program Files\Git\cmd\git.exe'
$precisaWinget = (-not (Test-Path $Node)) -or (-not (Test-Path $Git))
if ($precisaWinget -and -not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Falha "Este Windows não tem o 'winget'. Abra a Microsoft Store, procure 'Instalador de Aplicativo', atualize, e rode este instalador de novo."
}
if (-not (Test-Path $Node)) {
  Info "Instalando o Node (pode levar alguns minutos)..."
  winget install --id OpenJS.NodeJS.LTS -e --silent --scope machine --accept-package-agreements --accept-source-agreements | Out-Host
  if (-not (Test-Path $Node)) { Falha "O Node não foi instalado." }
}
$versaoNode = & $Node -p "process.versions.node.split('.')[0]"
if ([int]$versaoNode -lt 24) { Falha "O Node instalado é a versão $versaoNode; o motor precisa da 24 ou mais nova. Desinstale o Node antigo e rode de novo." }
Ok "Node $(& $Node -v)"
if (-not (Test-Path $Git)) {
  Info "Instalando o Git (pode levar alguns minutos)..."
  winget install --id Git.Git -e --silent --scope machine --accept-package-agreements --accept-source-agreements | Out-Host
  if (-not (Test-Path $Git)) { Falha "O Git não foi instalado." }
}
Ok "$(& $Git --version)"
$GitDir = Split-Path (Split-Path $Git)
$Ssh = Join-Path $GitDir 'usr\bin\ssh.exe'
$SshKeygen = Join-Path $GitDir 'usr\bin\ssh-keygen.exe'

# --- 3. pasta, vigia e .env -------------------------------------------------------
Passo 3 "Pasta C:\SRR-Ofertas"
$tarefaExiste = Get-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
if ($tarefaExiste) {
  Info "Já existe uma instalação: desligando o motor antes de atualizar..."
  Stop-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
}
$arqEstado = Join-Path $Pasta 'estado.json'
if (Test-Path $arqEstado) {
  $est = Get-Content $arqEstado -Raw | ConvertFrom-Json
  foreach ($p in @($est.vigiaPid, $est.motorPid)) {
    # Programas de fora escrevendo em stderr viram "erro" no PowerShell 5.1;
    # aqui um processo que já tinha saído não é problema.
    if ($p) { & { $ErrorActionPreference = "Continue"; & taskkill.exe /pid $p /T /F 2>$null | Out-Null } }
  }
}
New-Item -ItemType Directory -Force -Path $Pasta, "$Pasta\logs", "$Pasta\chave", "$Pasta\versoes" | Out-Null
Copy-Item (Join-Path $Origem 'vigia.mjs') "$Pasta\vigia.mjs" -Force
foreach ($extra in 'conferir.ps1', 'Conferir motor.cmd', 'desinstalar.ps1', 'Desinstalar SRR Ofertas.cmd', 'LEIA-ME.txt') {
  if (Test-Path (Join-Path $Origem $extra)) { Copy-Item (Join-Path $Origem $extra) (Join-Path $Pasta $extra) -Force }
}
# O .env do pacote + onde está o Git (o Windows só atualiza o caminho dos
# programas para o Agendador depois de reiniciar; o vigia não pode depender disso).
$linhas = Get-Content $envOrigem -Encoding UTF8 | Where-Object { $_ -notmatch '^SRR_GIT=' }
$linhas += "SRR_GIT=`"$Git`""
[IO.File]::WriteAllLines("$Pasta\.env", $linhas, (New-Object System.Text.UTF8Encoding $false))
# O .env tem a senha do banco: só o sistema e os administradores leem.
& icacls.exe "$Pasta\.env" /inheritance:r /grant:r "*S-1-5-18:F" "*S-1-5-32-544:F" | Out-Null
$iniciar = @"
@echo off
rem Ligado pelo Agendador de Tarefas quando o computador inicia. Se o vigia
rem sair, religa em 5 segundos. Codigo 2 = ja existe um vigia rodando.
cd /d "$Pasta"
:volta
"$Node" "$Pasta\vigia.mjs"
if %errorlevel%==2 exit /b 0
ping -n 6 127.0.0.1 >nul
goto volta
"@
[IO.File]::WriteAllText("$Pasta\iniciar.cmd", $iniciar, (New-Object System.Text.ASCIIEncoding))
Ok "Pasta pronta, vigia e configuração copiados."

# --- 4. chave de leitura do GitHub ------------------------------------------------
Passo 4 "Acesso ao código no GitHub (só leitura)"
$Chave = "$Pasta\chave\id_ed25519"
if (-not (Test-Path $Chave)) {
  & $SshKeygen -t ed25519 -f $Chave -N '""' -C "srr-ofertas-motor-$env:COMPUTERNAME" -q
  if (-not (Test-Path $Chave)) { Falha "Não consegui criar a chave de acesso." }
}
& icacls.exe $Chave /inheritance:r /grant:r "*S-1-5-18:F" "*S-1-5-32-544:F" | Out-Null
$chaveU = $Chave -replace '\\', '/'
$hostsU = "$Pasta\chave\known_hosts" -replace '\\', '/'
$SshComando = "`"$($Ssh -replace '\\', '/')`" -i `"$chaveU`" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=`"$hostsU`""
$env:GIT_SSH_COMMAND = $SshComando

function TemAcesso {
  $ErrorActionPreference = "Continue"
  & $Git ls-remote $cfg['SRR_REPO'] HEAD 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

$tentativa = 0
while (-not (TemAcesso)) {
  $tentativa++
  if ($tentativa -gt 5) { Falha "O GitHub continua recusando a chave. Confira se ela foi salva em Deploy keys do projeto $RepoNome." }
  $publica = Get-Content "$Chave.pub" -Raw
  Set-Clipboard -Value $publica.Trim()
  Write-Host ""
  Write-Host "   Falta um passo seu (é uma vez só):" -ForegroundColor Yellow
  Write-Host "   1. Vou abrir a página do GitHub. Entre na sua conta se ele pedir."
  Write-Host "   2. Em 'Title', escreva:  Motor - $env:COMPUTERNAME"
  Write-Host "   3. Em 'Key', cole (Ctrl+V) — o código já está copiado."
  Write-Host "   4. NÃO marque 'Allow write access'. Clique em 'Add key'."
  Start-Process "https://github.com/$RepoNome/settings/keys/new"
  Read-Host "   Depois de clicar em 'Add key', volte aqui e aperte Enter"
}
Ok "Este computador consegue baixar o código (e só baixar)."

$Repo = "$Pasta\repo"
if (-not (Test-Path "$Repo\.git")) {
  Info "Baixando o código..."
  & $Git clone --no-checkout $cfg['SRR_REPO'] $Repo
  if ($LASTEXITCODE -ne 0) { Falha "Não consegui baixar o código." }
}
& $Git -C $Repo config core.sshCommand $SshComando
& $Git -C $Repo config remote.origin.url $cfg['SRR_REPO']
# O vigia roda como SISTEMA, e o Git desconfia de pasta criada por outro
# usuário. Neste computador dedicado, liberamos.
& $Git config --system --replace-all safe.directory '*'
Ok "Código baixado em $Repo."

# --- 5. primeira versão -------------------------------------------------------------
Passo 5 "Preparando o motor (instala, confere o banco — leva alguns minutos)"
Remove-Item Env:GIT_SSH_COMMAND
& $Node "$Pasta\vigia.mjs" --preparar-primeira
if ($LASTEXITCODE -ne 0) { Falha "Não consegui preparar o motor. O motivo está nas linhas acima e em $Pasta\logs." }
Ok "Motor preparado."

# --- 6. não dormir ------------------------------------------------------------------
Passo 6 "Impedindo o computador de dormir na tomada"
& powercfg.exe /change standby-timeout-ac 0
& powercfg.exe /change hibernate-timeout-ac 0
Ok "Na tomada, o computador não suspende nem hiberna (a tela ainda pode apagar)."

# --- 7. ligar sozinho -------------------------------------------------------------
Passo 7 "Fazendo o motor ligar sozinho com o Windows"
$acao = New-ScheduledTaskAction -Execute "$Pasta\iniciar.cmd" -WorkingDirectory $Pasta
$aoIniciar = New-ScheduledTaskTrigger -AtStartup
# A cada 5 minutos o Windows confere: se o vigia não estiver rodando, liga.
$aCada5 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$regras = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
$quem = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $Tarefa -Action $acao -Trigger $aoIniciar, $aCada5 -Settings $regras -Principal $quem `
  -Description 'SRR Ofertas: liga o vigia, que liga e atualiza o motor. Instalado por C:\SRR-Ofertas.' -Force | Out-Null
Start-ScheduledTask -TaskName $Tarefa
Ok "Registrado no Agendador de Tarefas como '$Tarefa', e ligado."

# Atalho na Área de Trabalho para conferir.
$atalho = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:PUBLIC\Desktop\Conferir SRR Ofertas.lnk")
$atalho.TargetPath = "$Pasta\Conferir motor.cmd"
$atalho.WorkingDirectory = $Pasta
$atalho.Save()

# --- 8. conferência no banco -----------------------------------------------------
Passo 8 "Conferindo no banco se o motor bateu"
$estado = Get-Content $arqEstado -Raw | ConvertFrom-Json
$versao = Join-Path "$Pasta\versoes" ($estado.atual.Substring(0, 12))
$verde = $false
for ($i = 0; $i -lt 18 -and -not $verde; $i++) {
  Start-Sleep -Seconds 10
  Push-Location $versao
  $env:DATABASE_URL = $cfg['DATABASE_URL']
  & $Node --import tsx scripts/ver-saude.ts | Out-Null
  $verde = ($LASTEXITCODE -eq 0)
  Pop-Location
  if (-not $verde) { Info "esperando o primeiro sinal... ($(($i + 1) * 10) s)" }
}
Push-Location $versao
& $Node --import tsx scripts/ver-saude.ts
Pop-Location
Remove-Item Env:DATABASE_URL

Write-Host ""
if ($verde) {
  Write-Host "==============================================" -ForegroundColor Green
  Write-Host "   Motor instalado e rodando." -ForegroundColor Green
  Write-Host "==============================================" -ForegroundColor Green
} else {
  Write-Host "   O motor foi instalado, mas ainda não deu sinal verde." -ForegroundColor Yellow
  Write-Host "   Espere 2 minutos e abra 'Conferir SRR Ofertas' na Área de Trabalho."
}
Write-Host ""
Write-Host "   Falta só uma coisa, que nenhum instalador alcança: fazer o computador"
Write-Host "   LIGAR SOZINHO QUANDO A ENERGIA VOLTAR. O passo a passo está no"
Write-Host "   LEIA-ME.txt (em C:\SRR-Ofertas)."
Write-Host ""
Write-Host "   Pode apagar o pen drive agora: ele tem a senha do banco."
Write-Host ""
Read-Host "   Aperte Enter para fechar"

} catch {
  Falha $_.Exception.Message
}
