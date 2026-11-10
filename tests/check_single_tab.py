"""Source-level checks for the V83.2 no-extra-tab default."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'js'/'launcher.js').read_text(encoding='utf-8')
h=(root/'index.html').read_text(encoding='utf-8')
checks={
 'automatic default goes in place': "if(!directRequested&&!launcherRequested&&autoBlankToggle.checked){\n    showLaunchStatus('Opening Lumina in this tab — no starter or extra tab.');\n    loadWorkspaceInPlace();" in s,
 'no automatic blank popup': "openWorkspaceInBlankTab('automatic')" not in s,
 'default button launches in place': "document.getElementById('launch').addEventListener('click',loadWorkspaceInPlace);" in s,
 'blank popup is opt in': "document.getElementById('openSeparateTab').addEventListener('click',()=>openWorkspaceInBlankTab('manual'));" in s,
 'blank popup button visible': 'id="openSeparateTab">Open separate about:blank tab' in h,
 'auto setting saved separately': "lumina_launcher_seamless_v832" in s,
 'app setting aligned': "Auto-start in this tab:" in s,
 'launcher override still available': "get('launcher')==='1'" in s,
 'browser restrictions documented': 'Chrome may prevent this page from closing' in h,
 'workspace URL tradeoff documented': 'The website address remains visible' in h,
 'old behavior not bound to primary action': 'id="launch">Open about:blank now' not in h,
}
for label,passed in checks.items():print(('PASS' if passed else 'FAIL')+' '+label)
print('RESULT %d/%d'%(sum(checks.values()),len(checks)))
if not all(checks.values()):raise SystemExit(1)
