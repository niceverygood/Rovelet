param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$taskNode=(Get-Command node -ErrorAction SilentlyContinue).Source
if(-not $taskNode){$taskNode=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'}
if(-not (Test-Path -LiteralPath $taskNode)){throw 'Install Node.js 22.12 or newer, then run again.'}
$taskVersion=[version]((& $taskNode --version).Trim().TrimStart('v'))
if($taskVersion -lt [version]'22.12.0'){throw 'Node.js 22.12 or newer is required.'}
$taskPackage=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'package.json') -Raw | ConvertFrom-Json
$taskInfoPath=Join-Path $PSScriptRoot 'dist/release-info.json'
$taskExpectedBuild=if(Test-Path -LiteralPath $taskInfoPath){(Get-Content -LiteralPath $taskInfoPath -Raw | ConvertFrom-Json).buildId}else{''}
$taskPort=$null
$taskReused=$false
foreach($taskCandidate in 4180..4190){
 try{$taskHealth=Invoke-RestMethod -Uri "http://127.0.0.1:$taskCandidate/health" -TimeoutSec 1;if($taskHealth.game -eq 'wandering-hearth' -and $taskHealth.basePath -eq '/' -and $taskHealth.version -eq $taskPackage.version -and (-not $taskExpectedBuild -or $taskHealth.buildId -eq $taskExpectedBuild)){$taskPort=$taskCandidate;$taskReused=$true;break}}catch{}
 if(-not (Get-NetTCPConnection -LocalPort $taskCandidate -State Listen -ErrorAction SilentlyContinue)){$taskPort=$taskCandidate;break}
}
if(-not $taskPort){throw 'No free local port from 4180 to 4190.'}
if(-not $taskReused){
 $env:PORT=[string]$taskPort
 $env:HOST='127.0.0.1'
 $env:GAME_BASE='/'
 $taskServerPath=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'server.mjs')).Path
 $taskProcess=Start-Process -FilePath $taskNode -ArgumentList @('"'+$taskServerPath+'"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
 $taskReady=$false
 for($taskAttempt=0;$taskAttempt -lt 20;$taskAttempt++){
  try{
   $taskProcess.Refresh()
   if($taskProcess.HasExited){break}
   $taskHealth=Invoke-RestMethod -Uri "http://127.0.0.1:$taskPort/health" -TimeoutSec 1
   $taskProcess.Refresh()
   $taskListener=Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.OwningProcess -eq $taskProcess.Id -and $_.LocalAddress -in @('127.0.0.1','0.0.0.0','::','::ffff:127.0.0.1')}
   if(-not $taskProcess.HasExited -and $taskListener -and $taskHealth.game -eq 'wandering-hearth' -and $taskHealth.basePath -eq '/' -and $taskHealth.version -eq $taskPackage.version -and (-not $taskExpectedBuild -or $taskHealth.buildId -eq $taskExpectedBuild)){$taskReady=$true;break}
  }catch{}
  Start-Sleep -Milliseconds 250
 }
 if(-not $taskReady){$taskProcess.Refresh();if(-not $taskProcess.HasExited){Stop-Process -InputObject $taskProcess -ErrorAction SilentlyContinue};throw 'Could not start the game server.'}
 @{pid=$taskProcess.Id;port=$taskPort;version=$taskPackage.version;buildId=$taskHealth.buildId;basePath=$taskHealth.basePath;creationUtc=$taskProcess.StartTime.ToUniversalTime().ToString('o');serverPath=$taskServerPath} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot '.hearth-server.json') -Encoding utf8
}
$taskUrl="http://127.0.0.1:$taskPort/"
Write-Host $taskUrl
if(-not $NoBrowser){Start-Process $taskUrl}

