param([Parameter(Mandatory=$true)][string]$Source,[Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
$releaseSource=(Resolve-Path -LiteralPath $Source).Path
$releaseDestination=[IO.Path]::GetFullPath($Destination)
if(-not (Test-Path -LiteralPath $releaseSource -PathType Container)){throw 'Missing package source'}
if(Test-Path -LiteralPath $releaseDestination){throw 'Temporary archive destination already exists'}
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$releaseStream=[IO.File]::Open($releaseDestination,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
$releaseArchive=[IO.Compression.ZipArchive]::new($releaseStream,[IO.Compression.ZipArchiveMode]::Create,$false)
try{
 foreach($releaseFile in [IO.Directory]::EnumerateFiles($releaseSource,'*',[IO.SearchOption]::AllDirectories)){
  $releaseName=$releaseFile.Substring($releaseSource.Length).TrimStart([char[]]@('\','/')).Replace('\','/')
  if($releaseName.StartsWith('../') -or $releaseName.Contains('\')){throw 'Invalid archive entry path'}
  $releaseEntry=$releaseArchive.CreateEntry($releaseName,[IO.Compression.CompressionLevel]::Optimal)
  $releaseInput=[IO.File]::OpenRead($releaseFile)
  $releaseOutput=$releaseEntry.Open()
  try{$releaseInput.CopyTo($releaseOutput)}finally{$releaseOutput.Dispose();$releaseInput.Dispose()}
 }
}finally{$releaseArchive.Dispose();$releaseStream.Dispose()}
