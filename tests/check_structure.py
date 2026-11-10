"""Check Lumina Studio V83 static-hosting file structure and safety defaults."""
from pathlib import Path
import re, sys, zipfile
root=Path(__file__).resolve().parents[1]
expected=[
    'index.html','css/launcher.css','js/config.js','js/launcher.js',
    'workspace/index.html','css/workspace.css','js/app-core.js',
    'js/privacy.js','js/recovery.js','js/library.js',
    'library/blackjack/index.html','library/blackjack/blackjack.css',
    'library/blackjack/storage-bridge.js','library/blackjack/ui-layout.js',
    'library/blackjack/blackjack.js'
]
checks=[]
def check(label,predicate):
    result=bool(predicate);checks.append(result)
    print(('PASS' if result else 'FAIL')+' '+label)
for name in expected:
    check('file '+name,(root/name).is_file())
launcher=(root/'index.html').read_text(encoding='utf-8')
workspace=(root/'workspace/index.html').read_text(encoding='utf-8')
game=(root/'library/blackjack/index.html').read_text(encoding='utf-8')
lib=(root/'js/library.js').read_text(encoding='utf-8')
check('launcher well formed',launcher.strip().endswith('</html>') and '</body>' in launcher)
check('launcher has no bundled workspace', 'const luminaBase64' not in launcher)
is_private='PRIVATE LOCAL COPY' in (root/'README.md').read_text()
config=(root/'js/config.js').read_text()
check('configuration matches package type',("window.LUMINA_PERSONAL_KEY=value;" in config) if is_private else ("window.LUMINA_PERSONAL_KEY='';" in config))
check('launcher assets linked',all(s in launcher for s in ('css/launcher.css','js/launcher.js','js/config.js')))
check('workspace has project-relative base', '<base href="../">' in workspace)
check('workspace scripts modular',all(s in workspace for s in ('js/app-core.js','js/privacy.js','js/recovery.js','js/library.js')))
check('workspace styles linked','css/workspace.css' in workspace)
check('blackjack styles and bridge linked',all(s in game for s in ('blackjack.css','storage-bridge.js')))
check('library uses a separate sandboxed URL',"frame.src=gameURL" in lib and 'srcdoc=' not in lib)
check('saved state whitelist present',all(s in lib for s in ('lumina-blackjack-v1', 'lumina-blackjack-v1-labor-progress-v10')))
check('sandbox does not grant same origin',bool(re.search(r'<iframe[^>]+id="v82BlackjackFrame"[^>]*sandbox="(?:(?!allow-same-origin)[^"])*"',workspace,re.S)))
print(f'RESULT {sum(checks)}/{len(checks)}')
sys.exit(0 if all(checks) else 1)
