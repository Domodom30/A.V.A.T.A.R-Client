Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■"
Write-Host "█        A.V.A.T.A.R CLIENT VERSION UPDATE - STEP 2/2               █"
Write-Host "█                        Windows installer                          █"
Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■"
#■ A.V.A.T.A.R 29/10/2024

Start-Sleep -Seconds 3

$ErrorActionPreference = "Ignore"

# Keep new version by filename
$version = $MyInvocation.MyCommand.Name
$version = $version.Substring(0, ($version.Length -4))

if (Test-Path ./update-$version-step2.log -PathType Leaf) {
    Remove-Item ./update-$version-step2.log -Force
}

$ErrorActionPreference = "Stop"
Start-Transcript -path ./update-$version-step2.log -append

Remove-Item ./step-2.txt -Force

Write-Host "> New version: " -NoNewline  
Write-Host "$version" -ForegroundColor Magenta

# Remove old files
Write-Host "> Removing old files" -NoNewline 
Remove-Item ./download/* -Recurse -Force -Exclude newVersion-$version.zip
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

# Unzip new version
Write-Host "> Unziping new version $version" -NoNewline 
Expand-Archive -Force download/newVersion-$version.zip download/output
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

# Test version type
Write-Host "> Update type: " -NoNewline  
$installType = $null
$del = $null
If ((Test-Path "./download/output/A.V.A.T.A.R-Client.exe") -eq $True) {
    Write-Host "New client executable version" -ForegroundColor Magenta
    $installType = "exe"
    $del = $True
} Elseif ((Test-Path "./download/output/node_modules") -eq $True) {
    Write-Host "New packages in node_modules directory" -ForegroundColor Magenta
    $installType = "modules"
    $del = $True
} Else {
    Write-Host "Files only" -ForegroundColor Magenta
    $installType = "files"
}
Start-Sleep -Seconds 5

# Remove node_modules & Chrome if mandatory to exclude bad version files
if ($del -eq $True) {
    $ErrorActionPreference = 'SilentlyContinue'
    Write-Host "> Removing node_modules directory"
    Remove-Item ../node_modules -Recurse -Force
    If ((Test-Path "../node_modules") -eq $True) {
        Write-Host "> Unable to remove node_modules directory, wait 3 seconds and retry..." -ForegroundColor DarkRed
        Start-Sleep -Seconds 3
        Remove-Item ../node_modules -Recurse -Force
    } 
    If ((Test-Path "../node_modules") -eq $True) {
        Write-Host "> Unable to remove the old version of node_modules directory, the installation can continue..." -ForegroundColor DarkMagenta
    } else {
        Write-Host "node_modules directory removed" -ForegroundColor Green
    }

    Write-Host "> Removing old Chrome version"
    Remove-Item ../core/chrome/.cache -Recurse -Force
    If ((Test-Path "../core/chrome/.cache") -eq $True) {
        Write-Host "> Unable to remove old Chrome version, wait 3 seconds and retry..."
        Start-Sleep -Seconds 3
        Remove-Item ../core/chrome/.cache -Recurse -Force
    } 
    If ((Test-Path "../core/chrome/.cache") -eq $True) {
        Write-Host "> Unable to remove the old version of Chrome." -ForegroundColor DarkRed
        Write-Host "> You can remove the old Chrome version manually in app/core/chrome/.cache/puppeteer/chrome and chrome-headless-shell folders" -ForegroundColor DarkRed
    } else {
        Write-Host "Old Chrome version removed" -ForegroundColor Green
    }
    Start-Sleep -Seconds 1
}

# Set installation path
If ($installType -eq "exe") {
    $installPath = "../../.."
} Else { 
    $installPath = ".."
}

$ErrorActionPreference = 'Stop'
# Copy new version to the A.V.A.T.A.R client directory
Write-Host "> Copying new version to the A.V.A.T.A.R client directory, please wait..." -NoNewline 
Copy-Item -Path "./download/output/*" -Destination "$installPath" -Recurse -Force
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

If (($installType -eq "exe") -or ($installType -eq "module")) {
    Write-Host "> Installing Electron package in A.V.A.T.A.R application, please wait..."
    start-process -FilePath "npm" -ArgumentList "install", "--save-dev electron@$electron_version" -NoNewWindow -workingdirectory ".." -Wait
    Write-Host "Electron package installation done" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Update Properties
Write-Host "> Updating Properties" -NoNewline 
$file = Get-Content "../core/Avatar.prop" -Encoding utf8 | ConvertFrom-Json
$file | ForEach-Object {if($_.version -notmatch $version){$_.version=$version}}
$file | ConvertTo-Json -EscapeHandling EscapeHtml -depth 32 | ForEach-Object { [System.Text.RegularExpressions.Regex]::Unescape($_) } | Out-File "../core/Avatar.prop"
Start-Sleep -Seconds 1

$file = Get-Content "../assets/config/default/Avatar.prop" -Encoding utf8 | ConvertFrom-Json
$file | ForEach-Object {if($_.version -notmatch $version){$_.version=$version}}
$file | ConvertTo-Json -EscapeHandling EscapeHtml -depth 32 | ForEach-Object { [System.Text.RegularExpressions.Regex]::Unescape($_) } | Out-File "../assets/config/default/Avatar.prop"
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

# Update package.json
Write-Host "> Updating package.json" -NoNewline 
$file = Get-Content "../package.json" -Encoding utf8 | ConvertFrom-Json
$file | ForEach-Object {if($_.version -notmatch $version){$_.version=$version}}
$file | ConvertTo-Json -EscapeHandling EscapeHtml -depth 32 | ForEach-Object { [System.Text.RegularExpressions.Regex]::Unescape($_) } | Out-File "../package.json" 
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1 

# Delete install files
# Remove new version temporary files
$ErrorActionPreference = 'Ignore'
try {
    Write-Host "> Removing new version temporary files" -NoNewline 
    Remove-Item ./download -Recurse -Force
    Start-Sleep -Seconds 1

    Remove-Item ./newVersion-$version -Recurse -Force
    Start-Sleep -Seconds 1

    Remove-Item ./newVersion.zip -Force
    Start-Sleep -Seconds 1

    Remove-Item ./shell.bat -Force
    Remove-Item ./$version.ps1 -Force
    Write-Host " done" -ForegroundColor Green
    Start-Sleep -Seconds 1
}
catch {
    Write-Host ": " -NoNewline
    Write-Error $_.Exception.InnerException.Message -ErrorAction Continue
    Start-Sleep -Seconds 1
}

# Fifo file to restart the application
$end_install = "end installation"
Out-File -FilePath ./step-3.txt -InputObject $version-$end_install -Encoding utf8 -NoNewline

# Restart the A.V.A.T.A.R client
$ErrorActionPreference = 'Stop'
Write-Host "> Restarting A.V.A.T.A.R client" -NoNewline 
$app_location = "$(Get-Location)/../../.."
start-process -filepath "$app_location/A.V.A.T.A.R-Client.exe" -workingdirectory "$app_location"
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■"
Write-Host "█                                                                              █"
Write-Host "█                 Step 2 of the new $version version installation                 █"
Write-Host "█                        has been successfully completed!                      █"
Write-Host "█                  As the server was started with this terminal,               █"
Write-Host "█                   if you close it, you also close the server!                █"
Write-Host "█                                                                              █"
Write-Host "█  You may wish to consult the installation 'update-$version-step2.log' file      █"
Write-Host "█                             in the app/tmp directory                         █"
Write-Host "█                                                                              █"
Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■"

Stop-Transcript
