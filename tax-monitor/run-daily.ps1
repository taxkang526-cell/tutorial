# 조세법령정보시스템 일일 모니터링 - Windows 작업 스케줄러에서 매일 실행
# 수동 실행: powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\tax52\TUTORIAL\tax-monitor\run-daily.ps1
$ErrorActionPreference = 'Continue'
$repo = 'C:\Users\tax52\TUTORIAL'
Set-Location $repo

$logDir = Join-Path $repo 'tax-monitor\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ((Get-Date -Format 'yyyy-MM-dd_HHmm') + '.log')
function Write-Log($msg) { "[$(Get-Date -Format s)] $msg" | Out-File $log -Append -Encoding utf8 }

# 스케줄러 환경에서는 PATH가 다를 수 있으므로 claude.exe 경로를 직접 지정
$claude = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
if (-not (Test-Path $claude)) { $claude = (Get-Command claude -ErrorAction SilentlyContinue).Source }
Write-Log "start (claude: $claude) user=$(whoami) profile=$env:USERPROFILE test=$(Test-Path 'C:\Users\tax52\.local\bin\claude.exe')"

# 권한은 .claude/settings.json 의 allow 목록 + 아래 allowedTools 를 따른다. Agent 도구는 서브에이전트 호출용.
$claudeArgs = @(
    '-p', '/tax-update',
    '--allowedTools', 'Agent', 'Read', 'Write',
    'Bash(node tax-monitor/scripts/fetch.mjs:*)',
    'Bash(node tax-monitor/scripts/state.mjs:*)',
    'Bash(node tax-monitor/scripts/merge-summaries.mjs:*)',
    'mcp__claude_ai_Notion__notion-create-pages',
    'mcp__claude_ai_Notion__notion-fetch'
)

# Windows PowerShell 5.1의 Start-Process는 인자를 그대로 이어 붙이므로 각 인자를 따옴표로 감싼다
$argLine = ($claudeArgs | ForEach-Object { '"' + $_ + '"' }) -join ' '

# 표준입력은 빈 파일(대화형 대기 방지), 표준출력/오류는 파일로 받는다
$in = "$log.in"; $out = "$log.out"; $err = "$log.err"
New-Item -ItemType File -Force $in | Out-Null
$p = Start-Process -FilePath $claude -ArgumentList $argLine -WorkingDirectory $repo `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardInput $in -RedirectStandardOutput $out -RedirectStandardError $err
Get-Content $out -Encoding utf8 -ErrorAction SilentlyContinue | Out-File $log -Append -Encoding utf8
Get-Content $err -Encoding utf8 -ErrorAction SilentlyContinue | Out-File $log -Append -Encoding utf8
Remove-Item $in, $out, $err -ErrorAction SilentlyContinue
Write-Log "exit $($p.ExitCode)"

