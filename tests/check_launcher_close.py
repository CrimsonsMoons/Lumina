"""V83.1 verifies browser-safe starter close fallback."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'js/launcher.js').read_text()
h=(root/'index.html').read_text()
checks={
 'browser-owned starter recognized': 'Starter close requires manual action' in s,
 'eligibility conservative': 'window.opener!==null && window.history.length<=1' in s,
 'manual button does not invoke window.close': "launchEvent('Starter close instructions'" in s and 'Manual starter close requested' not in s,
 'no retrying blocked closure': 'no further retries' in s and 'attemptStarterClose(' not in s,
 'workspace preserved': 'blankTabReady(popup)' in s and 'window.close()' in s,
 'clear close action': '>How to close this tab</button>' in h,
 'real keyboard shortcut': 'Ctrl' in h and 'Cmd+W' in s,
}
for name,ok in checks.items():print(('PASS' if ok else 'FAIL')+' '+name)
print('RESULT %d/%d'%(sum(checks.values()),len(checks)))
if not all(checks.values()):raise SystemExit(1)
