from pathlib import Path
root=Path(__file__).resolve().parents[1]
h=(root/'index.html').read_text()
s=(root/'js/launcher.js').read_text()
assert 'Launch Lumina in about:blank' in h
assert "getElementById('launch').addEventListener('click',()=>openWorkspaceInBlankTab('manual'))" in s
assert "getElementById('openInTab').addEventListener('click',loadWorkspaceInPlace)" in s
assert "localStorage.getItem(AUTO_START_PREF)==='1'" in s
assert "const AUTO_START_PREF='lumina_launcher_auto_blank_v833'" in s
assert "openWorkspaceInBlankTab('automatic')" in s
assert "const launcherRequested=new URLSearchParams(location.search).get('launcher')==='1'" in s
assert 'Starter close requires manual action' in s
assert 'window.opener!==null && window.history.length<=1' in s
assert 'Lumina V83.3' in h
assert 'Start Lumina — no extra tab' not in h
print('V83.3 launcher structure: 10/10 passed')
