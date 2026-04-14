import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

try {
  if (process.platform === 'win32') {
    const output = run(
      `powershell -NoProfile -Command "$targets = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(node|inngest)\\.exe$' -and $_.CommandLine -match 'inngest-cli.*dev -u http://localhost:3001/api/inngest|inngest dev -u http://localhost:3001/api/inngest' }; if (-not $targets) { Write-Output 'No Inngest dev process is running.'; exit 0 }; $targets | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Write-Output ('Stopped ' + $targets.Count + ' Inngest dev process(es).')"`
    );
    console.log(output);
    process.exit(0);
  }

  run("pkill -f 'inngest.*dev -u http://localhost:3001/api/inngest'");
  console.log('Stopped Inngest dev process(es).');
} catch (error) {
  const stderr = error.stderr?.toString().trim();
  if (stderr && !stderr.includes('no process found')) {
    console.error(stderr);
    process.exit(1);
  }

  console.log('No Inngest dev process is running.');
}