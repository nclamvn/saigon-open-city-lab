from html.parser import HTMLParser
from pathlib import Path
import datetime
import json
import re


ROOT = Path(__file__).resolve().parents[1]


class IndexAudit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.scripts = []
        self.stylesheets = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"].split("?", 1)[0])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.stylesheets.append(attrs["href"].split("?", 1)[0])


index = (ROOT / "index.html").read_text()
app = (ROOT / "app.js").read_text()
cinematic = (ROOT / "cinematic-night-12.js").read_text()
shell = (ROOT / "demo-shell.js").read_text()
css = (ROOT / "style.css").read_text()
audit = IndexAudit()
audit.feed(index)

assets = audit.scripts + audit.stylesheets
checks = {
    "static_ids_are_unique": len(audit.ids) == len(set(audit.ids)),
    "referenced_assets_exist": all((ROOT / asset).is_file() for asset in assets),
    "demo_shell_loads_last": audit.scripts[-1] == "demo-shell.js",
    "cache_version_is_demo_build": all(token in index for token in [
        "style.css?v=15b", "app.js?v=16d", "reality-enrichment-13.js?v=16c", "demo-shell.js?v=15b"
    ]),
    "invalid_views_fail_safely": "if(!p)return false" in app,
    "map_keys_pause_behind_overlays": all(token in app for token in [
        "dialog[open]", "ui-views-open", "ui-controls-open", "ui-info-open"
    ]),
    "drawers_expose_accessible_state": all(token in cinematic for token in [
        "aria-expanded", "aria-controls", "window.cityUi"
    ]),
    "every_hud_can_collapse": "if(h.querySelector('.hud-collapse'))return" in cinematic,
    "presenter_mode": all(token in shell for token in [
        "presenter-clean", "setPresenterMode", "presenterExit"
    ]),
    "demo_shortcuts": all(f"key === '{key}'" in shell for key in ["h", "f", "0", "escape"]),
    "fullscreen_is_user_triggered": "requestFullscreen" in shell and "demoFullscreen" in shell,
    "active_view_updates_url": "history.replaceState" in shell and "aria-current" in shell,
    "comprehensive_demo_defaults_to_overview": all(token in shell for token in [
        "isDemoEntry", "!query.has('view')", "data-view=\"overview\""
    ]),
    "requested_view_applies_without_splash_delay": "?.click(),80)" in cinematic,
    "brand_is_city_lab_only": '<div class="brand"><span>CITY LAB</span></div>' in index
    and 'class="symbol"' not in index
    and "OPEN CITY LAB" not in index,
    "reduced_motion_supported": "prefers-reduced-motion:reduce" in css and "prefers-reduced-motion: reduce" in shell,
    "touch_targets_supported": "(pointer:coarse)" in css and "min-height:44px" in css,
    "presenter_hides_overlays": "body.presenter-clean #uiDock" in css and "body.presenter-clean .map-hud" in css,
    "three_persistent_dock_controls": len(re.findall(r'data-panel="(?:views|controls|info)"', cinematic)) == 3,
}

result = {
    "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "status": "PASS" if all(checks.values()) else "FAIL",
    "checks": checks,
    "declared": {
        "presentation_shortcuts": ["H", "F", "0", "Escape"],
        "navigation_shortcuts": ["Arrow/WASD", "Q/E", "+/-"],
        "persistent_dock_buttons": 3,
    },
}
(ROOT / "research" / "demo-ready-validation.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2)
)
print(json.dumps(result, ensure_ascii=False, indent=2))
if result["status"] != "PASS":
    raise SystemExit(1)
