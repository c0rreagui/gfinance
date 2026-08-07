$p = Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9223", "--headless=new", "--disable-gpu", "--user-data-dir=""C:\Users\guico\AppData\Local\Temp\chrome-profile-9223""" -PassThru
Start-Sleep -Seconds 5

# Query the websocket URL
$versionInfo = Invoke-RestMethod -Uri "http://127.0.0.1:9223/json/version"
$wsUrl = $versionInfo.webSocketDebuggerUrl
# Parse the path from wsUrl: ws://127.0.0.1:9223/devtools/browser/... -> /devtools/browser/...
$wsPath = $wsUrl.SubString($wsUrl.IndexOf("/devtools/browser/"))

# Write to default DevToolsActivePort
$devToolsPath = "C:\Users\guico\AppData\Local\Google\Chrome\User Data\DevToolsActivePort"
$content = "9223`r`n$wsPath"
Set-Content -Path $devToolsPath -Value $content -Force

Write-Host "SUCCESS: Chrome started on port 9223 with profile C:\Users\guico\AppData\Local\Temp\chrome-profile-9223"
Write-Host "DevToolsActivePort updated at $devToolsPath with path $wsPath"

# Keep the task alive for 15 minutes (900 seconds) so the browser subagent can execute
for ($i = 0; $i -lt 180; $i++) {
    if ($p.HasExited) {
        Write-Host "Chrome exited unexpectedly with code $($p.ExitCode)!"
        break
    }
    Start-Sleep -Seconds 5
}

# Cleanup on exit
if (!$p.HasExited) {
    Stop-Process -Id $p.Id -Force
}
