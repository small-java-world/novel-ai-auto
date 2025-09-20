from pathlib import Path
import re

path = Path('doc/implementation/TASK-071-testcases.md')
text = path.read_text(encoding='utf-8')
cases = re.findall(r"### (TC-071-\d+: [^\n]+)", text)
print('\n'.join(cases))
