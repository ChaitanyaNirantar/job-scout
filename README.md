# Brief

Brief is a personal job watch. You write down the roles you want. Once a day it reads the newest postings on public job boards and notifies you when something fits.

It is a daily net for fresh listings, not a search of every job on the internet. The boards it reads are [Himalayas](https://himalayas.app), [Remote OK](https://remoteok.com), [Jobicy](https://jobicy.com), [Arbeitnow](https://www.arbeitnow.com), and [Remotive](https://remotive.com). Each role opens the original posting.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Your watches, matches, and notification history stay in `data/brief.json` on this machine. Nothing is sent anywhere unless you add a webhook.

## Notifications

- **On the desk.** New matches show up in the list, and the bell keeps a short history.
- **Desktop.** Turn on desktop alerts in Delivery. The browser asks for permission, then shows a notification when a new match arrives while the tab is open.
- **Slack, Discord, or phone.** Paste an incoming webhook, or an [ntfy](https://ntfy.sh) topic such as `https://ntfy.sh/your-private-topic`. Use a topic that isn’t easy to guess. Send a test from Delivery before relying on it.

The daily pass runs while Brief is open. Choose the hour in Delivery. If the app was asleep at that hour, it catches up the next time it starts. You can also press **Check the boards** anytime. Board data is reused for about six hours so the sources aren’t polled more than they allow.

## Tests

```bash
npm test
```
