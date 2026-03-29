# Wise Webhook Setup for Local Testing

## Prerequisites
- ngrok running: `ngrok http 3001` (get your public HTTPS URL)
- Wise sandbox account access at https://wise.com/your-account/integrations-and-tools

## Steps

### 1. Start ngrok
```powershell
ngrok http 3001
```
Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)

### 2. Log into Wise Developer Tools
1. Go to https://wise.com/your-account/integrations-and-tools
2. Select "Sandbox" environment (toggle at top-right if needed)
3. Find "Webhooks" or "Event Subscriptions" section

### 3. Create Profile-Level Webhook Subscription
- **Notification URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/wise`
- **Events**: Select `transfers#state-change` (transfer status updates)
- **Save/Create**

### 4. Test with Local Transfers
Once registered and ngrok is running:

#### Simulate transfer state changes in sandbox:
```powershell
$token = ((Get-Content '.env.local' | Select-String '^WISE_API_KEY=').ToString().Split('=',2)[1]).Trim('"').Trim("'")

# Advance transfer ID 56122359 through states
Invoke-RestMethod -Uri "https://api.sandbox.transferwise.tech/v1/simulation/transfers/56122359/processing" -Headers @{ Authorization = "Bearer $token" }

# Wait to observe webhook delivery to local app

Invoke-RestMethod -Uri "https://api.sandbox.transferwise.tech/v1/simulation/transfers/56122359/funds_converted" -Headers @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Uri "https://api.sandbox.transferwise.tech/v1/simulation/transfers/56122359/outgoing_payment_sent" -Headers @{ Authorization = "Bearer $token" }
```

#### Monitor webhook arrival:
- Check your Next.js terminal for incoming POST requests to `/api/webhooks/wise`
- Query Supabase to verify `wise_payments` row updated with new status

## Verified Test Values
- **Profile ID**: 29933593
- **Sandbox Recipient**: 702226237 (PHP BDO Bank)
- **Sandbox Transfer**: 56122359
- **Approved Invoice**: 8ba9400c-d3c2-4b90-a0a5-85eaf60e3190
- **Sandbox Webhook Key**: ✓ Already in .env.local

## Known Limitations
- Sandbox personal token cannot fund transfers (`403` on POST /payments) — already handled in server action
- Profile-level webhooks do not support the test-notifications API — use simulation instead
