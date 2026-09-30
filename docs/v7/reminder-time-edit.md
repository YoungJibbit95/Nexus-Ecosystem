# Reminder time editing

Main and Mobile show a reminder instant in the device's captured IANA time zone, identified in the form. An unchanged displayed minute preserves the exact original timestamp, its precision and its earlier/later occurrence in a repeated local hour. Editing another field cannot shift delivery time.

A changed local time must round-trip in that zone. A clock-change gap rejects saving; a repeated hour requires an explicit earlier/later choice showing its offset. Mobile quick presets use elapsed minutes, including the explicitly labeled +24h and +7 days presets. This form contract does not define civil recurrence or qualify native delivery.

Verification: `node tools/run-reminder-time-browser-smoke.mjs after` renders the real forms in Berlin and New York (44 assertions). `node tools/run-client-tests.mjs --scope core` includes temporal tests for gaps, folds, unchanged precision, fractional-hour transitions and skipped civil days. Before correction, unchanged 09:00:37.123Z saved as 07:00Z in Berlin and 13:00Z in New York in both forms.
