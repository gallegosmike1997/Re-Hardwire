param([Parameter(Mandatory = $true)][int]$RootPid)

$processes = Get-CimInstance -ClassName Win32_Process

function Stop-ProcessTree([int]$ProcessId) {
  $children = $script:processes | Where-Object {
    $_.ParentProcessId -eq $ProcessId -and $_.ProcessId -ne $PID
  }

  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId $child.ProcessId
  }

  if ($ProcessId -ne $PID) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
  }
}

Stop-ProcessTree -ProcessId $RootPid
