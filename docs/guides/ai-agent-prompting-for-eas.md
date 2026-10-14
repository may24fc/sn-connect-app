# Prompting Your AI Agent: A Beginner's Guide for Executive & Personal Assistants

> **Who this is for:** An EA or PA who has never worked with an AI agent before and is about to onboard one to help with their day-to-day work.
> **What you need:** No technical skills. If you can brief a new assistant, you can brief an AI agent.

---

## Table of Contents

1. [The Big Idea: Treat It Like a New Hire](#1-the-big-idea-treat-it-like-a-new-hire)
2. [The Anatomy of a Good Prompt](#2-the-anatomy-of-a-good-prompt)
3. [Step 1: Connect Your Apps](#3-step-1-connect-your-apps)
4. [Step 2: Teach It Who You Work For](#4-step-2-teach-it-who-you-work-for)
5. [Step 3: Calendar & Scheduling](#5-step-3-calendar--scheduling)
6. [Step 4: Email & Messages](#6-step-4-email--messages)
7. [Step 5: Teaching Repetitive Tasks](#7-step-5-teaching-repetitive-tasks)
8. [Step 6: Putting Tasks on a Schedule](#8-step-6-putting-tasks-on-a-schedule)
9. [Step 7: Reminders, Follow-ups & Task Tracking](#9-step-7-reminders-follow-ups--task-tracking)
10. [Step 8: Research, Documents & Travel](#10-step-8-research-documents--travel)
11. [Setting Boundaries and Approvals](#11-setting-boundaries-and-approvals)
12. [When It Gets Something Wrong](#12-when-it-gets-something-wrong)
13. [Common Beginner Mistakes](#13-common-beginner-mistakes)
14. [Your First Week: A Day-by-Day Plan](#14-your-first-week-a-day-by-day-plan)
15. [Copy-and-Paste Prompt Library](#15-copy-and-paste-prompt-library)

---

## 1. The Big Idea: Treat It Like a New Hire

The single most useful mindset: **your AI agent is a very fast, very willing new assistant on their first day.**

| A new human assistant... | Your AI agent... |
| --- | --- |
| Doesn't know your boss's preferences | Doesn't either, until you tell it |
| Needs access to the calendar, inbox, and shared drive | Needs the same, and you grant it by connecting apps |
| Does better work when shown *how* you do something once | Same |
| Should ask before sending anything important | Should too, and you decide where that line is |
| Gets better the more feedback you give | Same |

Three things to remember:

1. **You don't need special words.** Write the way you'd message a colleague. Plain, polite, specific.
2. **It is not a mind reader.** If a detail matters (timezone, tone, who is allowed to see what), say it.
3. **You are still the EA.** The agent does the legwork. You make the judgment calls, review what matters, and stay accountable.

---

## 2. The Anatomy of a Good Prompt

A "prompt" is just the message you send. Good ones usually have up to five parts. You don't need all five every time, but the more important the task, the more of them you should include.

| Part | Question it answers | Example |
| --- | --- | --- |
| **Goal** | What do I want done? | "Schedule a 30-minute call with Maria." |
| **Context** | What should it know? | "Maria is a new client. Steven prefers mornings." |
| **Constraints** | What are the rules or limits? | "Not on Fridays. Don't book over focus blocks." |
| **Output** | What should I get back? | "Give me three options as a short list." |
| **Check-in** | When should it stop and ask me? | "Don't send any invite until I approve." |

### Weak vs. strong

❌ **Weak:**
> Set up a meeting with Maria.

✅ **Strong:**
> Find a 30-minute slot for a call between Steven and Maria Lopez next week. Steven prefers mornings (9-12), and Fridays are off limits. Don't touch his "Focus Time" blocks. Give me three options and wait for my OK before sending the invite.

The strong version takes 20 extra seconds to write and saves several rounds of back-and-forth.

### Two habits that help immediately

- **One job per message** at first. Once you trust it, you can chain tasks together.
- **Say what "done" looks like.** "Done means the invite is sent and the agenda is attached."

---

## 3. Step 1: Connect Your Apps

Before the agent can *do* anything useful, it needs access to the tools you work in: calendar, email, chat, documents, task tracker, and so on.

**The good news:** you don't need to dig through settings. You can usually just tell the agent to connect.

### How to ask

> Connect to my Google Calendar.

> Connect to my work email.

> I use Notion for task tracking and Telegram for team chat. Please connect to both.

### What will happen

1. The agent replies and starts the connection.
2. You'll usually see a **sign-in or permission screen** from the app itself (Google, Microsoft, Notion, etc.). This is you personally granting access.
3. Review what it's asking for, then approve.
4. The agent confirms it's connected.

> 💡 **Tip:** If a pop-up doesn't appear, check whether your browser blocked it, then ask the agent to try again.

### Always test the connection

Don't assume it worked. Give it a tiny, harmless task to prove it:

> Now that the calendar is connected, tell me what's on Steven's calendar tomorrow. Just read it, don't change anything.

> Check my inbox and tell me how many unread emails I have. Don't open, reply to, or move anything.

If the answer matches reality, the connection works.

### Connect in a sensible order

Start with the apps you use most, then expand:

1. 📅 **Calendar** (highest value, lowest risk when starting read-only)
2. 📧 **Email**
3. 💬 **Chat / messaging** (Slack, Teams, Telegram, etc.)
4. 📝 **Task tracker / notes** (Notion, Asana, Trello, etc.)
5. 📁 **Shared drive** (Google Drive, OneDrive, Dropbox)
6. ✈️ **Travel, expenses, and other specialist tools**

### Start read-only, then widen access

A smart first-week pattern is to begin with "look but don't touch," then grant more once you trust the results:

> For now, only *read* my calendar and email. Don't create, edit, delete, or send anything yet. I'll tell you when you can start making changes.

Later:

> You've been doing well. You can now create and edit calendar events on my behalf, but still ask me before sending anything to external people.

### Disconnecting and fixing problems

> Disconnect from my Dropbox.

> My calendar connection seems broken. Can you reconnect it?

> Which apps are you currently connected to?

Run that last one occasionally. It's a good habit to know exactly what the agent can reach.

---

## 4. Step 2: Teach It Who You Work For

The agent doesn't know your boss. Spend ten minutes now and every later task gets better.

### Give it a profile

> Here's some background so you can support me properly.
>
> **Who I support:** Steven, CEO of SN Group.
> **Timezone:** Australia/Sydney (AEST/AEDT).
> **Working hours:** 8:30am to 6pm, Monday to Friday.
> **Meeting preferences:** Mornings for external calls, afternoons for internal. 15-minute buffer between meetings. No meetings before 9am. Lunch is 12:30-1:30 and should stay protected.
> **Communication style:** Short, direct, friendly but professional. No exclamation marks in emails to clients.
> **Priorities this quarter:** Closing the Series A, hiring a COO, launching the new website.

### Teach it the people

> Here are the people who come up most. Remember them.
>
> - **Ariana**: Senior PA, handles operations. Anything urgent about logistics goes to her.
> - **Maria Lopez**: Client at Acme Corp. High priority. Always reply within 2 hours.
> - **David Chen**: Board member. Treat anything from him as urgent.

### Teach it the red lines

> Never share Steven's personal phone number, home address, or travel itinerary with anyone outside the leadership team. If someone asks, tell me and don't respond.

### Ask it to read it back

This is the easiest way to catch misunderstandings:

> Summarize what you know about Steven and how I want you to work. I'll correct anything that's wrong.

> **Why this matters:** Whatever you tell the agent here is the foundation for everything else. If something changes (new priorities, a new key client), just update it: *"Update: Steven no longer takes calls on Mondays."*

---

## 5. Step 3: Calendar & Scheduling

Scheduling is usually the best first real task. It's repetitive, rule-based, and easy for you to check.

### Simple requests

> What's on Steven's calendar today?

> Find a free 45-minute slot for Steven this week for a call with the finance team.

> Move tomorrow's 2pm with Sam to Thursday morning and let Sam know.

### Rich requests (the kind that really save time)

> Schedule a 60-minute strategy session with Maria Lopez (maria@acme.com) and Ariana within the next 10 days.
>
> - Mornings only, Sydney time.
> - Avoid Mondays and Fridays.
> - Add a Google Meet link.
> - Title it "Acme x SN Group: Strategy Session."
> - Use the agenda template from the Meeting Notes folder.
> - **Show me the proposed time before sending the invite.**

### Teach it your scheduling rules once

Instead of repeating rules every time, state them once and tell it to remember:

> Scheduling rules to remember from now on:
>
> 1. Never double-book Steven.
> 2. Always leave 15 minutes between meetings.
> 3. Block 9-10am daily for deep work. Treat it as unavailable.
> 4. Back-to-back meetings are never OK for more than 3 hours in a row.
> 5. External meetings default to 30 minutes unless I say otherwise.
> 6. If there's a conflict, don't resolve it yourself. Tell me and give me options.

### Handling reschedules and conflicts

> Steven's flight got delayed. Look at everything on his calendar tomorrow between 9am and 1pm and tell me which meetings are at risk. Draft polite reschedule messages for each, but don't send them yet.

### Time zones

Always name the time zone for anyone outside your own:

> Find a time that works for Steven (Sydney) and Priya (London). Show me the options in both time zones.

---

## 6. Step 4: Email & Messages

Email is where trust matters most. **Start with drafts, not sends.**

### Triage

> Go through Steven's inbox from the last 24 hours and sort emails into:
> 1. **Needs Steven's decision**
> 2. **Needs a reply from me**
> 3. **FYI only**
> 4. **Can ignore**
>
> Give me a one-line summary of each. Don't reply to or archive anything.

### Drafting

> Draft a reply to the email from David Chen titled "Board Meeting Dates." Confirm Steven is available on the 14th, politely decline the 15th, and keep it under 100 words. Match Steven's usual tone. Save it as a draft. **Do not send.**

### Learn your voice

> Look at the last 10 emails I sent to clients and describe my writing style: tone, length, how I open, how I sign off. Then write all future drafts in that style.

### Auto-handling the boring stuff (with guardrails)

> For routine meeting requests where Steven is clearly free, draft an acceptance and put it in my "To Approve" folder. For anything involving money, contracts, legal, or HR, flag it to me and don't draft anything.

---

## 7. Step 5: Teaching Repetitive Tasks

This is where an AI agent starts paying off. Any task you do again and again (weekly reports, invoice chasing, meeting prep) can be *taught once* and then handled for you.

### The 6-Step Teaching Loop

Use this every time you teach something new.

```
1. EXPLAIN  →  2. SHOW  →  3. TRY  →  4. CORRECT  →  5. SAVE  →  6. REVIEW
```

#### 1. Explain: say what the task is and why it exists

> I want to teach you a task I do every Monday: the weekly CEO briefing. The goal is that Steven walks into Monday knowing what's on his plate, what's at risk, and what needs his decision.

#### 2. Show: walk through your steps in order

Be as literal as you can. Write out the steps the way you'd explain them to a person sitting next to you:

> Here's how I do it:
>
> 1. Open Steven's calendar and list every meeting Monday to Friday.
> 2. For each external meeting, add the person's company and one line on why we're meeting.
> 3. Check the "Open Tasks" board in Notion and list anything marked **High** priority or overdue.
> 4. Scan Steven's email from the past weekend and pull out anything that needs his decision.
> 5. Put it all into a one-page summary using the template in the "Templates" folder.
> 6. Send it to Steven on Telegram by 7:30am.

#### 3. Try: let it do one real run, with you watching

> Let's do a practice run for this week. Show me the result, but don't send it to Steven.

#### 4. Correct: give specific feedback

Vague feedback ("make it better") doesn't teach much. Specific feedback does:

> Good start. Three changes:
> 1. Put "Needs your decision" at the very top. That's what he reads first.
> 2. Keep each meeting to one line, not a paragraph.
> 3. Don't include meetings that are internal and under 15 minutes.

#### 5. Save: lock it in as a routine

> Great. Save this as a routine called "Monday CEO Briefing" with the corrections we just made. Whenever I say "run the Monday briefing," follow these exact steps.

#### 6. Review: check back for the first few runs

> After the next two runs, ask me if anything needs adjusting.

> **The golden rule:** Show it once, correct it once, then it should be able to repeat it. If it still gets something wrong the third time, the instructions probably need to be more specific, not the agent "learning slowly."

### A reusable template for teaching any task

Copy this and fill it in:

```
I want to teach you a task called "[TASK NAME]".

WHY IT EXISTS:
[What's the purpose? Who is it for?]

HOW OFTEN:
[Daily / weekly / monthly / whenever X happens]

WHAT YOU NEED ACCESS TO:
[Calendar, email, Notion, shared drive, etc.]

STEPS:
1. ...
2. ...
3. ...

WHAT A GOOD RESULT LOOKS LIKE:
[Format, length, tone, where it gets delivered]

RULES / THINGS TO AVOID:
- ...
- ...

WHEN TO STOP AND ASK ME:
- If ...
- If ...

Let's do a practice run first. Don't send anything externally yet.
```

### Teaching from an example you already have

You don't always have to write steps. Sometimes it's easier to show the finished product:

> Here's last month's expense report that I made by hand [attach file]. Study it and work out the format, columns, and categories I used. Then recreate this month's report from the receipts in the "March Receipts" folder.

> Here are three past examples of the follow-up email I send after client meetings. Notice what they have in common. From now on, when I say "draft the follow-up," write one in this style.

### Examples of tasks worth teaching

| Task | Typical frequency |
| --- | --- |
| Morning calendar and priority brief | Daily |
| Chasing unpaid invoices or missing approvals | Weekly |
| Weekly CEO briefing | Weekly |
| Meeting prep notes (attendee background, last interaction, agenda) | Before each meeting |
| Meeting follow-up (summary, action items, thank-you email) | After each meeting |
| Expense report compilation | Monthly |
| Travel itinerary assembly | Per trip |
| Inbox triage | Daily |
| Updating the shared task board | Daily or weekly |
| End-of-day summary | Daily |

---

## 8. Step 6: Putting Tasks on a Schedule

A taught task is helpful. A taught task that **runs itself on time** is powerful.

### How to ask for a schedule

State three things: **what**, **when**, and **where the result goes.**

> Every weekday at 7:30am Sydney time, run the Morning Brief and send it to me on Telegram.

> Every Friday at 4pm, run the Weekly Wrap-Up and save it to the "Weekly Reports" folder in Drive.

> On the 1st of every month, compile the expense report and send it to me for approval.

### Be specific about timing

| ❌ Vague | ✅ Clear |
| --- | --- |
| "Every morning" | "Every weekday at 7:30am Sydney time" |
| "Weekly" | "Every Friday at 4:00pm AEST" |
| "End of month" | "On the last working day of each month at 3pm" |
| "Often" | "Every 2 hours between 9am and 5pm on weekdays" |

### Event-based triggers ("whenever X happens, do Y")

Not everything runs on a clock:

> Whenever a new meeting is booked on Steven's calendar with someone outside the company, prepare a one-page briefing on that person and their company and send it to me the day before.

> Whenever an email arrives from David Chen, notify me right away on Telegram with a one-line summary.

### Manage your schedules

Make this a regular habit:

> Show me all the recurring tasks you're running, with their schedules.

> Pause the Friday Wrap-Up for the next two weeks. I'm on leave.

> Change the Morning Brief to 7:00am instead of 7:30am.

> Stop the monthly expense report. We've moved to a new system.

### Ease in safely

For the first few runs of any scheduled task, add a safety net:

> For the first 3 runs, send me the output for review *before* it goes to Steven. After that, send it straight to him.

---

## 9. Step 7: Reminders, Follow-ups & Task Tracking

A lot of an EA's value is making sure nothing slips. The agent is excellent at this.

### Reminders

> Remind me tomorrow at 9am to confirm the venue for the board dinner.

> Remind Steven 30 minutes before every external meeting, with the attendee's name and the meeting link.

### Follow-ups

> I sent an email to the caterer today asking for a quote. If they haven't replied by Thursday noon, remind me and draft a polite nudge.

> Keep an eye on the contract Steven sent to legal. If there's no response in 3 business days, flag it to me.

### Task tracking

> Add a task to the Notion board: "Book flights for Singapore trip." Priority High, due Friday, assigned to me.

> Show me everything overdue or due in the next 3 days, grouped by priority.

> Mark the "Update CEO bio" task as done and add a note that the new version is in the Brand folder.

### Delegation and handoffs

> This task is for Ariana. Create it on the board, assign it to her, and send her a short message with the context and deadline.

---

## 10. Step 8: Research, Documents & Travel

### Research

> I need a briefing on Acme Corp before Steven's meeting on Thursday. Include what they do, recent news, key people, and anything notable about their relationship with us. One page, bullet points, with sources linked.

> Compare three venues in Sydney CBD for a 40-person dinner on the 22nd. Show price, capacity, dietary options, and distance from the office in a table.

### Documents

> Turn these rough meeting notes into clean minutes with: attendees, key decisions, action items (with owners and due dates). Use the company's minutes template.

> Proofread this letter for spelling and tone. Don't rewrite it, just list the corrections and I'll decide.

> Summarize this 30-page report into half a page. Highlight anything that needs Steven's decision.

### Travel

> Plan a two-day trip to Melbourne for Steven, March 10-11.
> - Morning flight out, evening flight back, preferably Qantas.
> - Hotel within walking distance of the Collins St office.
> - Aisle seat, no red-eyes.
> - Give me 2 options with prices. **Don't book anything yet.**

> Build a single-page itinerary from these booking confirmations. Include flight times, hotel address, confirmation numbers, and local contacts.

---

## 11. Setting Boundaries and Approvals

You are handing a capable assistant the keys to sensitive tools. Set rules early.

### The approval ladder

Decide, task by task, how much freedom to give:

| Level | What it means | Good for |
| --- | --- | --- |
| 🟢 **Just do it** | Agent acts without asking | Reading, summarizing, internal reminders, tidy-up |
| 🟡 **Draft, then I approve** | Agent prepares, you review and release | Emails, invites, reports, anything external |
| 🔴 **Never without me** | Agent must stop and ask | Money, contracts, legal, HR, deleting things, sharing confidential info |

Tell the agent where each task sits:

> Rules of engagement:
>
> 🟢 You can freely read my calendar, email, and Notion, create internal reminders, and organize my files.
> 🟡 For anything sent to someone else (emails, invites, messages), draft it and wait for my approval.
> 🔴 Never make a payment, sign anything, delete anything, or share a confidential document without my explicit OK.

### Handling sensitive information

- Don't paste passwords, full bank details, or other people's medical or payroll information into prompts unless your organization explicitly allows it.
- Tell the agent what's confidential:

> Anything in the "HR" and "Finance" folders is confidential. Never summarize, quote, or forward it unless I specifically ask you to.

### Ask it to confirm before big actions

> Before you do anything that can't be undone, such as sending, deleting, paying, or booking, tell me exactly what you're about to do and wait for me to say "go."

### Keep a record

> Keep a running log of every action you take on my behalf: what you did, when, and in which app. Show it to me when I ask.

---

## 12. When It Gets Something Wrong

It will, sometimes. That's normal. It's like any new assistant. What matters is how you correct it.

### Be specific about what was wrong

| ❌ Unhelpful | ✅ Helpful |
| --- | --- |
| "That's wrong." | "You booked the meeting in my timezone, not Maria's. It should be 2pm Sydney, which is 4am London." |
| "Not what I wanted." | "I wanted three options, not one, and in a table." |
| "Try again." | "Try again, but keep it under 100 words and drop the second paragraph." |

### Useful recovery phrases

> Stop. Don't do anything else yet. Tell me exactly what you did in the last step.

> Undo that and put things back the way they were.

> Why did you do it that way? Walk me through your reasoning.

> That's not the right approach. Here's what to do instead: ...

> Remember this for next time: [the lesson].

### Make corrections stick

The most overlooked step. After fixing a mistake, ask it to remember:

> Remember this: When I say "next week," I mean the following Monday to Friday, not the next 7 days.

---

## 13. Common Beginner Mistakes

1. **Too vague.** "Handle my emails" gives it nothing to work with. Say *which* emails, *what* handling, and *what's off limits*.
2. **Giving too much freedom too early.** Begin with read-only, then drafts, then approvals, then autonomy.
3. **Skipping the test run.** Always do one supervised run of a new routine.
4. **Never saying what good looks like.** Show an example or describe the format.
5. **Forgetting the timezone.** Always state it.
6. **Not reviewing.** Spot-check the work for the first couple of weeks, even when it seems perfect.
7. **Teaching in one giant message.** Build up in layers. Connect, then teach, then schedule.
8. **Not correcting it.** If you silently fix its output yourself, it never learns. Give feedback.
9. **Sharing sensitive data casually.** Check your organization's rules first.
10. **Treating it as a replacement instead of a partner.** Your judgment, relationships, and context are what make you an EA. The agent is there to give you time back for the work that needs *you*.

---

## 14. Your First Week: A Day-by-Day Plan

| Day | Focus | Try saying |
| --- | --- | --- |
| **Day 1** | Connect & introduce | "Connect to my calendar and email. Read-only for now." / Give it the profile from [Step 2](#4-step-2-teach-it-who-you-work-for). |
| **Day 2** | Calendar | "What's on tomorrow? Find me a free slot for X. Draft an invite, don't send." |
| **Day 3** | Email triage | "Sort the last 24 hours of email into decide / reply / FYI / ignore." |
| **Day 4** | Teach your first routine | Use the [6-step loop](#the-6-step-teaching-loop) on something small, like a morning brief. |
| **Day 5** | Schedule it | "Run the Morning Brief every weekday at 7:30am and send it to me." |
| **Day 6** | Reminders & follow-ups | "Remind me to chase X. Flag anything I haven't heard back on in 3 days." |
| **Day 7** | Review | "What did you do this week? What did you struggle with? What should I teach you next?" |

At the end of week one, ask the agent itself:

> Based on what you've seen of my work this week, which repetitive tasks do you think I should teach you next?

---

## 15. Copy-and-Paste Prompt Library

Replace anything in `[brackets]`.

### Setup

```
Connect to my [APP]. For now, read-only: don't create, edit, delete, or send anything.
```

```
Which apps are you currently connected to, and what can you do in each?
```

```
Summarize what you know about me, my boss, and how I want you to work, so I can correct anything wrong.
```

### Scheduling

```
Find [DURATION] for [PERSON/PEOPLE] sometime [TIMEFRAME]. Prefer [TIMES]. Avoid [DAYS/TIMES].
Show me [NUMBER] options in [TIMEZONE]. Don't send any invite until I approve.
```

```
Check [PERSON]'s calendar for [DATE RANGE] and flag any conflicts, back-to-back meetings, or days with more than [NUMBER] hours of meetings.
```

### Email

```
Go through my inbox from the last [TIMEFRAME] and sort into: needs decision / needs reply / FYI / ignore.
One-line summary each. Don't reply, archive, or delete anything.
```

```
Draft a reply to [EMAIL SUBJECT/SENDER]. Say [KEY POINTS]. Tone: [TONE]. Under [WORD COUNT] words.
Save as draft. Do not send.
```

### Teaching a routine

```
I want to teach you a task called "[NAME]".
Why: [PURPOSE]
How often: [FREQUENCY]
Steps:
1. ...
2. ...
Good result looks like: [FORMAT/LENGTH/DELIVERY]
Rules: [LIMITS]
Stop and ask me if: [CONDITIONS]
Let's do a practice run first. Don't send anything externally.
```

```
Save that as a routine called "[NAME]". When I say "[TRIGGER PHRASE]", follow exactly these steps.
```

### Scheduling a routine

```
Every [DAY/WEEKDAY] at [TIME] [TIMEZONE], run "[ROUTINE NAME]" and send the result to me on [APP].
For the first [NUMBER] runs, send it to me for review first.
```

```
Show me all the recurring tasks you're running and their schedules.
```

### Reminders & follow-ups

```
Remind me on [DATE/TIME] to [ACTION].
```

```
If [PERSON] hasn't replied to [EMAIL/REQUEST] by [DEADLINE], remind me and draft a polite follow-up.
```

### Research & documents

```
Research [TOPIC/COMPANY/PERSON] for [PURPOSE]. One page, bullet points, sources linked. Highlight anything surprising or risky.
```

```
Summarize [DOCUMENT] in [LENGTH]. Highlight decisions needed and deadlines.
```

### Boundaries & corrections

```
Before you do anything that can't be undone (sending, deleting, paying, booking), tell me what you're about to do and wait for my "go."
```

```
Stop. Tell me exactly what you did in the last step, then undo it.
```

```
Remember this for next time: [LESSON].
```

---

## A Final Word

You won't get everything right on day one, and neither will the agent. The EAs who get the most out of AI agents tend to do the same few things:

- **Start small** with one app and one task.
- **Be specific** about what good looks like.
- **Review early**, then loosen the reins as trust builds.
- **Give feedback every time**, so the agent keeps improving.
- **Keep the judgment calls** for themselves.

Treat the agent like the newest, fastest member of your team. Brief it well, check its work, and you'll quickly find hours of your week coming back to you.
