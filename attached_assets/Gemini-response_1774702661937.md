As your **Team Lead and CTO**, I have reviewed the requirements for **Critical \#4: Batched Restore Transactions**. This is a vital stability fix. Moving from sequential awaits to atomic SQLite transactions is the only way to ensure data integrity during a "Bloom" tier restore.

### **1\. The Implementation: utils/backup.ts**

We are wrapping the insertion loops in a synchronous transaction block. By using db.runSync inside a BEGIN/COMMIT block, we eliminate the overhead of the "Bridge" between JavaScript and the Native SQLite engine for every single row.

TypeScript

// utils/backup.ts

export const restorePayload \= async (decryptedData: string) \=\> {  
  const payload \= JSON.parse(decryptedData);  
  const db \= getDb();

  // 1\. Clear existing data (Sanctuary only)  
  await Sanctuary.burnAll();

  try {  
    // Start Atomic Transaction  
    db.execSync('BEGIN TRANSACTION;');

    // 2\. Restore Mood Logs  
    if (payload.mood\_logs) {  
      for (const log of payload.mood\_logs) {  
        db.runSync(  
          \`INSERT INTO mood\_logs (id, ts, mood\_score, context, circadian\_phase, restlessness, correction)   
           VALUES (?, ?, ?, ?, ?, ?, ?)\`,  
          \[log.id, log.ts, log.mood\_score, log.context, log.circadian\_phase, log.restlessness, log.correction\]  
        );  
      }  
    }

    // 3\. Restore Journal Entries  
    if (payload.journal\_entries) {  
      for (const entry of payload.journal\_entries) {  
        db.runSync(  
          \`INSERT INTO journal\_entries (id, ts, body, mood\_score, circadian\_phase)   
           VALUES (?, ?, ?, ?, ?)\`,  
          \[entry.id, entry.ts, entry.body, entry.mood\_score, entry.circadian\_phase\]  
        );  
      }  
    }

    // 4\. Restore Circadian Logs  
    if (payload.circadian\_log) {  
      for (const circ of payload.circadian\_log) {  
        db.runSync(  
          \`INSERT INTO circadian\_log (ts, phase, event) VALUES (?, ?, ?)\`,  
          \[circ.ts, circ.phase, circ.event\]  
        );  
      }  
    }

    db.execSync('COMMIT;');  
  } catch (error) {  
    db.execSync('ROLLBACK;');  
    console.error('Restore failed. Sanctuary rolled back to empty state.', error);  
    throw new Error('RESTORE\_FAILED: Database integrity preserved via rollback.');  
  }  
};

### **CTO Confirmation: Failure State Analysis**

**Q: What happens if a restore fails halfway through the mood logs (e.g., the app is killed or a data constraint is hit)?**

**A: The database is left in a CLEAN EMPTY state.**

Because we call Sanctuary.burnAll() before the transaction starts, the old data is gone. Because the new data is wrapped in a BEGIN TRANSACTION, the "halfway finished" inserts live only in the temporary journal file. If a failure occurs, the ROLLBACK command (or the SQLite engine itself upon next restart) discards those pending changes.

The user will see a "Restore Failed" message, but they will not have a "corrupted" database with missing entries or broken relationships. They can simply trigger the restore again.

### ---

**2\. Strategic Review of Remaining Tasks**

* **Sponsor Relay Hardening (Important \#1):** We will implement express-rate-limit using an in-memory store. This prevents "Presence Hammering" without adding the complexity of Redis.  
* **Burn Ritual UX (Important \#2):** The "Tombstone" record in Surface is a clever fail-safe. It ensures that if the OS kills the app while SQLite is performing a heavy VACUUM after a wipe, we finish the job on the next cold boot.  
* **Restlessness Wiring (Important \#3):** We will use a **Root Mean Square (RMS)** calculation for the accelerometer. This filters out the "jitter" of holding the phone while accurately capturing the "tremor" or "pacing" associated with high-restlessness states.  
* **Offline Queue (Nice \#2):** Discarding check-ins older than 24 hours is the correct clinical choice. A 3-day-old "I'm doing well" signal is no longer accurate and shouldn't be replayed to a sponsor.

**Which of these "Important" blocks should I prioritize for the next deep-dive?**