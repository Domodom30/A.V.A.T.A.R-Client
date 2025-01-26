Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■" -ForegroundColor DarkMagenta
Write-Host "█        A.V.A.T.A.R. Version Update Installer - STEP 2/2           █" -ForegroundColor DarkMagenta
Write-Host "█                           MacOS installer                         █" -ForegroundColor DarkMagenta
Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■" -ForegroundColor DarkMagenta
#■ A.V.A.T.A.R 29/10/2024

# We have time... 
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

Write-Host "⏳​ New version: " -NoNewline -ForegroundColor DarkMagenta 
Write-Host "$version" -ForegroundColor DarkRed

# Remove old files
Write-Host "⏳​ Removing old installation files" -NoNewline -ForegroundColor DarkMagenta
Remove-Item ./download/* -Recurse -Force -Exclude newVersion-$version.zip
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

# Unzip new version
Write-Host "⏳​ Extracting new version $version" -NoNewline -ForegroundColor DarkMagenta
Expand-Archive -Force download/newVersion-$version.zip download/output
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

# Test version type
Write-Host "⏳​ Update type: " -NoNewline -ForegroundColor DarkMagenta 
$installType = $null
$del = $null
If ((Test-Path "./download/output/A.V.A.T.A.R-Client.app") -eq $True) {
    Write-Host "New client executable version" -ForegroundColor DarkRed
    $installType = "exe"
    $del = $True
} Elseif ((Test-Path "./download/output/node_modules") -eq $True) {
    Write-Host "New packages in node_modules directory" -ForegroundColor DarkRed
    $installType = "modules"
    $del = $True
} Else {
    Write-Host "Files only" -ForegroundColor DarkRed
    $installType = "files"
}
Start-Sleep -Seconds 5

# Remove node_modules & Chrome if mandatory to exclude bad version files
if ($del -eq $True) {
    $ErrorActionPreference = 'SilentlyContinue'
    Write-Host "⏳​ Removing node_modules directory" -ForegroundColor DarkMagenta
    Remove-Item ../node_modules -Recurse -Force
    Remove-Item "../package-lock.json" -Force
    If ((Test-Path "../node_modules") -eq $True) {
        Write-Host "> Unable to remove node_modules directory, wait 3 seconds and retry..." -ForegroundColor DarkRed
        Start-Sleep -Seconds 3
        Remove-Item ../node_modules -Recurse -Force
    } 
    If ((Test-Path "../node_modules") -eq $True) {
        Write-Host "> Unable to remove the old version of node_modules directory, the installation can continue..." -ForegroundColor DarkRed
    } else {
        Write-Host "node_modules directory removed" -ForegroundColor Green
    }

    Write-Host "⏳​ Removing old Chrome version" -ForegroundColor DarkMagenta
    Remove-Item "$HOME/.cache/puppeteer" -Recurse -Force
    If ((Test-Path "$HOME/.cache/puppeteer") -eq $True) {
        Write-Host "> Unable to remove old Chrome version, wait 3 seconds and retry..." -ForegroundColor DarkRed
        Start-Sleep -Seconds 3
        Remove-Item "$HOME/.cache/puppeteer" -Recurse -Force
    } 
    If ((Test-Path "$HOME/.cache/puppeteer") -eq $True) {
        Write-Host "> Unable to remove the old version of Chrome." -ForegroundColor DarkRed
        Write-Host "> You can remove the old Chrome version manually in app/core/chrome/.cache/puppeteer/chrome and chrome-headless-shell folders" -ForegroundColor DarkRed
    } else {
        Write-Host "Old Chrome version removed" -ForegroundColor Green
    }
    Start-Sleep -Seconds 1
}

# Set installation path
If ($installType -eq "exe") {
    $installPath = "../../../../.."
} Else { 
    $installPath = ".."
}

$ErrorActionPreference = 'Stop'
# Copy new version to the A.V.A.T.A.R client directory
Write-Host "⏳​ Copying new version to the A.V.A.T.A.R client directory" -NoNewline -ForegroundColor DarkMagenta
$omissions = [string[]]@("LICENSE","version","LICENSES.chromium.html")
Copy-Item -Path "./download/output/*" -Exclude $omissions -Destination "$installPath" -Recurse -Force
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

If (($installType -eq "exe") -or ($installType -eq "module")) {
    Write-Host "⏳​ Installing npm packages in the A.V.A.T.A.R application, please wait..." -ForegroundColor DarkMagenta
    start-process -FilePath "npm" -ArgumentList "install" -NoNewWindow -workingdirectory ".." -Wait
    Write-Host "npm packages installation done" -ForegroundColor Green
    Start-Sleep -Seconds 1

    # Uninstalling Electron packager
    Write-Host "⏳ Uninstalling Electron packager, please wait..." -ForegroundColor DarkMagenta
    start-process -FilePath "npm" -ArgumentList "uninstall", "@electron/packager" -NoNewWindow -workingdirectory ".." -Wait 
    Write-Host "Electron packager uninstalled" -ForegroundColor Green
    Start-Sleep -Seconds 1
}

# Update Properties
Write-Host "⏳​ Updating Properties" -NoNewline -ForegroundColor DarkMagenta
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
Write-Host "⏳​ Updating package.json" -NoNewline -ForegroundColor DarkMagenta
$file = Get-Content "../package.json" -Encoding utf8 | ConvertFrom-Json
$file | ForEach-Object {if($_.version -notmatch $version){$_.version=$version}}
$file | ConvertTo-Json -EscapeHandling EscapeHtml -depth 32 | ForEach-Object { [System.Text.RegularExpressions.Regex]::Unescape($_) } | Out-File "../package.json" 
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1 

# Delete install files
# Remove new version temporary files
$ErrorActionPreference = 'Ignore'
try {
    Write-Host "⏳​ Removing new version temporary files" -NoNewline -ForegroundColor DarkMagenta
    Remove-Item ./download -Recurse -Force
    Start-Sleep -Seconds 1

    Remove-Item ./newVersion-$version -Recurse -Force
    Start-Sleep -Seconds 1

    Remove-Item ./newVersion.zip -Force
    Start-Sleep -Seconds 1

    Remove-Item ./shell.sh -Force
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
Write-Host "⏳​ Restarting A.V.A.T.A.R client" -NoNewline -ForegroundColor DarkMagenta
$app_location = "$(Get-Location)/../../../../.."
start-process -filepath "$app_location/A.V.A.T.A.R-Client.app" -workingdirectory "$app_location" -wait
Write-Host " done" -ForegroundColor Green
Start-Sleep -Seconds 1

Stop-Transcript

Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■" -ForegroundColor DarkMagenta
Write-Host "█                                                                              █" -ForegroundColor DarkMagenta
Write-Host "█                 Step 2 of the new $version version installation                 █" -ForegroundColor DarkMagenta
Write-Host "█                        has been successfully completed!                      █" -ForegroundColor DarkMagenta
Write-Host "█                                                                              █" -ForegroundColor DarkMagenta
Write-Host "█  You may wish to consult the installation 'update-$version-step2.log' file      █" -ForegroundColor DarkMagenta
Write-Host "█                             in the app/tmp directory                         █" -ForegroundColor DarkMagenta
Write-Host "█                                                                              █" -ForegroundColor DarkMagenta
Write-Host "■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■" -ForegroundColor DarkMagenta

