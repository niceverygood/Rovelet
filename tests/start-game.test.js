import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
const launcher=fileURLToPath(new URL('../start-game.ps1',import.meta.url)),project=path.dirname(launcher);
const shell=process.platform==='win32'?'powershell.exe':null;
const shellAvailable=!!shell&&!spawnSync(shell,['-NoProfile','-NonInteractive','-Command','exit 0'],{windowsHide:true}).error;
const options={skip:!shellAvailable};
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";

// Execute the actual launcher with commands shadowed in this private shell.
// No HTTP requests, listening sockets, server processes, metadata writes, or
// process termination occur. Only the existing Node executable reads --version.
function launch(config={}){
 const encoded=Buffer.from(JSON.stringify(config)).toString('base64');
 const script=`
$cfg=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')) | ConvertFrom-Json
$global:qa=@{started=0;stopped=@();refreshes=0;sleeps=0;requests=0;record=$null;success=$false;error=$null;url=$null}
if($null -ne $cfg.inheritedHost){$env:HOST=$cfg.inheritedHost}
if($null -ne $cfg.inheritedBase){$env:GAME_BASE=$cfg.inheritedBase}
function Get-Command {param($Name,$ErrorAction) if($Name -ne 'node'){throw 'Unexpected command lookup'};[pscustomobject]@{Source=${literal(process.execPath)}}}
function Test-Path {param($LiteralPath) if($LiteralPath -like '*release-info.json'){return -not $cfg.noExpectedBuild};return $true}
function Get-Content {param($LiteralPath,[switch]$Raw) if($LiteralPath -like '*package.json'){return '{"version":"1.0.0-test"}'};if($LiteralPath -like '*release-info.json'){return '{"buildId":"expected-build"}'};throw 'Unexpected file read'}
function Invoke-RestMethod {
 param($Uri,$TimeoutSec)
 $global:qa.requests++
 if(-not $global:qa.started -and -not $cfg.reuse){throw 'No existing server'}
 $health=[pscustomobject]@{game='wandering-hearth';version='1.0.0-test';basePath='/';buildId='expected-build'}
 if($cfg.health){foreach($property in $cfg.health.PSObject.Properties){$health.($property.Name)=$property.Value}}
 if($global:qa.started -and $cfg.exitAfterHealth){$global:qa.child.HasExited=$true}
 return $health
}
function Get-NetTCPConnection {
 param($LocalPort,$State,$ErrorAction)
 if(-not $global:qa.started -or $cfg.noListener){return}
 $owner=if($null -ne $cfg.listenerPid){$cfg.listenerPid}else{43001}
 $address=if($cfg.address){$cfg.address}else{'127.0.0.1'}
 [pscustomobject]@{OwningProcess=$owner;LocalAddress=$address;LocalPort=$LocalPort}
}
function Start-Process {
 param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle,[switch]$PassThru)
 if($WindowStyle -ne 'Hidden' -or -not $PassThru -or $WorkingDirectory -ne ${literal(project)} -or $ArgumentList[0] -ne ('"'+${literal(path.join(project,'server.mjs'))}+'"')){throw 'Unsafe launch arguments'}
 if($env:HOST -ne '127.0.0.1' -or $env:GAME_BASE -ne '/' -or $env:PORT -ne '4180'){throw 'Unsafe inherited launch environment'}
 $global:qa.launchEnvironment=@{host=$env:HOST;basePath=$env:GAME_BASE;port=$env:PORT}
 $global:qa.started++
 $global:qa.child=[pscustomobject]@{Id=43001;HasExited=[bool]$cfg.exited;StartTime=[datetime]::Parse('2026-10-17T08:00:00Z')}
 $global:qa.child | Add-Member -MemberType ScriptMethod -Name Refresh -Value {$global:qa.refreshes++}
 return $global:qa.child
}
function Stop-Process {param($InputObject,$Id,$ErrorAction) if($null -eq $InputObject -or $InputObject -ne $global:qa.child -or $null -ne $Id){throw 'Attempted to terminate an unowned process'};$global:qa.stopped+=$InputObject.Id;$InputObject.HasExited=$true}
function Start-Sleep {param($Milliseconds) $global:qa.sleeps++}
function Set-Content {param([Parameter(ValueFromPipeline=$true)]$Value,$LiteralPath,$Encoding) process {if($LiteralPath -ne ${literal(path.join(project,'.hearth-server.json'))}){throw 'Unexpected metadata write'};$global:qa.record=$Value | ConvertFrom-Json}}
function Write-Host {param($Object) $global:qa.url=[string]$Object}
try {& ${literal(launcher)} -NoBrowser;$global:qa.success=$true}catch{$global:qa.error=$_.Exception.Message}
$global:qa.Remove('child')
$global:qa | ConvertTo-Json -Depth 6 -Compress
`;
 const result=spawnSync(shell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000});
 assert.equal(result.status,0,result.stderr||result.error?.message);return JSON.parse(result.stdout.trim());
}

test('launcher accepts only its living child and records root/build/process identity',options,()=>{
 const result=launch({inheritedHost:'0.0.0.0',inheritedBase:'/hearth/'});assert.equal(result.success,true,result.error);assert.equal(result.started,1);assert.deepEqual(result.stopped,[]);assert.equal(result.url,'http://127.0.0.1:4180/');
 assert.deepEqual(result.launchEnvironment,{host:'127.0.0.1',basePath:'/',port:'4180'});
 assert.equal(result.record.pid,43001);assert.equal(result.record.port,4180);assert.equal(result.record.version,'1.0.0-test');assert.equal(result.record.buildId,'expected-build');assert.equal(result.record.basePath,'/');assert.equal(result.record.serverPath,path.join(project,'server.mjs'));assert.equal(Date.parse(result.record.creationUtc),Date.parse('2026-10-17T08:00:00Z'));
});
test('new-server readiness rejects wrong game, version, root path, or expected build and stops only its child',options,()=>{
 for(const health of [{game:'another-game'},{version:'old'},{basePath:'/hearth/'},{basePath:null},{buildId:'old-build'},{buildId:null}]){const result=launch({health});assert.equal(result.success,false,JSON.stringify(health));assert.match(result.error,/Could not start/);assert.deepEqual(result.stopped,[43001]);assert.equal(result.record,null);}
});
test('matching health from an unowned, absent, or non-loopback listener is never ready',options,()=>{
 for(const config of [{listenerPid:90000},{noListener:true},{address:'10.0.0.2'}]){const result=launch(config);assert.equal(result.success,false);assert.deepEqual(result.stopped,[43001]);assert.equal(result.record,null);}
});
test('children exiting before or during the health response are never reported ready or terminated again',options,()=>{
 for(const config of [{exited:true},{exitAfterHealth:true}]){const result=launch(config);assert.equal(result.success,false);assert.deepEqual(result.stopped,[]);assert.equal(result.record,null);}
});
test('matching existing root/build is reused without starting or stopping a process',options,()=>{
 const result=launch({reuse:true});assert.equal(result.success,true,result.error);assert.equal(result.started,0);assert.deepEqual(result.stopped,[]);assert.equal(result.record,null);assert.equal(result.url,'http://127.0.0.1:4180/');
});
test('a package without release metadata still requires its own child and the correct root/version',options,()=>{
 const valid=launch({noExpectedBuild:true,health:{buildId:null}});assert.equal(valid.success,true,valid.error);
 const invalid=launch({noExpectedBuild:true,health:{basePath:'/wrong/'}});assert.equal(invalid.success,false);assert.deepEqual(invalid.stopped,[43001]);
});
