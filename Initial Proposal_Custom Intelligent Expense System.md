## **PROJECT PROPOSAL: Custom Intelligent Expense System** 

## **1. System Architecture Overview** 

Instead of a manual spreadsheet or an expensive, complex off-the-shelf software, we propose building a dedicated, lightweight web application. The core engine uses **OCR (Optical Character Recognition)** and a **Large Language Model (AI)** to automate data extraction and preliminary accounting categorization. 

Crucially, the system routes all automated entries to an **Internal Reviewer Checkpoint** for double-entry verification before escalating anomalies to leadership. 

[Staff Uploads Receipt] 

│ 

▼ 

[AI Extracts Data & Suggests Accounts] 

▼ 

[Accounting Intern Review Queue] (Double-Entry Verification) 

▼ 

[Executive Dashboard] (Steven & Miss May: Management by Exception) 

## **2. Core Process & Automation Features** 

## **Step 1: Smart Receipt Upload & AI Extraction (Staff Ingestion)** 

- **How it works:** Staff members simply upload an image or PDF of a receipt/invoice via a mobile or desktop web interface. 

- **The Automation:** The system scans the document using AI to extract the **Vendor Name, Date, Total Amount, and Tax** . 

- **Intelligent Smart-Suggestions:** Using historical ledger memory, the AI automatically drafts a preliminary double-entry mapping. For example, if it recognizes "AWS," it automatically pre-fills a suggested Debit account ( _Software Subscriptions_ ) and Credit account ( _Company Credit Card_ ). 

## **Step 2: The Accounting Intern Verification Checkpoint (Data Gatekeeper)** 

- **How it works:** Staff submissions do not hit the master database or executive dashboard directly. They are held in a secure **Review Queue** for the Accounting Intern. 

- **The Interface:** A fast, split-screen dashboard displaying the original receipt image on one side and the AI's drafted accounting entry on the other. 

- **Your Role (Double-Entry Recording & Classification):** Instead of wasting time on manual data entry, your expertise is utilized to verify the core accounting logic: 

   - **Debit Side Account Verification:** Ensure the AI accurately categorized the transaction to the correct operational expense account (e.g., correcting an error if the AI confused _Office Supplies_ with _Software Subscriptions_ ). 

   - **Credit Side / Payment Source Match:** Confirm the credit entry accurately reflects the true payment method (e.g., _Company Credit Card, Reimbursement Payable, or Petty Cash_ ). 

   - **Tax & Currency Integrity:** Verify that sales tax/VAT components are split into tracking accounts and that foreign currencies cleanly convert to USD based on the transaction date. 

   - **Adjust & Commit:** Modify account classifications or fix typos with a single click. Once you hit **"Verify Entry,"** the system locks the double-entry logic and routes the transaction to the database. 

## **Step 3: Automated Risk Routing (Post-Review Filtering)** 

Once you commit the verified transaction, the system runs a background script to determine how it should be presented to leadership: 

- **Standard Recurring Costs:** If the verified item is a known recurring vendor and matches historical cost baselines, it logs silently as Auto-Approved. 

- **Price Spikes:** If the verified amount is higher than the previous month's average for that vendor, the system flags it in **Yellow** for trend review. 

- **Non-Recurring Expenses:** Unrecognized or one-off costs (e.g., emergency office repairs, client dinners) are flagged in **Red** and require the staff member's business justification notes to unlock. 

## **3. The Executive Dashboard (For Steven & Miss May)** 

Instead of reviewing every single transaction, leadership manages strictly by exception. Because you have already verified the structural data and accounting entry accuracy in Step 2, Steven and Miss May only see three clean, high-level action buckets: 

|**Expense**<br>**Bucket**|**System & Intern Acton**|**Leadership View**|
|---|---|---|
|**Standard**<br>**Recurring**|Verifed by Intern; auto-matched to<br>historical budget baselines.|Archived and logged automatcally.|
|**Price Spikes**|Verifed by Intern; system detected a<br>sudden month-over-month increase.|**Highlighted in Yellow**for quick executve<br>trend review.|



|**Expense**<br>**Bucket**|**System & Intern Acton**|**Leadership View**|
|---|---|---|
|**Non-**|Verifed by Intern; marked as an|**Locked in Red.**Requires an actve|
|**Recurring**|unexpected or one-of cost.|"Approve/Reject" click to release funds.|



