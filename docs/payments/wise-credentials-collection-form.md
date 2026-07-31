# Wise Production Credentials Collection Form
## Use this to gather and verify all required information

---

### Instructions for Your Boss:
Follow the guide in `wise-production-setup-for-non-tech.md`, then fill in the values below.

---

## Collected Values

### 1. WISE_API_KEY
**What is this?** The security code generated in Wise Settings → API tokens  
**Generated in Step 2**

```
[PASTE THE API KEY HERE]
```

**Verification:** It should be a long alphanumeric string (example: `t_live_abc123def456ghi789...`)

---

### 2. WISE_PROFILE_ID
**What is this?** Your business profile number from Wise account  
**Found in Step 3**

```
[PASTE THE PROFILE ID HERE]
```

**Verification:** It should be 8-10 digits (example: `12345678`)

---

### 3. WISE_WEBHOOK_PUBLIC_KEY
**What is this?** Security certificate that verifies messages from Wise  
**Collected in Step 4**

```
[PASTE THE FULL PUBLIC KEY HERE - INCLUDING THE -----BEGIN----- AND -----END----- LINES]
```

**Verification:** It should start with `-----BEGIN PUBLIC KEY-----` and end with `-----END PUBLIC KEY-----`

---

### 4. WISE_ENVIRONMENT
**What is this?** Setting that tells the app to use the real Wise (not testing environment)  
**Always the same**

```
production
```

**Verification:** This should always be exactly: `production`

---

## Checklist Before Handing Over

- ☑️ All 4 values filled in above
- ☑️ WISE_API_KEY is NOT blank
- ☑️ WISE_PROFILE_ID is a number (not text)
- ☑️ WISE_WEBHOOK_PUBLIC_KEY starts and ends with the correct markers
- ☑️ WISE_ENVIRONMENT is exactly `production`
- ☑️ No extra spaces or line breaks in any value
- ☑️ Me (non-tech person) have reviewed and confirmed all values are correct

**Completed by:** _________________ (Name)  
**Date:** _________________ 

---

## Next Step

Once filled in, send this form to your developer along with a note:
> "Please add these 4 environment variables to the production environment on Vercel and redeploy the app."

---

## Support

If you get stuck on any step, refer to:
1. The detailed guide: `wise-production-setup-for-non-tech.md`
2. Wise Help: https://support.wise.com
3. Your developer
