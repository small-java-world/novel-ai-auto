from pathlib import Path
import re
req_text = Path('doc/implementation/TASK-071-requirements.md').read_text(encoding='utf-8')
sections = re.findall(r"REQ-071-\d+", req_text)
print('unique', len(set(sections)))
print('\n'.join(sorted(set(sections))))
