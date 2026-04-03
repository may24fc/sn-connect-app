# Wise Production Setup Instructions
## For Non-Technical Business Users

Hi! This guide will help you collect the information needed to connect our HR Portal to the real Wise account for payroll processing.

**Time needed:** ~10 minutes  
**What this does:** Allows our app to send employee salary payments through Wise automatically.

---

## Step 1: Log Into Your Wise Business Account

1. Open your web browser
2. Go to: **https://transferwise.com** (or **https://wise.com**)
3. Click **Sign In** (top right)
4. Enter your Wise Business account email and password
5. Complete any 2-factor authentication (phone/app code) if prompted

✅ **You should now be in the Wise Dashboard.**

---

## Step 2: Generate the API Token (WISE_API_KEY)

This is a special security code that allows our app to talk to Wise.

### Instructions:

1. Click your **profile icon** (top right corner)
2. Select **Settings**
3. Look for a menu on the left side and find **API tokens** (or **API** section)
4. Click **Create a new token** (or **+ Add API Key**)
5. In the popup:
   - **Token name:** Enter `SN Connect Payroll`
   - **Environment:** Choose **Production** (NOT Sandbox)
   - **Permissions:** Make sure these are checked:
     - ☑️ Manage transfers
     - ☑️ Manage recipients/beneficiaries
6. Click **Create token**

### ⚠️ IMPORTANT:
A long security code will appear. **Copy it immediately** and save it somewhere safe (notepad, password manager).
- **Label it:** `WISE_API_KEY`
- ⚠️ Wise will NOT show this code again — if you lose it, you'll need to create a new one

---

## Step 3: Find Your Business Profile ID (WISE_PROFILE_ID)

This identifies which business profile the payments come from.

### Easy Method (No Command Line Needed):

1. Still in Wise Settings, look for a section called **Profile** or **Business Profile**
2. You should see a number that looks like: `123456789` or `12345678`
3. Look for text like:
   - "Profile ID: 123456789"
   - "Business ID: 123456789"
   - Or in the URL: `/profile/123456789`

**Copy this number and label it:** `WISE_PROFILE_ID`

### If You Can't Find It (Advanced):
If your admin can run a command, ask them to open Terminal/Command Prompt and run:
```
curl -H "Authorization: Bearer PASTE_YOUR_API_KEY_HERE" https://api.transferwise.com/v1/profiles
```
Look in the response for `"id": 12345678` where `"type": "business"` — that number is your Profile ID.

---

## Step 4: Get the Webhook Public Key (WISE_WEBHOOK_PUBLIC_KEY)

This is a security code that verifies messages from Wise are genuine.

### Simple Copy-Paste Method:

1. Ask your IT person or developer to run this **one time** to get the key:
```
curl https://api.transferwise.com/v1/webhook/public-keys
```

2. The response will show a long text block that starts with:
```
-----BEGIN PUBLIC KEY-----
```
and ends with:
```
-----END PUBLIC KEY-----
```

**Copy the ENTIRE block** (including the BEGIN and END lines) and label it: `WISE_WEBHOOK_PUBLIC_KEY`

---

## Step 5: Environment Setting (WISE_ENVIRONMENT)

This is simple — it just needs to be set to:
```
WISE_ENVIRONMENT = production
```

---

## Summary: What You've Collected

You should now have **4 values**:

```
WISE_API_KEY = [long security code you copied in Step 2]

WISE_PROFILE_ID = [8-10 digit number from Step 3]

WISE_WEBHOOK_PUBLIC_KEY = [text block starting with -----BEGIN PUBLIC KEY-----]

WISE_ENVIRONMENT = production
```

---

## What to Do Now

Give these 4 values to your developer/IT person. They will:
1. Add these to your hosting platform (Vercel/AWS/etc.) as "secrets" or "environment variables"
2. Restart the application
3. The app will now use your real Wise account for payroll

---

## Troubleshooting

**Q: I can't find the API tokens section**  
A: Make sure you're in **Settings** and look for "Developer" or "API" section. If still missing, contact Wise support — your account type might not have API access enabled.

**Q: The API key disappeared when I navigated away**  
A: That's normal. If you need it again, create a new token (same process). Each token works the same way.

**Q: Do I need to do this again later?**  
A: No. Once you give these 4 values to your developer, they stay the same. You only need to do this once.

**Q: Is this safe?**  
A: Yes. These are locked in a secure vault on your hosting platform. Only your app can see them, and they're encrypted.

---

## Questions?

If anything is unclear, ask your developer or contact Wise customer support at: **support.wise.com**

Thank you! 🎉
