-- Environment: PROD
-- Assignee: 80c63414-5956-4f8f-958a-8cf066dd641d
-- Migration: Import EA pending tasks (embedded CSV data, v3)
-- Created: 2026-09-02
-- Source: supabase/migrations/EA PENDING TASK TRACKER - Shane.csv
-- v3 changes:
--   * Regenerated directly from latest uploaded CSV (146 rows).
--   * Strict task titles: every row must have non-empty/non-'-' Task.
--   * '-' is treated as empty (NULL-equivalent) for non-task columns.
--   * notes are cleaned (Source link lines, URLs, [], and chr(1) removed).
--   * links are extracted into public.pa_task_attachments (attachment_type='link').
--   * deterministic id: md5('ea-pending-import:' || source_key)::uuid

BEGIN;

DO $$
DECLARE
  v_assignee_user_id uuid := '80c63414-5956-4f8f-958a-8cf066dd641d';
  v_user_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = v_assignee_user_id
      AND u.deleted_at IS NULL
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'Assignee user_id % does not exist in public.users or is deleted.', v_assignee_user_id;
  END IF;

  INSERT INTO public.pa_task_access_grants (user_id, access_level, granted_by)
  SELECT v_assignee_user_id, 'member', v_assignee_user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.pa_task_access_grants g
    WHERE g.user_id = v_assignee_user_id
      AND g.deleted_at IS NULL
  );
END $$;

WITH source_data (
  source_key,
  title,
  description,
  status_label,
  priority_label,
  category_label,
  due_date,
  date_given,
  waiting_on,
  notes,
  updated_at
) AS (
VALUES
  ('ea-pending-shane-1', 'Finalise Ruby Lane Breakfast & Lunch Bookings', 'Finalise dining bookings for Breakfast & Lunch (Ruby Lane)', 'Completed', 'Critical', 'EO Event', '2026-08-11', '2026-08-05', NULL, 'Source link: Steven@24fc email: https://mail.google.com/mail/u/0/?tab=rm&ogbl#sent/KtbxLwgddKWfqGxXHtFZjxLfkLTDwmjhZg', '2026-08-12T00:00:00Z'),
  ('ea-pending-shane-2', 'Register for 50 Enterprise Drive & 6 Kestrel Ave Auctions', 'Auction Details for 50 Enterprise Drive and 6 Kestrel Ave - Check from SNGroup28 email - register steven', 'Completed', 'High', 'Property', '2026-08-21', '2026-08-20', NULL, 'Source link: https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox/FMfcgzQhWBcbRWwcCrrKPjdcWKjhfJvV

https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox/FMfcgzQhWBcbbjLSXrhFnPTxHMVkSsnG', '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-3', 'Prepare Agenda for Steven Meeting on 4.9.2026', NULL, 'In Progress', 'High', 'Admin', '2026-09-04', '2026-09-01', NULL, NULL, '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-4', 'Follow up if order has been made Enbrel Syringe Disposal Container', 'Hi @Steven24fitclub , Regarding the email you forwarded, I checked this.

Previously, the items could be ordered through Pfizer, but that program has now concluded. The Arrotex Supported Patient Program is now handling the orders. I spoke with their team, and they will send you the welcome kit along with extra replacement sharps containers.

To enrol, they need to complete a few verification questions with you over a short 15-minute call and set up your account. Once enrolled, we’ll be able to order the items free of charge, similar to the previous Pfizer program, the main change is simply the provider.

Call availability with Tania: Monday or Tuesday only, for approximately 15 minutes.

When I spoke with her earlier, she also confirmed that she would arrange the welcome kit and an extra sharps disposal container, I''ll check again by tomorrow to if it was ordered as I haven''t received any email yet.

Also, I’ll arrange the call as they will just call on your mobile phone number by next week.

Thanks!', 'In Progress', 'High', 'Health', '2026-09-04', '2026-09-01', NULL, NULL, '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-5', 'Update EA SOP for Investment Payment', 'EA SOP (Update for Payment of Investment)

1. Sign documents on behalf of Steven & Van Lo Nhan
2. Pay the bill using Personal Amex  -Not for reimbursment', 'Not Started', 'Low', 'Admin', '2026-09-05', '2026-08-24', NULL, NULL, '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-6', 'Schedule Steve Dawson & Steven Nhan Dinner/Coffee', 'Schedule Steve Dawson & Steven Nhan Dinner / Coffee After Fortuna One Event', 'In Progress', 'Medium', 'Personal', '2026-09-11', '2026-08-26', 'Fortune One Event Schedule', 'Schedule for Fortuna One is still TBC', '2026-08-26T00:00:00Z'),
  ('ea-pending-shane-7', 'Book MacBook Apple Store Appointment', '"I am at the Apple Store right now. They said I will probably be here for another 10 to 15 minutes. I have a call with May coming up, but the next time I am conveniently close to the Apple Store, can you book my MacBook in? It is not urgent. My MacBook sometimes freezes at any time within the next month or two. I will send you the details about it."', 'Not Started', 'Low', 'Personal', '2026-10-25', '2026-08-26', NULL, 'Source link: https://drive.google.com/drive/folders/1awIaWSX23gwGrXdiG6TDkPJ8_wMeXsY8?usp=sharing', '2026-08-26T00:00:00Z'),
  ('ea-pending-shane-8', 'Process Nhan International Investment Payment and Signatures', 'Payment for Investment NHAN INTERNATIONAL EXPORT & IMPORT CO. PTY LTD 060817674 & signature of Steven & Van Lo Nhan', 'In Progress', 'High', 'Personal', '2026-09-04', '2026-08-26', NULL, '- coordinated with Tina

Source link: Email (24 Fit Club: https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox/FMfcgzQhWBdlrwMTVBmdSrLlMNNRzQzl)', '2026-08-27T00:00:00Z'),
  ('ea-pending-shane-9', 'Register for HCF Flybuys Points Offer and Cancel', 'Register Steven before end date & cancel immediately just get points (ends at 14 Sep 2026) https://freepoints.com.au/hcf-flybuys-jul-2026/', 'In Progress', 'Low', 'Personal', '2026-09-08', '2026-07-24', NULL, 'Source link: https://app.notion.com/p/steven-nhan/HCF-offer-page-the-official-HCF-Flybuys-terms-Offer-ends-14-Sept-2026-3c186ed3b470801f84abc3b321bb0c25?source=copy_link', '2026-08-25T00:00:00Z'),
  ('ea-pending-shane-10', 'Arrange Steven and Father Physio Appointments', '"For my next physio session, can I book a day where I go with my dad? I will take him with me. Find a day either Tuesday or Thursday in the next two or three weeks, preferably after 1pm to avoid traffic. We each need an hour slot, so maybe 2 to 3pm and then 3 to 4pm. While my dad is seeing the physio, I can see LV dental for a facial as well to be efficient. Schedule these appointments back to back if possible." - Change Peter’s appointment for Steven with his father - he wants to have future session with his father

Arrange Steven and his father''s next treatment appointments: Steven physio + dry needling specifically with Linda, and Steven''s dad physio only, ideally sequentially/conveniently timed.', 'In Progress', 'Medium', 'Personal', '2026-09-11', '2026-08-21', NULL, 'To check with Linda if there''s a schedule

Source link: https://drive.google.com/file/d/1lQBYfQwhNdlBloIvcZg5GnNTn2CiOuVj/view?usp=sharing', '2026-08-26T00:00:00Z'),
  ('ea-pending-shane-11', 'Email Vladimir to have virtual Meeting with Steven', 'Email Vladimir : Val@marbella.net
Schedule a call for us anytime in 2 week', 'Waiting for Response', 'Low', 'Admin', '2026-09-11', '2026-08-27', 'Vladimir', NULL, '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-12', 'Email Denis About Improv School Holiday Program', 'Email Denis to ask about School Holidays program of Improv Workshop for Kids (Mia) (schedules, fees, etc)', 'Not Started', 'Low', 'Personal', '2026-09-12', '2026-08-14', NULL, 'Source link: https://drive.google.com/file/d/1XoDfdn2LqOduRE9csKyo-5RuGeZCOYth/view?usp=sharing 

https://drive.google.com/file/d/1z9TcnX4CkWp5JNPPbvkIvoMjy42CqBPM/view?usp=sharing', '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-13', 'Inform Steven if you received email from Doron', 'Inform Steven once received', 'In Progress', 'Medium', 'Admin', '2026-09-03', '2026-09-01', NULL, 'Waiting for Email from Doron

Source link: https://drive.google.com/drive/folders/1B71bh6aX4Ag-3jn50y4yvVI4Nt40f5x_?usp=sharing', '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-14', 'Check Zip Tap', 'Upload model of my zip and ask ai why it does this ? If not we might need zip to come service 

See in notion model number 

Zip tap', 'Not Started', 'Medium', 'Personal', '2026-09-04', '2026-08-28', NULL, 'Source link: https://drive.google.com/drive/folders/1Fzoy3-E_nD53NIWTQtl6ymM2SNhQovTQ?usp=sharing', '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-15', 'Suggest September Date Options with Linh', 'Help Steven arrange date with Linh-give suggestions for Sept 2026', 'Not Started', 'Medium', 'Personal', '2026-09-11', '2026-08-28', NULL, NULL, '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-16', 'Maintain and Schedule Steven Haircut with Teddy', 'Keep Steven''s haircut with Teddy on Tuesday, 18 Aug, 3:30–4:00 pm.


Consider Tuesdays as the preferred haircut day going forward because Teddy is unavailable Wednesday/Thursday. and make sure to book it 3 weeks after the previous haircut or if shedule is really busy try to book it 5 days before 1 month after previous haircut', 'Recurring', 'Medium', 'Personal', NULL, '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-17', 'Remove Unnecessary SFO Full-Day Focus Block', 'Remove the unnecessary SFO full-day focus block where appropriate. Steven does not necessarily need an entire day dedicated to SFO.', 'Recurring', 'Low', 'Admin', NULL, '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-18', 'Schedule Email Review Before 5 PM', 'Schedule email review/batching before 5 pm (not end of day).', 'Recurring', 'Medium', 'Admin', NULL, '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-19', 'Maintain EA Pending List Tracker Manually', 'Continue maintaining the EA Pending List Tracker manually until the workflow with Tina/Franz is improved or automated.', 'Recurring', 'Medium', 'Admin', NULL, '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-20', 'Follow Up Steven on Ury Invoice Details', 'Follow up Steven, if he has called Ury for the invoice details', 'Completed', 'High', 'Property', '2026-08-31', '2026-08-26', NULL, '- informed Steven', '2026-08-31T00:00:00Z'),
  ('ea-pending-shane-21', 'Messaged Franz for AI Automation for Steven’s Request on EO Parking lot', 'Directives:
 • Develop an AI tool to upload and review parking lot Excel spreadsheets and related documents.
• Ensure the tool extracts key points, main threads, and categorize them into predefined EO categories.
• Implement a monthly summarization process after every forum.
• Coordinate with Jacob to receive additional related documents.

Directives:
 • Evaluate building a reusable AI system for processing rolling transcripts.
• Continue managing the parking lot and summarizing discussion topics.', 'Completed', 'High', 'Admin', '2026-09-01', '2026-08-26', NULL, 'Coordinated to Franz and sent necessary information', '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-22', 'Register Steven to EO Events', NULL, 'Completed', 'High', 'EO Event', '2026-08-31', '2026-08-28', NULL, NULL, '2026-08-31T00:00:00Z'),
  ('ea-pending-shane-23', 'Sign and Email Authority to Bid', 'Sign on behalf of Linh & Steven the Authority to Bid & Email Authority to Bid to Commercial Collective', 'Completed', 'High', 'Property', '2026-08-25', '2026-08-25', NULL, NULL, '2026-08-25T00:00:00Z'),
  ('ea-pending-shane-24', 'Review Optus vs Superloop Internet Provider', 'Internet provider - flybus - Optus vs Superloop', 'Completed', 'Medium', 'Personal', '2026-08-31', '2026-08-01', NULL, 'Transferred from Superloop to Optus 31-Aug 2026

Source link: https://drive.google.com/file/d/1-i7fcyDO-05mlfkDdiIyg1mbTHRW3pEK/view?usp=sharing

https://drive.google.com/file/d/1-i7fcyDO-05mlfkDdiIyg1mbTHRW3pEK/view?usp=sharing', '2026-08-31T00:00:00Z'),
  ('ea-pending-shane-25', 'Unique Cleaning Co Invoice of 132 George Street', 'Check tomorrow if Jenny already paid the Cleaning Company for 132 House', 'Completed', 'High', 'Personal', '2026-08-28', '2026-08-26', NULL, NULL, '2026-08-28T00:00:00Z'),
  ('ea-pending-shane-26', 'Follow Up Ury Response', 'Waiting for Response from Ury', 'Completed', 'High', 'Property', '2026-08-26', '2026-08-20', 'Ury', NULL, '2026-08-26T00:00:00Z'),
  ('ea-pending-shane-27', 'Follow Up George Email Response', 'Waiting for Email response from George', 'Completed', 'High', 'Property', '2026-08-26', '2026-08-18', 'George', NULL, '2026-08-26T00:00:00Z'),
  ('ea-pending-shane-28', 'Email Jay About Property Auction Financing', 'email Jay our mortgage broker

Directives:
• Email Jay about Steven''s upcoming property auction next week and the targeted price of $4 million
• Send Jay an instant message asking if he requires anything from us
• Obtain information on expected interest rates for this loan from Jay
• Obtain information on expected loan-to-value ratio (LVR) for this purchase from Jay', 'Completed', 'Critical', 'Property', '2026-08-21', '2026-08-20', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-29', 'Email Abdul', 'Hi @Steven24fitclub , I received an email from Abdul regarding a quick walkthrough of their platform.

You don’t have availability today, and tomorrow is the weekend. Monday is already full, plus you’ll have the cleaners at home, and there’s no need to rush your afternoon after BJJ as you can use that time for tasks. Tuesday and Wednesday are also full, so I think Thursday would be the best option for you to have the call and focus properly.

I’ll suggest a suitable Thursday time to Abdul and coordinate from there. Just FYI, thanks!

Abdul Salam - Schedule call with Steven (see email from 24fc)', 'Completed', 'Low', 'Meeting', '2026-08-25', '2026-08-20', NULL, NULL, '2026-08-25T00:00:00Z'),
  ('ea-pending-shane-30', 'Complete Auction Registrations for Both Properties', 'Complete auction registrations for 50 Enterprise Drive Beresfield and 6 Kestrel Avenue. Upload Steven’s driver licence and complete required signature fields. Shane has approval to sign the registration acknowledgement on Steven’s behalf.', 'Completed', 'Critical', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-31', 'Verify Entity Details for Property Registrations', 'Complete registration for both properties and ensure the correct entity details are used (SNL trust/company details).', 'Completed', 'Critical', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-32', 'Review Yuri Contract Amendments and Update Steven', 'Review the contract amendments received from Yuri and update Steven via GC. Confirm legal fees ($3,500 + GST and potential unsuccessful purchase fee of $1,000 + GST + disbursements).', 'Completed', 'High', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-33', 'Follow Up George on Missing Due Diligence Documents', 'Follow up George regarding missing 50 Enterprise Drive due diligence documents. Ask when the information can realistically be provided so there is a clear commitment date.', 'Completed', 'High', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-34', 'Run Tenant Due Diligence and Prepare Preliminary Report', 'Run tenant due diligence using current lease information and available documents. Use ChatGPT to extract tenant-related insights and prepare a preliminary report.', 'Completed', 'Critical', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-35', 'Compare Luke Bolden DD Recommendations for Beresfield', 'Upload Luke Bolden’s DD email into AI and compare against 50 Enterprise Drive DD. Identify anything Luke recommended on 10 Commercial Drive that has not been completed for Beresfield.', 'Completed', 'High', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-36', 'Confirm EO Mini Retreat Payments Received', 'Review Steven’s seafood email/delegated inbox and confirm all EO Mini Retreat payments received. Cross-check with Hazel’s records because Steven believes additional payments may have been received.', 'Completed', 'Medium', 'EO Event', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-37', 'Schedule Recurring EO Parking Lot Review', 'Set up a flexible recurring 30-minute EO parking lot/reflection review. Preferred timing: Tuesday 10:00–10:30 am, but flexible if conflicts occur.', 'Completed', 'Medium', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-38', 'Clean Up EO Forum Calendar Entries', 'Remove incorrect EO forum entries and ensure only confirmed events remain. Check EO events 1–2 weeks ahead.', 'Completed', 'Medium', 'EO Event', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-39', 'Arrange EO Forum Buddy Meeting with John and Vanya', 'Send email to John (IT) and Vanya to arrange EO forum buddy meeting. Offer Tuesday availability first and ask them to suggest alternatives if unavailable.', 'Completed', 'Medium', 'EO Event', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-40', 'Keep Parking Lot Spreadsheet Confidential in Outreach', 'Do not mention the confidential parking lot spreadsheet when contacting John/Vanya. Only say Steven suggested organising the meeting.', 'Completed', 'High', 'EO Event', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-41', 'Renew Meta Developers/Instagram API Access', 'Access Steven’s Facebook account and help renew Meta Developers/Instagram API access. Coordinate approval from Steven. To coordinate with Imma.', 'Completed', 'High', 'Personal', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-42', 'SN / EO Video', 'Tell Vion to keep the video generic — no SN logo/branding. SN colours are okay, but it should be usable for EO/general training.; upload in Youtube - change title to EO', 'Completed', 'High', 'Personal', '2026-08-25', '2026-08-21', NULL, NULL, '2026-08-25T00:00:00Z'),
  ('ea-pending-shane-43', 'Schedule Meeting with Chris from IWPC', 'Contact Chris from IWPC regarding availability and schedule meeting around 11:30 am–12:20 pm Tuesday if suitable.', 'Completed', 'Medium', 'Meeting', '2026-08-25', '2026-08-21', 'Chris', NULL, '2026-08-24T00:00:00Z'),
  ('ea-pending-shane-44', 'Schedule Useful Calls During Steven Driving Time', 'Look ahead for times when Steven is driving (early mornings/late evenings) and schedule useful calls with May, Nico, or other team members where appropriate.', 'Completed', 'Medium', 'Meeting', '2026-08-25', '2026-08-21', NULL, NULL, '2026-08-24T00:00:00Z'),
  ('ea-pending-shane-45', 'Medibank Call (C/O Tina)', 'Phone 1300 128 327 
Medibank - call on Monday ask Tina for what', 'Completed', 'Medium', 'Admin', '2026-08-25', '2026-08-21', NULL, NULL, '2026-08-24T00:00:00Z'),
  ('ea-pending-shane-46', 'Check and Pay Improv Workshop Invoice', 'Check and Pay Invoice using Nhan Amex for Improv Workshop', 'Completed', 'High', 'EO Event', '2026-08-13', '2026-08-12', NULL, 'Checking with John - sent sms for follow up

Source link: Steven24fc Email: https://mail.google.com/mail/u/0/?tab=rm&ogbl#inbox/FMfcgzQhVrCjzxPDHbbtXNpVcKCjDGjz?projector=1&messagePartId=0.1', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-47', 'Schedule Cleaners Before Month End', 'Find Time for Cleaners before end of this month - John should be available and coordinate date with Linh too', 'Completed', 'High', 'Personal', '2026-08-18', '2026-08-13', NULL, 'Redeemed, waiting for Steven Response for 2nd Ticket Details - sent to Steve Dawson', '2026-08-17T00:00:00Z'),
  ('ea-pending-shane-48', 'Get September EO Fortuna Event Tickets', 'September Tickets for EO Fortuna Event (get from website, check email)', 'Completed', 'Medium', 'EO Event', '2026-08-31', '2026-07-14', 'Steven', NULL, '2026-08-31T00:00:00Z'),
  ('ea-pending-shane-49', 'Add EO Mini Retreat Budget Tracker Notion Links', 'Notion Links for Budget Tracker of EO Mini Retreat', 'Completed', 'Medium', 'EO Event', '2026-08-10', '2026-08-02', NULL, 'Sent to Steven at TG GC', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-50', 'Check Cosmic Dolphins Forum Date Conflicts Through 2027', 'Check if there are any conflicts for Cosmic Dolphins Forum through 2027 proposed dates', 'Completed', 'High', 'EO Event', '2026-08-10', '2026-08-10', NULL, 'Updated Drinks sent to Ruby Lane', '2026-08-10T00:00:00Z'),
  ('ea-pending-shane-51', 'Update Ruby Lane Drink Order', 'Change orders to Ruby Lane from Drinks to Coffee and Add 7 Kombucha for Lunch', 'Completed', 'Critical', 'EO Event', '2026-08-10', '2026-08-10', NULL, NULL, '2026-08-10T00:00:00Z'),
  ('ea-pending-shane-52', 'Check Steven Velocity Points', 'Check Steven''s Velocity points', 'Completed', 'Low', 'Personal', '2026-08-10', '2026-08-10', NULL, 'Barbara will send photos via email', NULL),
  ('ea-pending-shane-53', 'Confirm Collective Manly AV Requirements', 'Call Barbara tomorrow to check regarding AV / Cords needed for the TV at the Collective Manly and reply to Joanna via email once you got answers from Barbara', 'Completed', 'Medium', 'EO Event', '2026-08-12', '2026-08-10', NULL, 'Patty sent quotation to Steven, will negotiate and ask for inclusions', '2026-08-12T00:00:00Z'),
  ('ea-pending-shane-54', 'Follow Up and Negotiate Patty Cleaning Quote', 'If Patty’s cleaning quote has not arrived by Tuesday, follow up for it. - Send email to Patty to negotiate - Patty respomded:

"· The lowest rate is $65/hour + GST. She mentioned via SMS that, based on the size of your house, it would take around 4 hours:
$65 × 4 hours = $260 + $26 (GST) = $286 total."', 'Completed', 'High', 'Personal', '2026-08-14', '2026-08-07', NULL, 'Coordinating with Hazel', '2026-08-11T00:00:00Z'),
  ('ea-pending-shane-55', 'Coordinate EO Mini Retreat Invoicing with Hazel', 'Coordinate EO Mini Retreat invoicing with Hazel. Invoice description should simply say “EO Conference”, show the total only, and not itemize individual expenses.', 'Completed', 'High', 'EO Event', '2026-08-14', '2026-08-14', NULL, 'got the information from their Company''s Website', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-56', 'Complete Missing EO Attendee Invoice Details', 'Complete invoice details for attendees whose information is still missing. Details for John (Truck) & Joanna', 'Completed', 'Medium', 'EO Event', NULL, '2026-08-14', 'John (Truck)  & Joanna', 'Updated Calendar Already while on call with Steven

Original due date text: ASAP', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-57', 'Update Calendar for 25 August EO Event', 'Update the calendar for 25 August EO event and note that Mia will skip BJJ that day; Linh already knows.', 'Completed', 'Medium', 'Personal', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-58', 'Maintain 18 August Appointment Sequence', 'Maintain the planned sequence on 18 Aug: drop off wine → Rhino/café task → Dr Herman → haircut.', 'Completed', 'Medium', 'Personal', '2026-08-18', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-59', 'Plan Newcastle Trip for Beresfield Inspection', 'Plan Steven''s Newcastle trip for Monday to inspect 50 Enterprise Drive, Beresfield before the 26 Aug auction.', 'Completed', 'High', 'Property', NULL, '2026-08-14', NULL, 'Original due date text: Monday, 17 Aug', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-60', 'Map Newcastle Trip Timing and Traffic', 'Map out the Newcastle trip with a recommended departure time, arrival time, ~1 hour inspection, return time and traffic considerations, ensuring Steven is back by 4:30 pm for BJJ.', 'Completed', 'High', 'Property', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-61', 'Book Beresfield Property Inspection with George', 'Once the travel timing is agreed, contact George and book the Beresfield property inspection for Monday.', 'Completed', 'High', 'Property', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-62', 'Create Joanna EO Follow-Up Google Task', 'Create a Google Task for Joanna''s EO follow-up email for Steven to complete first thing Saturday morning. Preferably 5:30AM', 'Completed', 'High', 'EO Event', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-63', 'Complete Joanna EO Follow-Up Action Items', 'Joanna''s task needs Steven to complete his What I Want to Learn list, Top 5 Priorities, What I Can Teach list, add urgent Why/How/What items to the parking lot/master sheet, and add work/personal/family actions to the accountability page.', 'Completed', 'High', 'EO Event', '2026-08-15', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-64', 'Recheck Joanna and EO Forum Dates for Conflicts', 'Recheck every upcoming Joanna / EO Forum date for calendar conflicts and confirm the dates are safe before Steven commits. Steven stressed that this must be checked carefully.', 'Completed', 'High', 'EO Event', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-65', 'Verify October Cosmic Dolphins Forum Date', 'Verify the October Cosmic Dolphins Forum date against the calendar rather than relying on memory.', 'Completed', 'Medium', 'EO Event', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-66', 'Schedule Cleaners for Friday 21 August', 'Contact John regarding cleaners for Friday, 21 Aug and try to schedule around Linh''s availability rather than Steven''s.', 'Completed', 'High', 'Personal', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-67', 'Ask John for Three Cleaners', 'Ask John whether he can provide three cleaners. Shane suggested around 11:30 am, subject to Linh''s schedule.', 'Completed', 'High', 'Personal', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-68', 'Move Routine Banking Tasks to Weekends', 'Move routine banking tasks / bank-account work to weekends. Avoid weekday errands unless genuinely urgent.', 'Completed', 'Medium', 'Finance', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-69', 'Add Herbalife Strategy Review Task for Steven', 'Add task for Steven to review the Herbalife strategy documents and give May his feedback.', 'Completed', 'Medium', 'Operations', NULL, '2026-08-14', NULL, 'Added on Wednesday task

Original due date text: Monday', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-70', 'Schedule 5% Reflection Video Recording', 'Schedule 30 minutes on Wednesday for Steven to record his 5% reflection/encouragement video for the upcoming SN Monthly Call. No script-preparation time is required.', 'Completed', 'Medium', 'Personal', NULL, '2026-08-14', NULL, 'Original due date text: Wednesday', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-71', 'Prepare for Full Property Due Diligence if Proceeding', 'If Steven decides to pursue the property after inspection, prepare to begin the full due-diligence process promptly, because the auction is on 26 Aug.', 'Completed', 'High', 'Property', '2026-08-18', '2026-08-14', NULL, NULL, '2026-08-18T00:00:00Z'),
  ('ea-pending-shane-72', 'Move Outstanding Reimbursement Payment to Tomorrow', 'Move Steven''s outstanding reimbursement payment from the previous Saturday to tomorrow''s tasks because Steven confirmed he likely has not paid it yet. Avoid duplicate payment.', 'Completed', 'High', 'Finance', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-73', 'Check Linh $10,000 Payment Status', 'Check whether Linh''s $10,000 payment went through. Steven will provide the required authentication when Shane messages him.', 'Completed', 'High', 'Finance', '2026-08-14', '2026-08-14', NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-74', 'Add Wine Gifts to Calendar and Prepare Bottles', '"Please add to my Google calendar tomorrow to bring a bottle of wine for Reno as a thank you. Also, prepare a bottle of wine for Anthony from Mr. Pool. Set everything before I leave tomorrow."', 'Completed', 'High', 'Personal', '2026-08-17', '2026-08-17', NULL, 'sent to Steven - Shane GC', NULL),
  ('ea-pending-shane-75', 'Check Availability for Pre-Forum Virtual Call', 'Check Steven''s Calendar before EO Forum for availability of Call

"what dates should i proposed to them for us 3 to do a virtual call? ideally 1 week before forum? as we share each other 5% prep work?"', 'Completed', 'High', 'EO Event', '2026-08-18', '2026-08-17', NULL, 'Source link: https://drive.google.com/file/d/1Cr89l-a7c8ZseQcyvxIU7jjifgAhaQ5b/view?usp=sharing', '2026-08-17T00:00:00Z'),
  ('ea-pending-shane-76', 'Check Superloop Internet Speed Against Plan', 'Based on my Internet plan should my wifi be faster than this? - Check Superloop', 'Completed', 'Medium', 'Personal', '2026-08-25', '2026-08-17', NULL, 'Source link: https://drive.google.com/drive/folders/1TdHPrpbA0QgKQdFFibjOvjxLjGe9eVI7?usp=sharing', NULL),
  ('ea-pending-shane-77', 'Message George About Flexible Arrival Time', '"Please send George an SMS to say hi and ask if he is flexible with his time today. Steve is on his way to see George but does not know the exact arrival time. Steve will likely arrive anytime between 12:00 and 2:00 PM since we are making a road trip with stops. Do not disclose that I am going with Lynn and the kids. Also, please send me back George''s mobile number."

Copy on this @Steven24fitclub. Asked George about the 12:30PM as Linh sent this via 132 GC. Thanks.', 'Completed', 'High', 'Property', '2026-08-17', '2026-08-17', NULL, NULL, '2026-08-17T00:00:00Z'),
  ('ea-pending-shane-78', 'Send 50 Beresfield and 6 Kestrel DD Questions to Steven', 'DD & Qs for 50 Beresfield and 6 Kestrel - send to Steven immediately', 'Completed', 'Critical', 'Property', '2026-08-17', '2026-08-17', NULL, 'Waiting for email from Michael , no email from Michael', '2026-08-17T00:00:00Z'),
  ('ea-pending-shane-79', 'Follow Up Michael BNI Pitch Email', 'Michael will send email to Steven for BNI Pitch for next week - he will send it over the weekend', 'Cancelled', 'Medium', 'Meeting', '2026-08-25', '2026-08-19', NULL, 'Recurring every Tuesday (if not then make it any other day

Source link: https://drive.google.com/file/d/1I4ph1V_S20yKRiE7u1voub3KRmaprzFR/view?usp=sharing', '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-80', 'Schedule Weekly Parking Lot Spreadsheet Review', 'can we schedule a recurring weekly for me to review this parking lot spreadsheet? lets discuss a good time 2. Fill in your parking lot. At least 1 WHY item and 1 HOW or WHAT item, each with an urgency rating. Fill this in here: Master Sheet link
https://www.google.com/url?q=https://docs.google.com/spreadsheets/d/1XT32_nZhe4FmTbCtjQ84szmg9v-jWgXVn3IZGdWUthw/edit&source=gmail&ust=1786738255603000&sa=E', 'Completed', 'High', 'EO Event', '2026-08-21', '2026-08-17', NULL, 'Sent to Steven', '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-81', 'Find Three Recent Leasing Agents Near 50 Beresfield', '50 Beresfield:  • Find three agents who have recently leased buildings near Beresford Road property, prioritizing recent leases and proximity, and save their contact details on a new Notion page.', 'Completed', 'High', 'Property', '2026-08-18', '2026-08-17', NULL, 'Discussion with steven 50 Enterprise GC', '2026-08-18T00:00:00Z'),
  ('ea-pending-shane-82', 'Find Two Roofing Companies for 50 Beresfield', '50 Beresfield:  • Identify two roofing companies for property inspection, obtain their contact information, and create a page under the property in Notion.', 'Completed', 'High', 'Property', '2026-08-19', '2026-08-17', NULL, NULL, '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-83', 'Create 50 Beresfield Due Diligence Checklist', '50 Beresfield: • Create and maintain a checklist outlining all required due diligence tasks to be completed before the auction date.', 'Completed', 'High', 'Property', '2026-08-19', '2026-08-17', NULL, 'Source link: https://app.notion.com/p/steven-nhan/PRE-AUCTION-DD-CHECKLIST-AND-TO-DO-WITH-DUE-DATES-3c086ed3b470804f841be505bedde4ee?source=copy_link', '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-84', 'Verify 6 Kestrel Valuation Analysis', '6 Kestrel Ave:  • Review and verify the current valuation analysis (Dd report) for accuracy.', 'Completed', 'High', 'Property', '2026-08-25', '2026-08-17', NULL, NULL, '2026-08-18T00:00:00Z'),
  ('ea-pending-shane-85', 'Confirm 6 Kestrel Auction and Prepare Bid Strategy', '6 Kestrel Ave: • Confirm auction date and details.
• Prepare a strategy for attending the auction with a maximum bid limit of 3.5 million.', 'Completed', 'High', 'Property', '2026-08-25', '2026-08-17', NULL, '- Tina completed already', '2026-08-18T00:00:00Z'),
  ('ea-pending-shane-86', 'Renew SafeWork NSW High Risk Work Licence', 'SafeWork NSW: HRW603410 Your High Risk Work Licence is due for renewal and will expire on 26/10/2026', 'Completed', 'High', 'Admin', '2026-09-04', '2026-08-27', NULL, 'sent to steven on TG update that the draft is on his email

Source link: https://drive.google.com/drive/folders/1E9WKRkqJWFxbmzD_X24Wn2g_jNHZZ16W?usp=sharing', '2026-08-27T00:00:00Z'),
  ('ea-pending-shane-87', 'Draft Email with Proposed Forum Call Dates', 'Add day next to these easier to understand and draft me the email

Hi @Steven24fitclub , you forum will be on September 15, 2026. You can propose the following dates and times to Vania and Monster:

September 7, 2026: 2:30–3:30 PM
September 8, 2026: 10:30–11:30 AM or 1:00–2:00 PM

Thank you!', 'Completed', 'Medium', 'EO Event', '2026-08-19', '2026-08-18', NULL, 'Ariana already put', '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-88', 'Process Reimbursements for 29 August 2026', 'Reimbursements for 29/08/2026', 'Completed', 'High', 'Admin', '2026-08-28', '2026-08-24', NULL, NULL, '2026-08-28T00:00:00Z'),
  ('ea-pending-shane-89', 'Process Reimbursement for 22 August 2026', 'Reimbursement for 22/08/2026', 'Completed', 'High', 'Admin', '2026-08-21', '2026-08-17', NULL, 'Steven will decide after his visit at the site next week Monday', '2026-08-17T00:00:00Z'),
  ('ea-pending-shane-90', 'Resolve Beresfield Auction and EO Event Conflict', 'Property Development Email - auction location & timings - 50 Enterprise Drive, Beresfield - Conflict with EO Event, Decide if will go to EO Evant on 26th Aug or no', 'Completed', 'Medium', 'Property', '2026-08-17', '2026-08-11', NULL, NULL, '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-91', 'Pause Time-Intensive Property Research Until Auction Outcome', 'Stop further research/tasks that require significant time (e.g. roofers) until after auction outcome. Continue only quick/high-value tasks.', 'Completed', 'Medium', 'Property', '2026-08-21', '2026-08-21', NULL, NULL, '2026-08-21T00:00:00Z'),
  ('ea-pending-shane-92', 'Send One EO Mini Retreat Reminder', 'Send one EO Mini Retreat reminder only, around Wednesday/, rather than multiple reminders.', 'Completed', 'Medium', 'EO Event', '2026-08-12', '2026-08-07', NULL, 'Email sent to George', '2026-08-12T00:00:00Z'),
  ('ea-pending-shane-93', 'Request Beresfield Tenant Ledger and Phone Auction Documents', '"Please ask him to send us a copy of the tenant''s ledger showing their rent." - email george 50 beresfield

"Shane, please ask George to send us all the required documents to complete a phone auction. Also, if possible, complete the forms beforehand for both properties."

Add list from David', 'Completed', 'High', 'Property', '2026-08-19', '2026-08-19', NULL, 'Source link: https://drive.google.com/file/d/1stDidvnIbzLqHHgg_SnW_R1rlLQtR5Pf/view?usp=sharing', '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-94', 'Book Steven Haircut Before 21 August', 'Haircut of Steven should be booked by next week before 21 Aug 2026 - make sure to book tomorrow 14/8/2026', 'Completed', 'High', 'Personal', '2026-08-13', '2026-08-01', NULL, 'Ariana already put', '2026-08-13T00:00:00Z'),
  ('ea-pending-shane-95', 'Process Reimbursement for 15 August 2026', 'Reimbursement for 15/08/2026', 'Completed', 'High', 'Admin', '2026-08-14', '2026-08-10', NULL, 'Checked 10/8/2026 - payment not yet reflecting on the ATO Portal', '2026-08-13T00:00:00Z'),
  ('ea-pending-shane-96', 'Check ATO', 'Check ATO on 14/8/2026', 'Completed', 'High', 'Personal', '2026-08-14', '2026-08-06', NULL, 'Find good timing for  Steven on 26th, Steven will leave EO Meeting early - book on or before 19 aug 

Need OTP from Steven

No available 26th Aug yet', '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-97', 'Book AirPods Apple Store Appointment', 'Book Steven into an Apple Store appointment for his AirPods, noting that they keep disconnecting/turning off. Preferred opportunity is around the 26 Aug city visit, while still getting Steven home by 4:30 pm. If that day doesn''t work, find another suitable city day.

Serial Number: M7F2M23V32', 'Completed', 'Medium', 'Personal', '2026-08-19', '2026-08-14', NULL, 'Coordinating with Hazel

Invloice sent by Hazel

Source link: https://drive.google.com/file/d/1NhvPMGhjt0V32rIIMg0k-etjYEiMPzGo/view?usp=sharing', '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-98', 'Add B2B Pay Option to EO Invoices', 'Make sure each EO invoice includes the B2B Pay payment option so attendees can pay by credit card.', 'Completed', 'High', 'EO Event', NULL, '2026-08-14', NULL, 'Original due date text: Before invoices are sent', '2026-08-20T00:00:00Z'),
  ('ea-pending-shane-99', 'Process Dr Herman Follow-Up Actions and Enbrel Updates', '"Hi Shane. I just finished with Dr. Herman. There are two recordings because the second one was for the appointment. Please put it in my calendar and invite Lynn for that doctor''s appointment so she has it in her calendar as well. She knows that I am coming to Parramatta. I will start taking my Enbrel every two weeks now. Please ask Ariana how to update the Telegram bot that reminds me about taking my Enbrel to the new biweekly schedule."


"You can extract this information from the plot, but it is not urgent. You do not have to complete it today; it can be done by tomorrow. It is not necessary to do it immediately since you may have other priorities. However, please complete it within 48 hours. Once you have extracted the action steps, please log them in Notion and send them to me as well."

when u run transcript plaud for dr herman can u generate mobility 105 mins worth of exercises for me Dr Herman recommended', 'Completed', 'High', 'Personal', '2026-08-20', '2026-08-18', NULL, 'Informed Steven already and added to his calendar 

- Finding near his Nat Body Scan

- Already chose Wine and location (BWS Concord Drive) - Buy Penfold Special Shiraz

Source link: https://drive.google.com/drive/folders/1t5qgILYCC9fNTlP-grw05KSr76D-ONe5?usp=sharing', '2026-08-20T00:00:00Z'),
  ('ea-pending-shane-100', 'Find Penfold Wine Gift for Dane', 'Google Task for Steven to buy gift for Dane - Wine (check if Steven bought already)

"Hi Shane, I didn''t get the gift because we need to first find out where to buy. Can you look up Penfold wines and suggest one that offers good value within the budget? They are usually on sale somewhere. Please find a place where I can buy a nice bottle of Penfold wine in a gift box; I think delivery is too late. Let me know if I am around that place tomorrow." - find nearest to Steven', 'Completed', 'Critical', 'EO Event', '2026-08-11', '2026-08-11', NULL, 'Coordinating with Hazel & Steven

- Sent update of the invoice to Steven by Hazel

- Follow up with Hazel, she said she already sent to their GC with Steven', '2026-08-12T00:00:00Z'),
  ('ea-pending-shane-101', 'Send EO Invoices to Steven for Approval', 'Send every EO invoice to Steven for approval before sending it to attendees.', 'Completed', 'High', 'EO Event', NULL, '2026-08-14', NULL, NULL, '2026-08-19T00:00:00Z'),
  ('ea-pending-shane-102', 'Enbrel Syringe Disposal Container', 'ENBREL SYRINGE

Continue finding the correct supplier/product details for Steven’s syringe - if free, if not, message Steven. 

can u order for me a new enbrel syringe. box (it''s free)

Steven:
"Just one task. Not urgent. Complete within a week."
"I still have one spare, so I can arrive anytime this month."

Continue investigating where Steven''s NBRL syringe is purchased from, including the supplier/product code. Previous searches of email, Notion, SOPs and old records were inconclusive.can u order for me a new enbrel syringe. box (it''s free)

Steven:
"Just one task. Not urgent. Complete within a week."
"I still have one spare, so I can arrive anytime this month."

Continue investigating where Steven''s NBRL syringe is purchased from, including the supplier/product code. Previous searches of email, Notion, SOPs and old records were inconclusive.', 'Completed', 'High', 'Health', '2026-09-01', '2026-08-21', NULL, 'Email sent, waiting for response of Dane - not needed by Dane', '2026-09-01T00:00:00Z'),
  ('ea-pending-shane-103', 'Email Dane About Uber Arrangements', 'Email Dane for Uber arrangements', 'Completed', 'High', 'EO Event', '2026-08-11', '2026-08-11', NULL, 'Steven will do site inspection on Monday 17 Aug', '2026-08-12T00:00:00Z'),
  ('ea-pending-shane-104', 'Check Steven Availability for Beresfield Site Inspection', 'Property Development Email - George - to check Steven availability 50 Enterprise Drive, Beresfield  site inspection', 'Completed', 'Medium', 'Meeting', '2026-08-17', NULL, NULL, NULL, '2026-08-14T00:00:00Z'),
  ('ea-pending-shane-105', 'Check SEO from Dane Meah Call', 'SEO from Dane Meah Call - check', 'Completed', 'Low', 'Operations', '2026-08-14', '2026-08-03', NULL, 'Do not order

Source link: https://drive.google.com/file/d/1DKvUDagsAhMmXKReoXJpugAivsUGsOMI/view?usp=sharing', '2026-08-13T00:00:00Z'),
  ('ea-pending-shane-106', 'Order Panasonic Coin Battery for 132 House', 'Panasonic coin battery (to do Tuesday) - Deliver to 132 HOUSE: Personal AMEX / Linh Qantas', 'Cancelled', 'Medium', 'Personal', '2026-08-17', NULL, NULL, 'Source link: https://drive.google.com/drive/folders/1yFN68pY37v_4XX2HQeaahuar056QxIH7?usp=sharing', '2026-08-17T00:00:00Z'),
  ('ea-pending-shane-107', 'Email Ury Lawyer', 'Email Ury Lawyer', 'Completed', 'Critical', 'Property', '2026-08-20', '2026-08-20', NULL, NULL, '2026-08-20T00:00:00Z'),
  ('ea-pending-shane-108', 'Book Vein Doctor Appointment with Dr Kerdic', 'Appointment of Steven to Vein Doctor (Dr Kerdic) - Booked for 10 Sept 2026', 'Completed', 'Critical', 'Health', '2026-08-13', '2026-07-31', NULL, 'Source link: Referral Letter from Dr Danny.png', '2026-08-10T00:00:00Z'),
  ('ea-pending-shane-109', 'SOP Addition', '"Shane, please add this to the SOP. Next time I get the car washed, I need to bring my car keys because I forgot them today and had to provide access via my phone. Also, remind me to bring my physical Medicare card the next time I get a blood test."

### SOP Checklist – Personal Reminders

🚗 Car Wash

* ☐ Bring physical car keys when taking the car for a wash.
* ☐ Confirm keys are with you before leaving home.

🩸 Blood Test

* ☐ Bring physical Medicare Card to the blood test appointment.
* ☐ Confirm Medicare Card is packed before leaving for the appointment.', 'Completed', 'Low', 'Personal', '2026-08-17', '2026-08-11', NULL, NULL, NULL),
  ('ea-pending-shane-110', 'Appointments', 'Other appointments check next week (haircut, Dr Kerdic etc)', 'Completed', 'Medium', 'Personal', '2026-08-14', '2026-08-07', NULL, NULL, NULL),
  ('ea-pending-shane-111', 'Andrew Meet with Steven', 'Send email to Andrew as Steven', 'Completed', 'Medium', 'Meeting', '2026-08-11', '2026-08-11', NULL, NULL, NULL),
  ('ea-pending-shane-112', 'Follow Up Ruby Lane Breakfast & Lunch Catering', 'Breakfast & Lunch Catering to follow up with Ruby Lane tomorrow (follow up)', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-113', 'Check Nhan Email for Yoppie Daniel Education Bond', 'Check Nhan Email Yoppie Daniel - Education bond', 'Completed', 'Low', 'Personal', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-114', 'Follow Up Jessa on Chion & Steven Rescheduled Meeting', 'Get back to Jessa on Monday for Rescheduled meeting of Chion & Steven', 'Completed', 'Medium', 'Operations', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-115', 'Check WhatsApp for Wednesday City BNI', 'BNI for Wednesday at City, check WhatsApp', 'Completed', 'High', 'Personal', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-116', 'Check Steven Notion Recent GC Message', 'Notion of Steven-check recent message in GC 3/8/2026', 'Completed', 'Medium', 'Personal', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-117', 'Call B2B', 'B2B - call them', 'Completed', 'High', 'Operations', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-118', 'Check Andrew Response for Coffee Meeting', 'Check response from Andrew for Coffee Meeting next week', 'Completed', 'High', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-119', 'Check Kandy Rescheduled Meeting Acceptance', 'Check if Kandy accepted the rescheduled Meeting', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-120', 'Check Luke Boulden Calendar Invite Acceptance', 'Check if Luke Boulden was able to accept the calendar invite', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-121', 'Finalise EO Venue at The Collective Manly', 'Finalisation of EO Venue - The Collective Manly', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-122', 'Review Property Development Email for 20 Collie Street', 'Property Development Email for 20 Collie Street, Fyshwick ACT 2609', 'Completed', 'High', 'Property', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-123', 'Add Joanne and Jasmine to Amplifon Appointment', 'Amplifon - Put on Aug 4 - Add Joanne & Jasmine', 'Completed', 'High', 'Personal', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-124', 'Email Luke About Meeting Availability', 'Email to Luke (Wed/Fri this week / next week)', 'Completed', 'High', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-125', 'Check Steven Internet Provider Messages', 'Check Steven’s Internet Provider (check TG & WhatsApp)', 'Completed', 'Medium', 'Personal', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-126', 'Send Steven Presentation and Agenda for Dane Meeting', 'Send steven presentation & agenda for his meeting with Dane on Friday', 'Completed', 'High', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-127', 'Prepare EO Members Profile Summary', 'Make a summary of EO Members profile (due tomorrow 29 Jul 2026 before lunch send by 9AM PHT) sent already', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-128', 'Change Dane Time in EO Mini Retreat Event Flow', 'Change Dane time for EO Mini Retreat event flow', 'Completed', 'High', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-129', 'Change Imma Meeting Time for Steven Drive Home', 'Change Imma’s meeting time while Steven is driving from EO event to Home', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-130', 'Send Dane Calendar Invite for 31 July 2026', 'Send Dane Calendar Invite for Friday July 31, 2026 (9:30am-10:15am)', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-131', 'Arrange BNI Substitute for Steven', 'BNI Sub for Steven - Wednesday', 'Completed', 'High', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-132', 'Send 10 Commercial Drive Contract to Kris', '10 Commercial Drive Contract - send to Kris', 'Completed', 'High', 'Property', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-133', 'Send Email and Calendar Invite to Hoe Bing', 'Send email & calendar invite to Hoe Bing (Saturday - 5:30am)', 'Completed', 'High', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-134', 'Email Kandy About Rescheduled Meeting', 'Email Kandy - rescheduled meeting', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-135', 'Change Cef Meeting Time', 'Change Cef Meeting Time', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-136', 'Email and Calendar Invite Hoe Bing', 'Email & Calendar invite to Hoe Bing', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-137', 'Confirm Dane Friday Morning Availability', 'Dane availability - prefers Friday morning', 'Completed', 'Medium', 'Meeting', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-138', 'Follow Up Dane Dinner and Presentation Confirmation', 'Dane confirmation for Dinner & Presentation (follow up)', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-139', 'Send Email and Calendar Invite to EO Members', 'Send email & calendar invite to EO Members', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-140', 'Pay 25% Improv Workshop Deposit', 'Pay 25% deposit invoice of improv workshop', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-141', 'Add EO Venue Payment to Steven Google Tasks', 'Add to Steven Google Tasks regarding payment of EO Venue to The Collective Manly via Bank Transfer', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-142', 'Confirm and Lock In Improv Workshop', 'Confirm and lock in Improv Workshop by Monday / Tues (3 / 4 Aug 2026)', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-143', 'Follow Up Barbara Collective Manly Invoice', 'Waiting for Barbara’s invoice for Collective Manly - sent email & sms Friday, follow up on Monday', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-144', 'Complete EO Meal Venue Research', 'Complete breakfast, lunch, and dinner venue research (Ruby Lane, Sake, and other options) Coordinated with Linh as per advised', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-145', 'Lock In EO Venue by Friday', 'Lock in venue by Friday (before 12:00 PM) (31 Jul 2026)', 'Completed', 'Critical', 'EO Event', NULL, NULL, NULL, NULL, NULL),
  ('ea-pending-shane-146', 'Maintain Pending List Tracker', 'Pending list tracker', 'Completed', 'Critical', 'Admin', NULL, NULL, NULL, NULL, NULL)
),
assignee_param AS (
  SELECT '80c63414-5956-4f8f-958a-8cf066dd641d'::uuid AS assignee_user_id
),
normalized AS (
  SELECT
    source_key,
    md5('ea-pending-import:' || source_key)::uuid AS task_id,
    LEFT(TRIM(title), 500) AS title,
    NULLIF(TRIM(description), '') AS description,
    NULLIF(TRIM(status_label), '') AS status_label,
    NULLIF(TRIM(priority_label), '') AS priority_label,
    NULLIF(TRIM(category_label), '') AS category_label,
    NULLIF(TRIM(due_date), '')::date AS due_date,
    COALESCE(NULLIF(TRIM(date_given), '')::date, CURRENT_DATE) AS date_given,
    NULLIF(TRIM(waiting_on), '') AS waiting_on,
    NULLIF(TRIM(notes), '') AS notes_raw,
    NULLIF(
      BTRIM(
        regexp_replace(
          regexp_replace(
            COALESCE(notes, ''),
            '(^|[

])[ 	]*Source link:[^

]*(
?
)?',
            E'\1',
            'gi'
          ),
          '(^|[

])[ 	]*https?://[^\s

)]+[ 	]*(
?
)?',
          E'\1',
          'gi'
        )
      ),
      ''
    ) AS notes,
    COALESCE(NULLIF(TRIM(updated_at), '')::timestamptz, NOW()) AS updated_at
  FROM source_data
),
insert_missing_categories AS (
  INSERT INTO public.pa_task_categories (label, color, is_default, sort_order, created_by)
  SELECT
    n.category_label,
    'zinc',
    false,
    1000 + ROW_NUMBER() OVER (ORDER BY LOWER(n.category_label)),
    ap.assignee_user_id
  FROM (
    SELECT DISTINCT category_label
    FROM normalized
    WHERE category_label IS NOT NULL
  ) n
  CROSS JOIN assignee_param ap
  LEFT JOIN public.pa_task_categories c
    ON LOWER(c.label) = LOWER(n.category_label)
   AND c.deleted_at IS NULL
  WHERE c.id IS NULL
  RETURNING id
),
category_seed_done AS (
  SELECT count(*) AS inserted_count
  FROM insert_missing_categories
),
resolved AS (
  SELECT
    n.*,
    st.id AS status_id,
    pr.id AS priority_id,
    c.id AS category_id
  FROM normalized n
  CROSS JOIN category_seed_done
  JOIN public.pa_task_statuses st
    ON LOWER(st.label) = LOWER(n.status_label)
   AND st.deleted_at IS NULL
  JOIN public.pa_task_priorities pr
    ON LOWER(pr.label) = LOWER(n.priority_label)
   AND pr.deleted_at IS NULL
  LEFT JOIN public.pa_task_categories c
    ON LOWER(c.label) = LOWER(n.category_label)
   AND c.deleted_at IS NULL
),
upsert_tasks AS (
  INSERT INTO public.pa_tasks (
    id, title, description, status_id, priority_id, category_id, assigned_to,
    due_date, date_given, blocker_reason, waiting_on, notes, created_by, created_at, updated_at
  )
  SELECT
    r.task_id,
    r.title,
    r.description,
    r.status_id,
    r.priority_id,
    r.category_id,
    ap.assignee_user_id AS assigned_to,
    r.due_date,
    r.date_given,
    NULL::text AS blocker_reason,
    r.waiting_on,
    NULLIF(
      BTRIM(
        replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                CONCAT_WS(E'\n\n', r.notes, r.description),
                '(^|[\r\n])[ \t]*Source link:[^\r\n]*(\r?\n)?',
                E'\\1',
                'gi'
              ),
              'https?://[^\s)]+',
              '',
              'gi'
            ),
            '\[\s*\]',
            '',
            'g'
          ),
          chr(1),
          ''
        )
      ),
      ''
    ),
    ap.assignee_user_id AS created_by,
    r.date_given::timestamptz AS created_at,
    r.updated_at
  FROM resolved r
  CROSS JOIN assignee_param ap
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
insert_link_attachments AS (
  INSERT INTO public.pa_task_attachments (
    pa_task_id,
    attachment_type,
    title,
    url,
    created_by
  )
  SELECT
    links.pa_task_id,
    'link',
    'Link ' || links.link_order,
    links.url,
    ap.assignee_user_id
  FROM (
    SELECT
      src.pa_task_id,
      src.url,
      ROW_NUMBER() OVER (PARTITION BY src.pa_task_id ORDER BY src.url) AS link_order
    FROM (
      SELECT DISTINCT
        r.task_id AS pa_task_id,
        url_match[1] AS url
      FROM resolved r
      CROSS JOIN LATERAL regexp_matches(
        COALESCE(r.notes_raw, '') || E'\n' || COALESCE(r.description, ''),
        '(https?://[^\s)]+)',
        'g'
      ) AS url_match
    ) src
  ) links
  CROSS JOIN assignee_param ap
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.pa_task_attachments existing
    WHERE existing.pa_task_id = links.pa_task_id
      AND existing.attachment_type = 'link'
      AND existing.url = links.url
      AND existing.deleted_at IS NULL
  )
  RETURNING id
)
SELECT
  (SELECT count(*) FROM resolved) AS resolved_rows,
  (SELECT count(*) FROM upsert_tasks) AS inserted_task_rows,
  (SELECT count(*) FROM insert_link_attachments) AS inserted_link_rows;

COMMIT;
