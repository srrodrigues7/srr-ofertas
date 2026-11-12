@echo off
rem SRR Ofertas - liga o motor do Radar e o religa se ele cair.
rem
rem Quem chama: o atalho "SRR Ofertas - Motor" da pasta Inicializacao do
rem Windows, sem janela (conhost --headless), quando o Saulo entra no Windows.
rem Instalado por scripts\windows\instalar-motor-ao-entrar.ps1, que copia este
rem arquivo para %USERPROFILE%\SRR-Ofertas\motor.cmd.
rem
rem Nada aqui pode ficar em AppData: o que o app do Claude grava la vai para
rem uma pasta so dele, e o Windows, fora do app, nao enxerga (11/11/2026).
rem
rem A saida vai para motor-saida.log, ao lado deste arquivo. O motor tambem
rem escreve o proprio diario em logs\motor-AAAA-MM-DD.log, na pasta do repo.
rem Para o motor pegar codigo novo: encerre o node.exe dele; o laco religa.
setlocal
set "REPO=%USERPROFILE%\programing\srr-ofertas"
set "SAIDA=%~dp0motor-saida.log"
title SRR Ofertas - Motor (nao feche: o Radar para de ler ofertas)
cd /d "%REPO%" || (echo %date% %time% nao achei a pasta %REPO%>> "%SAIDA%" & exit /b 1)

:volta
rem Saida acima de 10 MB vira motor-saida.anterior.log (guarda so uma).
if exist "%SAIDA%" for %%A in ("%SAIDA%") do if %%~zA GTR 10000000 move /y "%SAIDA%" "%~dp0motor-saida.anterior.log" >nul
echo %date% %time% ligando o motor (laco %~f0)>> "%SAIDA%"
call "%ProgramFiles%\nodejs\npm.cmd" run motor >> "%SAIDA%" 2>&1
set "CODIGO=%errorlevel%"
rem 78 = configuracao errada (.env ou banco sem a configuracao): nao se
rem resolve sozinha em segundos, entao espera 5 min em vez de 10 s.
set "ESPERA=10"
if "%CODIGO%"=="78" set "ESPERA=300"
echo %date% %time% o motor saiu (codigo %CODIGO%), religando em %ESPERA% s>> "%SAIDA%"
rem ping -n N espera N-1 segundos.
set /a PINGS=ESPERA+1
ping -n %PINGS% 127.0.0.1 >nul
goto volta
