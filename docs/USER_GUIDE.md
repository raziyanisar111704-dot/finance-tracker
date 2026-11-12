# Finance Tracker: user guide

How to use every part of the app, on a phone, tablet or computer.

**Live site:** https://finance-tracker-swart-psi.vercel.app

Your data is stored online in your account, so anything you add on your phone appears on your computer and the other way round. The app never asks for, and must never be given, bank passwords, card numbers, PINs or CVVs. It only records amounts, dates, categories and your own notes.

> **In a hurry?** The app has a built-in **Quick guide**: eight short steps, each with a button that takes you there. **Take the tour** (on the guide page, and on the Dashboard of a new account) shows the same steps one at a time.
> - On a phone: the **?** at the top right.
> - On a computer: **Quick guide** in the left menu.
> - Also in Settings, and on the Dashboard of a new account.
>
> This document is the full manual.

---

## Contents

1. [Getting started](#1-getting-started)
2. [Install it on your phone or computer](#2-install-it-on-your-phone-or-computer)
3. [The screens at a glance](#3-the-screens-at-a-glance)
4. [Adding, editing and deleting transactions](#4-adding-editing-and-deleting-transactions)
5. [Finding transactions](#5-finding-transactions)
6. [Dashboard](#6-dashboard)
7. [Budgets](#7-budgets)
8. [Reports, CSV download and printing](#8-reports-csv-download-and-printing)
9. [Importing transactions from a CSV file](#9-importing-transactions-from-a-csv-file)
10. [Categories](#10-categories)
11. [Settings](#11-settings)
12. [Backups: please read](#12-backups-please-read)
13. [How the numbers are calculated](#13-how-the-numbers-are-calculated)
14. [Questions and problems](#14-questions-and-problems)

---

## 1. Getting started

1. Open the site and choose **Create account**.
2. Enter your name, email and a password of **10 to 64 characters**. A short sentence is easy to remember and hard to guess, for example *"mango chai at 7 on sunday"*.
3. **Save the password in a password manager** (Google Password Manager, Apple Passwords, Bitwarden…). If you do forget it, use **Forgot password?** on the login page (see [section 14](#14-questions-and-problems)).
4. You are taken to the **Dashboard**. Your account already has 17 ready-made categories (Groceries, Rent & Housing, Salary, …).
5. Go to **Settings** once and check:
   - **Currency** (default ₹ INR) and **Time zone** (default India). The time zone decides what "today" and "this month" mean.
   - **Opening balance**: the money you have when you start using the app, so the balance is right from day one. It can be negative (for example a credit-card balance or a loan).

> **Pick the currency once.** Changing it later doesn't convert existing amounts; it only changes how they are shown.

---

## 2. Install it on your phone or computer

The app can be installed like a normal app: its own icon, full screen, no address bar.

| Device | How |
|---|---|
| **Android (Chrome, Edge, Samsung Internet)** | **Settings → Install app**, or the browser's ⋮ menu → *Install app* / *Add to Home screen* |
| **iPhone / iPad** | Must be done in **Safari**: **Share** (square with an arrow) → **Add to Home Screen** → **Add** |
| **Windows / Mac (Chrome or Edge)** | **Settings → Install app**, or the install icon at the right end of the address bar |

After installing:

- **Android shortcuts:** long-press the icon for **Add transaction** (opens the add form directly) or **Budgets**.
- **Without internet** the app still opens and shows *"You're offline. Your data will load as soon as you reconnect."* It loads by itself when the connection returns. Your data is deliberately **not** stored on the phone, so you can't view or add transactions while offline.
- **Updates are automatic.** The newest version loads whenever you're online, so you never need to reinstall.

---

## 3. The screens at a glance

On a phone the menu is the bar at the **bottom**; on a computer it's the **left** side.

On a computer, **Collapse sidebar** (near the bottom of the left menu) shrinks the menu to a narrow strip of icons and gives the page more room. Hover an icon to see its name, and press the same button (now **Expand sidebar**) to open it again. The app remembers your choice on that device.

| Screen | What it's for |
|---|---|
| **Dashboard** | This month at a glance: balance, income, spending, savings, budget warnings, charts, recent transactions |
| **Transactions** | Every income and expense: add, edit, delete, search, filter, import |
| **Budgets** | Monthly spending limits per category, and how much is left |
| **Reports** | Any month, year or date range: totals, trends, categories, payment methods; download CSV; print |
| **Settings** | Profile, install, appearance (light/dark), categories, quick guide, your data (export, import), sessions, delete account |
| **Quick guide** (? on phones) | The first steps, in order, with a button to each place |

A **new account** also sees a *Welcome* card on the Dashboard with **Take the tour** (the steps one at a time: Next, Back, Esc to close) and **Open the quick guide**. It disappears after your first transaction, or when you press **Hide**.

The ☀/🌙 button (top right on phones, at the bottom of the left menu on computers, and in Settings → Appearance) switches **Light**, **Dark** or **System** (follow the device).

---

## 4. Adding, editing and deleting transactions

**Add:** on a phone tap the round **+** button (bottom right); on a computer use **Add transaction** on the Transactions page.

| Field | Notes |
|---|---|
| **Expense / Income** | Choose first: it decides which categories are offered |
| **Amount** | Type `250`, `99.50` or `1,23,456.78`. Use a **dot** for decimals. `12,5` is refused on purpose (it's unclear whether you meant 12.5 or 125). No minus signs: the Expense/Income switch decides the direction |
| **Category** | Only categories of the chosen type appear |
| **Date** | Defaults to today (in your time zone) |
| **Payment method** | Cash, Debit card, Credit card, UPI, Bank transfer, Wallet, Other |
| **Notes** | Optional, up to 500 characters. Searchable later, so "Swiggy dinner with Riya" is better than "food" |
| **Recurring** | A tag for regular payments (rent, salary). It doesn't create future transactions automatically (planned) |

**Edit:** tap (phone) or click (computer) a transaction in the list, change it, then **Save**.

**Delete:** open the transaction and choose **Delete**. This can't be undone.

> **Moving money to savings or investments?** Record it as an **expense** in the **Savings** or **Investments** category. The app counts it as *saved*, not *spent* (see [section 13](#13-how-the-numbers-are-calculated)).

---

## 5. Finding transactions

On the **Transactions** page:

- **Search** looks in the notes (for example `swiggy`).
- **Filters:** type, category, payment method and a date range, with quick choices such as *This month* and *Last 30 days*.
- Totals at the top always cover **all** matching transactions, not just the 20 on the current page.
- Filters are saved in the page address, so you can bookmark a view (for example "Dining this year"), refresh, or press Back without losing them.

Selecting a category on the Dashboard or in Reports opens this page already filtered to it.

---

## 6. Dashboard

- **Balance:** opening balance + all income − all expenses up to today.
- **Income, Spending, Saved** for the month, with the change from the previous month.
- **Budget alerts** for categories at 80% or more of their budget.
- **Income and spending, last 6 months:** select a month to see its numbers. Switch between **Chart** and **Table**.
- **Spending by category** for the month: select one to see its transactions.
- Use the **‹ month ›** arrows to look at earlier months.

---

## 7. Budgets

1. Open **Budgets** and choose the month. You can plan up to **next** month.
2. **Add budget**: pick an expense category and a monthly limit.
3. Each budget shows *spent*, *left* and a bar:
   - **Warning** (amber) from **80%** of the limit.
   - **Over budget** (red) above **100%**.
4. **Copy *October*'s budgets** (named after the previous month) creates this month's budgets from last month's in one step. Budgets that already exist are kept.

Budgets count every expense in that category dated within that month, whether you added it by hand or imported it.

---

## 8. Reports, CSV download and printing

**Reports** has three views:

| View | Shows |
|---|---|
| **Month** | One month (‹ › to move) |
| **Year** | One calendar year, with a month-by-month section (select a month to open it) |
| **Custom** | Any range: set **From** and **To** |

Each view shows the totals, spending by category, income by category, savings & investments and payment methods.

- **Download CSV:** the transactions of the period on screen, as a file that opens in Excel or Google Sheets.
- **Print:** prints a clean version of the report: no menus or buttons, a heading with your name, the period and the print date, always in light colours, and the month-by-month chart as a table.
  - **To save as a PDF**, choose **Save as PDF** (or *Microsoft Print to PDF*) as the printer.
  - On a phone the Print button opens the phone's print/share sheet, where you can also save a PDF.
  - Under **More settings**, turn on **Background graphics** if the coloured bars are missing.

---

## 9. Importing transactions from a CSV file

Use this to bring in past transactions: a **bank statement**, a spreadsheet, or a CSV downloaded from this app. Open **Transactions → Import CSV** or **Settings → Your data → Import from CSV**.

**The file stays on your device** while you check it. Nothing is saved until you press **Import**.

### Step 1: choose the file

- Must be **CSV** (`.csv`), up to **1 MB** and **2,000 rows**. Split bigger statements into parts (for example 3 months each).
- **From your bank:** in net banking open the account statement, choose the period and download it as **CSV** (some banks call it "Excel" or "delimited"). If you only get an Excel file (`.xls`/`.xlsx`), open it in Excel and use **File → Save As → CSV UTF-8**. PDF statements can't be read.
- Account details at the top of a bank file (name, account number) are skipped automatically.

### Step 2: match the columns

The app guesses which column is which, and recognises this app's own export exactly. Check each item and change any it got wrong; choose **Not in this file** for columns the file doesn't have.

| Item | Typical column names |
|---|---|
| **Date** (required) | Date, Txn Date, Transaction Date |
| **Description / notes** | Narration, Description, Particulars, Remarks |
| **Amount (one column)**, or | Amount, Amount (INR): minus signs, `(1,200.00)` and `Dr`/`Cr` are understood |
| **Debit** and **Credit** columns | Withdrawal Amt., Deposit Amt., Debit, Credit |
| **Type** | Type, Dr/Cr |
| **Category**, **Payment method** | Mostly from this app's own export |

Then check two choices:

- **"A date like 05/11/2026 means"**: **5 Nov (day first)** for Indian and British banks, *May 11 (month first)* for American ones. The app picks this for you when a date such as 13/05 proves the order, and warns you if you choose the other one.
- **"Amounts without a minus sign or Dr / Cr are"**: asked only for a single amount column with no type. Choose *Money spent* for a credit-card statement, or check what your bank uses.

The line **"Row 6 reads as: …"** shows how the first row will be understood. If that looks right, choose **Review rows**.

### Step 3: review

- **Ready / Possible duplicates / With problems / Skipped** counts.
- **Possible duplicate:** a transaction with the same date, type and amount already exists in your account. These rows start **unticked**, so importing the same statement twice doesn't double your spending. Tick one if it really is a separate payment (two ₹50 teas on the same day).
- **With problems:** for example *"Row 9: '31/11/26' isn't a real date."* The row number is the line in the file. These rows are left out; fix them in the file and import it again (the rows already imported will show as duplicates).
- **Skipped:** rows without an amount, such as "Opening balance".
- **Categories:** a category name in the file is matched to your categories (ignoring capitals). Everything else gets the default you choose (**Category for expenses** / **for income**; *Other* and *Other Income* to start). You can change any row's category.
- **Payment method** is taken from the file, or recognised from the bank description: UPI…, NEFT/IMPS/RTGS… (bank transfer), ATM… (cash). Otherwise it's *Other*.
- The total of the ticked rows is shown next to **Import N transactions**.

### After importing

*"Imported N transactions"* with:

- **View transactions**
- **Import another file**
- **Undo this import**: removes exactly the rows of this import and nothing else, including any edits you made to them since. Undo is offered on this screen only; later, delete rows one by one.

If anything is wrong in the request, **nothing** is saved (all or nothing) and the problem rows are listed. You can import up to **20 files an hour**.

---

## 10. Categories

**Settings → Categories**

- **Add** a category: name, expense or income, icon and colour. Tick **Counts as savings** for categories like an emergency fund or mutual funds: money put there is counted as *saved*, not *spent*.
- **Edit** to rename it or change its icon or colour. Past transactions follow the change.
- **Archive** hides it from forms but keeps it in history and reports. Bring it back any time with the **Restore** button (same place).
- **Delete:** if it has transactions, you choose another category to **move them to** first (the default is *Other*). Its budgets are removed.

---

## 11. Settings

| Section | What you can do |
|---|---|
| **Install the app** | Install button, or the steps for your device. Hidden once installed |
| **Account** | Name, currency, time zone, opening balance. The email can't be changed yet |
| **Appearance** | Light, Dark or System |
| **Categories** | See [section 10](#10-categories) |
| **Your data** | Download all transactions (CSV), Download backup (JSON), Import from CSV |
| **Sessions** | **Log out**, or **Log out of all devices** (for example after using a shared or lost phone) |
| **Delete account** | Permanently deletes your account and **all** its data after you type your password. Download a backup first |

There is no "change password" screen yet. To change it, log out and use **Forgot password?** on the login page.

---

## 12. Backups: please read

The free database plan has **no automatic backups**. If the database were lost or damaged, only your own downloads could bring the data back.

**Once a month (and before any big change):**

1. **Settings → Your data → Download backup (JSON)**: a complete copy of categories, transactions and budgets.
2. **Download all transactions (CSV)**: readable in Excel, and can be imported again.
3. Keep both somewhere safe, such as Google Drive, OneDrive or an external drive. They contain your financial history, so don't share them.

**To restore transactions** into a new or empty account, import the CSV ([section 9](#9-importing-transactions-from-a-csv-file)). Categories are matched by name: create any custom categories first, or the rows get the default category. Budgets have to be added again (or ask a developer to restore them from the JSON backup).

---

## 13. How the numbers are calculated

| Number | Meaning |
|---|---|
| **Income** | All income in the period |
| **Spending** | Expenses **not** in a savings category (Savings, Investments, or any category marked *Counts as savings*) |
| **Saved** | Income − Spending, i.e. everything you didn't spend (including money moved into savings categories). Can be negative |
| **Savings rate** | Saved ÷ Income, as a percentage |
| **Balance** | Opening balance + all income − all expenses (savings transfers included) up to today, or up to the end of the month you're viewing |
| **Budget %** | Spent in that category in that month ÷ the limit. Warning from 80%, over above 100% |

All amounts are stored as whole paise, so totals are always exact (no rounding errors).

---

## 14. Questions and problems

| Problem | What to do |
|---|---|
| **"Too many attempts"** at log-in | 10 wrong tries lock that email (and that network) for up to 15 minutes. Wait, then try again carefully |
| **Forgot the password** | Login page → **Forgot password?** → enter your email → open the link in the email (check **Spam**; it works once, for 30 minutes; only the newest email works) → choose a new password. Every device is logged out, and you get a "password was changed" email. If it says *"not set up"*, the site owner can use `npm run reset-password` ([MAINTENANCE.md](MAINTENANCE.md#reset-a-forgotten-password)) |
| **"Your password was changed" email you didn't expect** | Someone with access to your email reset it. Secure your email account, then use **Forgot password?** yourself |
| **"You're offline"** / "Can't reach the server" | Check Wi-Fi or mobile data. The app loads by itself when the connection returns |
| **The first load of the day is slow** (a few seconds) | Normal for the free hosting: the server "wakes up". Later requests are fast |
| **Amount refused** | Use a dot for decimals, no minus sign, and at most 2 decimals |
| **A transaction is in the wrong month** | Check its **date**, and your **time zone** in Settings |
| **Import: wrong dates** (e.g. 5 Nov read as 11 May) | Go **Back to columns** and switch "A date like 05/11/2026 means" |
| **Import: everything is income (or expense)** | Check the Debit/Credit columns, or the "Amounts without a sign are" choice |
| **Import: "spreadsheet file, not a CSV"** | In Excel: File → Save As → **CSV UTF-8** |
| **Strange symbols in imported notes** | Save the file again as **CSV UTF-8** |
| **Print has no coloured bars** | In the print dialog: More settings → **Background graphics** |
| **No "Install app" option** | iPhone: use **Safari** → Share → Add to Home Screen. Otherwise use the browser menu. Private/incognito windows can't install |
| **Something looks wrong after an update** | Close every tab or the installed app, open it again, and refresh (Ctrl+F5 on a computer) |
| **Lost or shared a phone that was logged in** | On another device: **Settings → Log out of all devices** |
