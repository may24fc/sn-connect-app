import { execSync } from 'node:child_process';

function run(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (error) {
    const stdout = error.stdout?.toString().trim();
    const stderr = error.stderr?.toString().trim();
    return stdout || stderr || '';
  }
}

if (process.platform === 'win32') {
  const output = run(
    `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(node|inngest)\\.exe$' -and $_.CommandLine -match 'inngest-cli.*dev -u http://localhost:3001/api/inngest|inngest dev -u http://localhost:3001/api/inngest' } | Select-Object ProcessId, Name, CommandLine | Format-List"`
  );

  if (!output) {
    console.log('No Inngest dev process is running.');
    process.exit(0);
  }

  console.log(output);
  process.exit(0);
}

const output = run("pgrep -af 'inngest.*dev -u http://localhost:3001/api/inngest'");

if (!output) {
  console.log('No Inngest dev process is running.');
  process.exit(0);
}

console.log(output);