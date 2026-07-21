# Settings and Notification Preferences

This guide covers shared settings routes for admin and super admin users.

## Route Map

- `/admin/settings` — Shared settings page
- `/super-admin/settings` — Role-prefixed route reusing the same settings page

## Settings Page

Current settings focus on notification preferences and channel linking:

- Telegram notification toggle
- Gmail notification toggle
- Save/reset preference flows
- Telegram link bootstrap flow with one-time start command

## Telegram Linking Flow

1. Open settings and click connect/relink Telegram
2. Open Telegram Web from the generated link
3. Send the one-time `/start ...` command to the bot
4. Return to the portal and confirm preference state

## Security and UX Notes

- Preferences are scoped per user
- Failed saves surface inline toast feedback
- External links are opened with safe target attributes

## Related Docs

- [Getting Started](getting-started.md)
- [Super Admin Features](super-admin.md)
- [API: Notifications](../api/notifications.md)
