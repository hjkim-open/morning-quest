#!/usr/bin/env python3
"""ES 모듈 소스를 아티팩트용 단일 HTML(dist/artifact.html)로 번들한다."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_ORDER = ['clock.js', 'state.js', 'timeline.js', 'effects.js', 'stats.js', 'ui.js', 'app.js']

EFFECTS_NAMESPACE = (
    "const effects = { unlockAudio, playBeep, playSiren, playFanfare, "
    "playFailSound, playPraise, confetti, stopConfetti, flashRed };\n"
)


def strip_module_syntax(src: str) -> str:
    # 여러 줄 import 포함 전체 제거 (첫 ';'까지)
    src = re.sub(r'^import\b[^;]*;', '', src, flags=re.M)
    src = re.sub(r'^(\s*)export\s+', r'\1', src, flags=re.M)
    return src


def main():
    css = (ROOT / 'style.css').read_text(encoding='utf-8')

    js_parts = []
    for name in JS_ORDER:
        code = strip_module_syntax((ROOT / 'js' / name).read_text(encoding='utf-8'))
        js_parts.append(f'// ===== {name} =====\n{code}')
        if name == 'effects.js':
            js_parts.append(EFFECTS_NAMESPACE)
    js_bundle = '\n\n'.join(js_parts)

    # index.html의 body 마크업 재사용 (manifest/sw 관련 제외, 모듈 스크립트 제외)
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    body = html.split('<body>')[1].split('</body>')[0]
    body = body.replace('<script type="module" src="js/app.js"></script>', '')

    artifact = f"""<meta charset="UTF-8">
<title>아침 퀘스트</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
<style>
{css}
</style>
{body}
<script>
// 엄마 목소리 데이터 URI를 여기에 넣으면 칭찬 목소리로 재생됩니다.
// 예: window.PRAISE_DATA_URIS = ['data:audio/mpeg;base64,....'];
window.PRAISE_DATA_URIS = [];
</script>
<script>
{js_bundle}
</script>
"""
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    (dist / 'artifact.html').write_text(artifact, encoding='utf-8')
    print(f"built: {dist / 'artifact.html'} ({len(artifact)} bytes)")


if __name__ == '__main__':
    main()
