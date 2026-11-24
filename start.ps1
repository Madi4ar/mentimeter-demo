# Запуск викторины одной кнопкой: сервер + публичная ссылка + случайный PIN.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Fail($msg) {
  Write-Host ''
  Write-Host $msg -ForegroundColor Red
  Write-Host ''
  Read-Host 'Нажмите Enter, чтобы закрыть'
  exit 1
}

# 1. Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Fail 'Не найден Node.js. Установите его с https://nodejs.org (кнопка LTS), перезагрузите компьютер и запустите снова.' }

# 2. Случайный PIN и свободный порт
$pin = Get-Random -Minimum 1000 -Maximum 10000
$l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
$l.Start(); $port = $l.LocalEndpoint.Port; $l.Stop()

# 3. cloudflared: скачиваем один раз
$cf = Join-Path $dir 'cloudflared.exe'
if (-not (Test-Path $cf)) {
  $old = Join-Path $dir 'cloudflared-windows-amd64.exe'
  if (Test-Path $old) { Copy-Item $old $cf }
  else {
    Write-Host 'Скачиваю cloudflared (один раз, около 40 МБ)...'
    try {
      $ProgressPreference = 'SilentlyContinue'
      Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $cf
    } catch {
      if (Test-Path $cf) { Remove-Item $cf -Force }
      Fail 'Не удалось скачать cloudflared. Проверьте интернет или скачайте cloudflared-windows-amd64.exe вручную со страницы https://github.com/cloudflare/cloudflared/releases/latest и положите в эту папку.'
    }
  }
}

$server = $null; $tunnel = $null
try {
  # 4. Сервер
  $env:HOST_PIN = "$pin"
  $env:PORT = "$port"
  $server = Start-Process -FilePath $node.Source -ArgumentList 'server.js' -WorkingDirectory $dir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $dir 'server.log') -RedirectStandardError (Join-Path $dir 'server.err.log')
  Start-Sleep -Seconds 1
  if ($server.HasExited) { Fail 'Сервер не запустился. Подробности в файле server.err.log рядом с этим скриптом.' }

  # 5. Туннель
  $log = Join-Path $dir 'tunnel.log'
  if (Test-Path $log) { Remove-Item $log -Force }
  $tunnel = Start-Process -FilePath $cf -ArgumentList 'tunnel', '--url', "http://localhost:$port" -WindowStyle Hidden -PassThru -RedirectStandardError $log -RedirectStandardOutput (Join-Path $dir 'tunnel.out.log')
  Write-Host 'Создаю публичную ссылку...'
  $url = $null
  for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    Start-Sleep -Seconds 1
    if ($tunnel.HasExited) { break }
    if (Test-Path $log) {
      $t = Get-Content $log -Raw -ErrorAction SilentlyContinue
      if ($t -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0] }
    }
  }
  if (-not $url) { Fail 'Не удалось создать публичную ссылку. Проверьте интернет и попробуйте ещё раз (подробности в tunnel.log).' }

  # 6. Ждём, пока ссылка начнёт открываться (обычно 5-30 секунд)
  Write-Host 'Жду, пока ссылка заработает...'
  $ok = $false
  for ($i = 0; $i -lt 60 -and -not $ok; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -Uri "$url/api/info" -TimeoutSec 5
      if ($r.StatusCode -eq 200) { $ok = $true }
    } catch { Start-Sleep -Seconds 2 }
  }

  Write-Host ''
  Write-Host '=========================================================' -ForegroundColor Green
  Write-Host '  ВИКТОРИНА ЗАПУЩЕНА' -ForegroundColor Green
  Write-Host "  Ссылка для участников:  $url"
  Write-Host "  Экран ведущего:         $url/host"
  Write-Host "  PIN ведущего:           $pin" -ForegroundColor Yellow
  Write-Host '=========================================================' -ForegroundColor Green
  if (-not $ok) { Write-Host 'Ссылка пока не отвечает. Подождите минуту и обновите страницу в браузере.' -ForegroundColor Yellow }
  Write-Host ''
  Write-Host 'Экран ведущего открывается сам. QR-код на нём ведёт на публичную ссылку.'
  Write-Host 'НЕ ЗАКРЫВАЙТЕ это окно во время игры. Чтобы остановить, нажмите Enter.'
  Set-Content -Path (Join-Path $dir 'ПОСЛЕДНЯЯ_ССЫЛКА.txt') -Value "Участники: $url`r`nВедущий: $url/host`r`nPIN: $pin" -Encoding UTF8
  Start-Process "$url/host#pin=$pin"
  [void](Read-Host)
}
finally {
  if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue }
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
