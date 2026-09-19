# 🚀 Tally 24/7 Automated Cloud Sync — Complete Documentation

> **Project:** Automated Real-Time Cloud Synchronization System for Tally Prime  
> **Company:** Smridhi Sponge Limited  
> **Repository:** `xenon110/SSL`  
> **Status:** Production-Ready / Automated 24/7 Background Sync  

---

## 📋 Table of Contents
1. [Executive Summary (What We Are Making)](#1-executive-summary-what-we-are-making)
2. [System Architecture & Data Flow](#2-system-architecture--data-flow)
3. [Key Features & Business Benefits](#3-key-features--business-benefits)
4. [Step-by-Step Setup & Deployment Guide](#4-step-by-step-setup--deployment-guide)
5. [Verification & Health Monitoring](#5-verification--health-monitoring)
6. [Maintenance & Troubleshooting](#6-maintenance--troubleshooting)

---

## 1. Executive Summary (What We Are Making)

### 🎯 Purpose of the System
This project is an **Enterprise 24/7 Automated Cloud Sync Engine** designed to seamlessly bridge **Tally Prime** with a modern **Cloud Database & Executive Web Dashboard**.

### 💡 The Core Problem It Solves
- **Before:** Management and business owners had to request manual reports from accountants or log into local Tally machines directly to view financial health, pending payments, inventory levels, or sales metrics.
- **After:** Every transaction, ledger update, sales entry, stock summary, and outstanding payment made in Tally Prime is **automatically mirrored to the cloud within 30 seconds**. Business owners can securely view real-time financial dashboards on their phone, laptop, or tablet anytime, anywhere—**even when office laptops or personal computers are powered off.**

---

## 2. System Architecture & Data Flow

### 🏗️ Architecture Diagram

```
+-----------------------------------------------------------------------+
|                         AZURE CLOUD VM (24/7)                         |
|                                                                       |
|   +-----------------------+              +------------------------+   |
|   |      Tally Prime      |  HTTP (XML)  |    Tally Sync Agent    |   |
|   |  (Smridhi Sponge Ltd) | ------------>|    (Python Daemon)     |   |
|   |       Port 9000       |              |  (Runs via Scheduler)  |   |
|   +-----------------------+              +-----------+------------+   |
+------------------------------------------------------|----------------+
                                                       |
                                            HTTPS (SSL / TLS 1.3)
                                            Real-Time Batch Sync
                                                       v
                                    +-----------------------------------+
                                    |     Supabase Cloud Database       |
                                    |      (PostgreSQL + Realtime)      |
                                    +------------------+----------------+
                                                       |
                                              REST API / WebSockets
                                                       v
                                    +-----------------------------------+
                                    |     Executive Web Dashboard       |
                                    |   (Live Analytics & Reports)      |
                                    +-----------------------------------+
```

### ⚙️ Component Breakdown (Point-by-Point)

1. **Layer 1: Tally Prime (Data Source - Azure Cloud VM)**
   - Operates as the central accounting software for Smridhi Sponge Limited.
   - Built-in HTTP Server enabled on **Port 9000**.
   - Responds to XML data requests dynamically without manual export steps.

2. **Layer 2: Tally Sync Agent (Background Daemon Engine)**
   - Lightweight Python daemon running continuously inside the Azure VM.
   - Uses **Incremental Sync (`ALTERID`)** to fetch only new or modified vouchers and ledgers, minimizing server load and bandwidth.
   - Performs **data validation** (checking debit/credit balancing and removing duplicate entries) prior to cloud uploading.
   - Archives raw XML payloads to disk (`archive/xml/`) for auditing and debugging.

3. **Layer 3: Supabase Cloud Database (Central Data Hub)**
   - High-performance cloud PostgreSQL database with strict row-level security and Realtime subscriptions.
   - Stores structured tables for Companies, Vouchers, Ledgers, Outstandings (Payables/Receivables), Stock Summaries, and Sync Checkpoints.

4. **Layer 4: Executive Web Dashboard & Analytics UI (Frontend)**
   - Live web application accessible on desktop and mobile browsers.
   - Displays real-time KPIs, Cash Flow, P&L, Balance Sheet summaries, Outstanding dues, and Inventory levels directly sourced from Supabase.

---

## 3. Key Features & Business Benefits

- **⚡ 30-Second Real-Time Synchronization:** Updates reflect on the executive dashboard within seconds of entry in Tally.
- **🔄 Incremental & Resilient Sync:** Uses `ALTERID` checkpoints so only modified records are transferred, preventing duplicate work.
- **🛡️ Auto-Self-Healing & Exponential Backoff:** If internet or Tally restarts, the agent automatically retries at 5s, 15s, and 60s intervals without crashing.
- **🖥️ True 24/7 Autonomy:** Configured via Windows Task Scheduler to run on system boot. Operates independently of user desktop sessions.
- **🔒 Data Security & Validation:** Encrypted TLS HTTPS data transport, environment-isolated credentials, and mathematical integrity checks.

---

## 4. Step-by-Step Setup & Deployment Guide

> **Verification Note:** The steps below cross-verify and match the operational environment setup guide exactly.

### Step 1: Sign in to the Azure VM

1. Launch **Remote Desktop Connection** (`mstsc.exe`) on Windows.
2. Enter the following VM connection details:
   - **Host / IP:** `20.204.5.51:5739`
   - **Username:** `SrvAdmin`
   - **Password:** `$rV@dmiN#12%`
3. Click **Connect**.

---

### Step 2: Ensure Tally Prime HTTP Server is Active

Inside the Azure VM:
1. Open **Tally Prime** and ensure the company **SMRIDHI SPONGE LIMITED** is loaded.
2. Press `F1` (Help) ➔ **Settings** ➔ **Connectivity**.
3. Confirm the configuration options:
   - **Enable HTTP Server:** `Yes`
   - **Port:** `9000`

---

### Step 3: Download & Run the Sync Agent

Inside the Azure VM:
1. Open **Command Prompt** (`cmd`).
2. Execute the following three commands in sequence:
   ```cmd
   git clone https://github.com/xenon110/SSL.git C:\TallySync
   cd C:\TallySync\sync_agent
   run_vm.bat
   ```
3. A command window will execute setup and display:
   ```text
   === DAEMON RUN COMPLETE ===
   Sync Agent daemon started. Syncing every 30 seconds.
   ```

---

### Step 4: Make it Run Automatically 24/7 on Boot (Windows Task Scheduler)

To ensure the sync agent runs continuously 24/7/365 even if the VM restarts or admin logs off:

1. Press `Windows Key + R`, type `taskschd.msc`, and press **Enter** (opens Task Scheduler).
2. Click **Create Basic Task** on the right panel.
3. Set **Name:** `Tally 24/7 Cloud Sync` ➔ Click **Next**.
4. Set **Trigger:** Select `When the computer starts` ➔ Click **Next**.
5. Set **Action:** Select `Start a program` ➔ Click **Next**.
6. Set **Program/script:** Click **Browse** and select `C:\TallySync\sync_agent\run_vm.bat`.
7. Set **Start in (optional):** Type `C:\TallySync\sync_agent`.
8. Click **Finish**.
9. Double-click the newly created task `Tally 24/7 Cloud Sync` in the list:
   - Under **General** tab, select **Run whether user is logged on or not**.
   - Check **Run with highest privileges**.
   - Click **OK** and enter the VM administrator password when prompted.

---

## 5. Verification & Health Monitoring

To confirm that the system is functioning properly:

1. **Check Local Logs inside VM:**
   - Log path: `C:\TallySync\sync_agent\sync_output.txt`
   - Verify timestamped messages such as `[INFO] Sync completed successfully`.

2. **Verify Database Records:**
   - Open the Supabase console dashboard.
   - Inspect tables (`vouchers`, `ledgers`, `outstandings`, `sync_checkpoints`) for recent timestamps.

3. **Verify Executive Dashboard UI:**
   - Add a test voucher or ledger entry in Tally Prime.
   - Wait 30 seconds and refresh the Web Dashboard to verify immediate reflection.

---

## 6. Maintenance & Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Tally connection refused on Port 9000** | Tally Prime is closed or HTTP Server disabled | Reopen Tally Prime, select company `SMRIDHI SPONGE LIMITED`, and verify `F1 -> Settings -> Connectivity -> Enable HTTP Server: Yes`. |
| **Sync agent stopped working** | Environment variables missing or process killed | Run `C:\TallySync\sync_agent\run_vm.bat` manually to inspect error logs. Ensure `.env` file is present. |
| **VM restarted after Windows Update** | Task Scheduler delayed start | Task Scheduler will launch `run_vm.bat` automatically. Allow 1-2 minutes after boot. |

---

> **Prepared for:** Management & Executive Ownership  
> **Technical Stack:** Tally Prime XML HTTP Interface, Python 3, Supabase PostgreSQL Cloud, Windows Server Task Scheduler, Azure Infrastructure.
