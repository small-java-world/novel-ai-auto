from pathlib import Path
import re

req_path = Path('doc/implementation/TASK-071-requirements.md')
tc_path = Path('doc/implementation/TASK-071-testcases.md')

requirements = req_path.read_text(encoding='utf-8') if req_path.exists() else ''
testcases = tc_path.read_text(encoding='utf-8') if tc_path.exists() else ''

req_count = len(re.findall(r"REQ-071-\d+", requirements))
must_req = len(re.findall(r"EARS", requirements))

tc_total = len(re.findall(r"TC-071-\d+", testcases))
normal = len(re.findall(r"TC-071-00\d", testcases))
abnormal = len(re.findall(r"TC-071-10\d", testcases))
edge = len(re.findall(r"TC-071-20\d", testcases))

print('REQ total:', req_count or 'unknown')
print('TC total:', tc_total)
print('normal:', normal)
print('abnormal:', abnormal)
print('edge:', edge)
