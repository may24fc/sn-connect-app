$f1 = "C:\Users\Ceferino Jumao-as V\Programming\Internship\sn-hr-portal\n8n\workflows\marketing-monday-deliverables-reminder.json"
$f2 = "C:\Users\Ceferino Jumao-as V\Programming\Internship\sn-hr-portal\n8n\workflows\marketing-monday-deliverables-reminder-prod.json"
$pc = "const body = $json.body;`nconst all = Array.isArray(body) ? body : (typeof body === 'string' ? JSON.parse(body) : []);`nconst ctx = $('Set Week Context').first().json;`n`nconst employees = all.filter(e => e.employment_type !== 'intern').sort((a, b) => a.last_name.localeCompare(b.last_name));`nconst interns = all.filter(e => e.employment_type === 'intern').sort((a, b) => a.last_name.localeCompare(b.last_name));`nconst combined = [...employees, ...interns];`n`nreturn [{ json: { employees, interns, combined, employeeCount: combined.length, weekStart: ctx.weekStart, weekLabel: ctx.weekLabel } }];"
$bc = "const { employees, interns, weekLabel } = $json;`n`nconst empLines = employees.map(e => `• ${e.first_name} ${e.last_name}`).join('\n');`nconst internLines = interns.map(e => `• ${e.first_name} ${e.last_name}`).join('\n');`n`nlet teamSection;`nif (employees.length > 0 && interns.length > 0) {`n  teamSection = `<b>Employees:</b>\n${empLines}\n\n<b>Interns:</b>\n${internLines}`;`n} else if (employees.length > 0) {`n  teamSection = empLines;`n} else {`n  teamSection = internLines;`n}`n`nconst text = [`n  '?? <b>Weekly Deliverables Reminder</b>',`n  `?? <b>Week:</b> ${weekLabel}`,`n  '',`n  'Hi Marketing Team! ??',`n  '',`n  'This is your weekly reminder to complete and submit your deliverables by <b>today EOD</b>.',`n  '',`n  '<b>Marketing Team:</b>',`n  teamSection,`n  '',`n  'Please ensure the following are submitted:',`n  '? Weekly Marketing Report',`n  '? Campaign Progress Update',`n  '? Marketing Metrics Summary',`n  '',`n  '?? <a href=\"https://app.sngroup.com.au\">Open HR Portal</a>'`n].join('\n');`nreturn [{ json: { telegramText: text } }];"
foreach ($f in @($f1, $f2)) {
  if (Test-Path $f) {
    $j = Get-Content $f -Raw | ConvertFrom-Json
    foreach ($n in $j.nodes) {
      if ($n.id -eq 'fetch-marketing-employees') {
        $n.parameters.url = $n.parameters.url -replace 'select=id,first_name,last_name,department&', 'select=id,first_name,last_name,department,employment_type,users!inner(status)&'
        $n.parameters.url = $n.parameters.url -replace '&order=last_name\.asc', '&users.status=not.in.(terminated,inactive)&order=last_name.asc'
        "URL: $($n.parameters.url)"
      }
      if ($n.id -eq 'parse-employees') { $n.parameters.jsCode = $pc }
      if ($n.id -eq 'build-reminder-message') { $n.parameters.jsCode = $bc }
    }
    $j | ConvertTo-Json -Depth 32 | Set-Content $f
    "UPDATED: $f"
  }
}
