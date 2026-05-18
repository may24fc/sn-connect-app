$devFile = "C:\Users\Ceferino Jumao-as V\Programming\Internship\sn-hr-portal\n8n\workflows\marketing-monday-deliverables-reminder.json"
$prodFile = "C:\Users\Ceferino Jumao-as V\Programming\Internship\sn-hr-portal\n8n\workflows\marketing-monday-deliverables-reminder-prod.json"

$newParseJsCode = @"
const body = `$json.body;
const all = Array.isArray(body) ? body : (typeof body === 'string' ? JSON.parse(body) : []);
const ctx = `$(`'Set Week Context`').first().json;

const employees = all.filter(e => e.employment_type !== 'intern').sort((a, b) => a.last_name.localeCompare(b.last_name));
const interns = all.filter(e => e.employment_type === 'intern').sort((a, b) => a.last_name.localeCompare(b.last_name));
const combined = [...employees, ...interns];

return [{ json: { employees, interns, combined, employeeCount: combined.length, weekStart: ctx.weekStart, weekLabel: ctx.weekLabel } }];
"@

$newBuildJsCode = @"
const { employees, interns, weekLabel } = `$json;

const empLines = employees.map(e => `• \${e.first_name} \${e.last_name}`).join('\n');
const internLines = interns.map(e => `• \${e.first_name} \${e.last_name}`).join('\n');

let teamSection;
if (employees.length > 0 && interns.length > 0) {
  teamSection = \`<b>Employees:</b>\n\${empLines}\n\n<b>Interns:</b>\n\${internLines}\`;
} else if (employees.length > 0) {
  teamSection = empLines;
} else {
  teamSection = internLines;
}

const text = [
  '📢 <b>Weekly Deliverables Reminder</b>',
  \`📅 <b>Week:</b> \${weekLabel}\`,
  '',
  'Hi Marketing Team! 👋',
  '',
  'This is your weekly reminder to complete and submit your deliverables by <b>today EOD</b>.',
  '',
  '<b>Marketing Team:</b>',
  teamSection,
  '',
  'Please ensure the following are submitted:',
  '✅ Weekly Marketing Report',
  '✅ Campaign Progress Update',
  '✅ Marketing Metrics Summary',
  '',
  '🔗 <a href="https://app.sngroup.com.au">Open HR Portal</a>'
].join('\n');
return [{ json: { telegramText: text } }];
"@

foreach ($file in @($devFile, $prodFile)) {
    if (-not (Test-Path $file)) {
        Write-Host "SKIP: $file not found"
        continue
    }
    $json = Get-Content $file -Raw | ConvertFrom-Json
    $updated = $false
    foreach ($node in $json.nodes) {
        if ($node.id -eq 'fetch-marketing-employees') {
            $node.parameters.url = $node.parameters.url -replace 'select=id,first_name,last_name,department&', 'select=id,first_name,last_name,department,employment_type,users!inner(status)&'
            $node.parameters.url = $node.parameters.url -replace '&order=last_name\.asc', '&users.status=not.in.(terminated,inactive)&order=last_name.asc'
            Write-Host "Updated URL in $file`: $($node.parameters.url)"
            $updated = $true
        }
        if ($node.id -eq 'parse-employees') {
            $node.parameters.jsCode = $newParseJsCode
            $updated = $true
        }
        if ($node.id -eq 'build-reminder-message') {
            $node.parameters.jsCode = $newBuildJsCode
            $updated = $true
        }
    }
    if ($updated) {
        $json | ConvertTo-Json -Depth 32 | Set-Content $file
        Write-Host "Success: $file updated"
    }
}
