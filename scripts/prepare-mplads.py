"""Rebuild the bundled dataset without changing or discarding any source field."""
import csv
import hashlib
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'public' / 'data'
out.mkdir(parents=True, exist_ok=True)
columns = 'WORK_ID,MP_NAME,HOUSE,STATE,CONSTITUENCY,CITY,WARD,BLOCK,VILLAGE,WORK_CATEGORY,WORK_DESCRIPTION,IMPLEMENTING_AUTHORITY,RECOMMENDED_DATE,IDA_APPROVAL,ALLOCATION_AMOUNT,STATUS'.split(',')
rows, files, seen = [], [], set()
for path in sorted((ROOT / 'data' / 'source').glob('*.csv')):
    with path.open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        assert reader.fieldnames == columns, f'Unexpected columns: {path.name}'
        records = list(reader)
    for line, record in enumerate(records, 2):
        assert None not in record and all(v is not None for v in record.values()), f'Malformed row: {path.name}:{line}'
        assert record['WORK_ID'] and record['WORK_ID'] not in seen, f'Duplicate or missing ID: {path.name}:{line}'
        seen.add(record['WORK_ID'])
        amount = Decimal(record['ALLOCATION_AMOUNT'])
        assert amount.is_finite() and amount >= 0, f'Invalid allocation: {path.name}:{line}'
        rows.append([record[k] for k in columns] + [path.name, line])
    files.append({'name': path.name, 'state': records[0]['STATE'] if records else path.stem.removeprefix('MPLADS_').replace('_', ' ').title(), 'rows': len(records), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
assert len(files) == 36, 'Expected all 36 state/UT files'
manifest = {'source': 'MPLADS_STATEWISE_ALL_INDIA.zip', 'columns': columns, 'recordCount': len(rows), 'files': files, 'allocationTotal': str(sum((Decimal(r[14]) for r in rows), Decimal(0))), 'statusCounts': dict(Counter(r[15] or 'Not reported' for r in rows)), 'recommendedFrom': min(r[12] for r in rows), 'recommendedTo': max(r[12] for r in rows), 'missingStatus': sum(not r[15] for r in rows)}
(out / 'mplads.json').write_text(json.dumps({'columns': columns, 'rows': rows}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
(out / 'mplads-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in manifest.items() if k not in ('files', 'columns')}, indent=2))
