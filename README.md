# Brief

Brief is a personal job watch. You write down the roles you want. Once a day it reads the newest postings and notifies you when something fits.

It is a daily net for fresh listings, not a search of every job on the internet. It reads [LinkedIn](https://www.linkedin.com/jobs) for your titles, the daily new-grad and H-1B lists [Jobright](https://jobright.ai) publishes, plus [Himalayas](https://himalayas.app), [Remote OK](https://remoteok.com), [Jobicy](https://jobicy.com), [Arbeitnow](https://www.arbeitnow.com), and [Remotive](https://remotive.com). Each role opens the original posting.

A watch can require visa sponsorship, new-grad roles, or both. Sponsorship keeps postings that say they sponsor, LinkedIn results from a visa-sponsorship search, and Jobright’s H-1B list. New grad keeps entry-level and new-graduate titles, including Jobright’s new-grad lists and LinkedIn’s entry-level filter. Senior, staff, and director titles are left out of a new-grad watch. A place of United States also matches US cities and states. Leave the place blank to include remote roles with no city.

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
