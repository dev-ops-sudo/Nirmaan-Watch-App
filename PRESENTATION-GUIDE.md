# Nirmaan Watch demonstration

Open the private hosted site while signed into the owner's account, or double-click `START-NIRMAAN.cmd` and open the Local URL printed in the window. The full-data view needs no local login. Load it before presenting so the dataset is ready.

## Five-minute walkthrough

1. **Overview:** explain that the application contains all 60,359 unique works supplied in 36 state/UT CSVs. Point to recorded allocation and the status breakdown.
2. **All projects:** choose Uttar Pradesh, change status or open More filters for MP, house, category, approval and recommendation dates. Search by work ID, village or authority. Change sorting and move between pages.
3. **Work details:** search `MPLADS-000543`, open the work, and show all 16 original fields plus the source file and row number. Its recorded state is Delhi while its authority refers to Bikaner; the application preserves that distinction.
4. **Reports & insights:** reset filters to show the national totals. Compare categories, IDA approvals, recommendation months, MPs and states. Export the filtered CSV or analysis JSON.
5. **Dataset & sources:** show all 36 file counts and explain the three header-only files. Data review identifies 811 works without a reported status.
6. **Optional workflow demonstration:** use Demo & editable workspace for the separate 25 synthetic projects, map, budget checks and anomaly review. Clearly identify these as synthetic. Authenticated uploads, feedback and editing require the hosted workspace and suitable operational records.

## Exact dataset controls

| Measure | Value |
| --- | ---: |
| Source rows / unique work IDs | 60,359 |
| Source files | 36 |
| Files containing works | 33 |
| Recorded allocation (INR) | 34,982,467,506 |
| Recorded allocation (crore INR) | 3,498.25 |
| Unsanctioned | 50,888 |
| Sanctioned | 6,528 |
| Ongoing | 629 |
| Completed | 1,503 |
| Status not reported | 811 |
| IDA action pending | 38,895 |
| Approved by IDA | 20,107 |
| Rejected by IDA | 1,357 |

Recommendation dates: **26 April 2023 through 4 March 2024**. These are historical recommendation records, not a September 2026 live feed.

## Explain the data accurately

- Allocation is the source `ALLOCATION_AMOUNT`, not spending, releases or an inferred sanctioned budget.
- Work status and IDA approval are distinct fields. Neither pending approval nor missing status is proof of fraud.
- Physical progress, expenditure, contractor awards, site coordinates, milestones and payments are absent. Therefore source records cannot support the existing financial/delay model or verified site markers.
- The original source files remain intact. The bundled source explorer is read-only and separate from the editable operational workspace, whose schema needs additional fields.
- CSV downloads preserve the original columns, with formula-like text escaped for spreadsheet opening.

## Local backup

Keep the launch window open. If port 5173 is already used, Vite prints another Local URL; use that exact URL. The full dataset is bundled with the app. After dependencies are installed, its search and reports do not require an external data service. Stop the server with Ctrl+C when finished.
