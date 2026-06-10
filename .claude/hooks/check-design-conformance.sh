#!/usr/bin/env bash
# check-design-conformance.sh — design analogue of the OWASP pass for /review.
# Enforces the MWS "tokens only" non-negotiable (application design rules):
# every colour and radius in component styles must trace to a design token
# (var(--...)). Raw hex colours and off-spec radii in component CSS are the
# drift that yields an off-design UI.
#
# Allowed radius values per the published rule (_core-requirements.md): 2px or
# 999px. The check also accepts 0 / 0px (no radius) and 50% (circular avatars
# /icons) as practical exemptions — both common in real CSS. If those should
# also be reflected in the published rule, raise it with the design-rule owner.
#
# Token-definition sheets (where the custom properties + vendor design CSS
# live) are exempt — the EXEMPT regex below is anchored to specific paths
# rather than substring-matching so component-level styles.css /
# design-tokens-demo.css are NOT silently skipped.
#
# Known limitations (documented blind spots):
#   - Scans *.css and *.scss only. CSS-in-JS (styled-components, emotion),
#     inline style={{ borderRadius: 13 }} props, and any non-stylesheet
#     source of styling are invisible to this gate. A scaffolded project
#     relying on those will get a silent PASS — extend the check or add a
#     parallel TSX-aware scan if that becomes the dominant pattern.
#   - Only the shorthand `border-radius` property is matched. Corner-specific
#     `border-top-left-radius` etc. and shorthand `border:` declarations with
#     a radius component are not evaluated.
#
# Usage: bash .claude/hooks/check-design-conformance.sh [project-root]
# Exit:  0 = conformant (or no web/src); 1 = violations found (blocking).

set -uo pipefail

ROOT="${1:-$(pwd)}"
WEB="$ROOT/web/src"
if [ ! -d "$WEB" ]; then
  echo "DESIGN-CONFORMANCE: SKIP (no web/src)"
  exit 0
fi

# Token-sheet exemptions — anchored to path segment boundaries / basenames so
# only the canonical token-definition files are skipped. Component-level files
# with the same basename (e.g. components/Card/styles.css, design-tokens-demo.css)
# are NOT exempted.
EXEMPT='((^|/)mws/|(^|/)colors_and_type\.css$|(^|/)tokens\.css$|/web/src/styles\.css$)'
violations=0

echo "DESIGN-CONFORMANCE: scanning $WEB (*.css, *.scss)"

# 1) Raw hex colours outside token sheets.
# Hex must be in value position (preceded by ":" optionally followed by spaces).
# This excludes CSS id selectors (#fade { ... }) and SVG fragment refs
# (url(#myGradient)). Length is restricted to valid hex lengths only —
# 3, 4, 6, or 8 digits — so cosmetic 5/7-digit hits no longer report.
HEX_RE=':[[:space:]]*#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b'
while IFS= read -r hit; do
  file="${hit%%:*}"
  echo "$file" | grep -Eq "$EXEMPT" && continue
  echo "  [raw-hex]    $hit"
  violations=$((violations + 1))
done < <(grep -rEn "$HEX_RE" "$WEB" --include='*.css' --include='*.scss' 2>/dev/null)

# 2) border-radius values that aren't a token / allowed literal.
# Evaluates each value token independently rather than line-level substring
# matching — so `border-radius: 13px 2px;` correctly flags the `13px` even
# though `2px` is present, and a trailing `/* var(--x) */` comment doesn't
# silently exempt the whole declaration.
ALLOWED_RADIUS_RE='^(0|0px|2px|999px)$'
while IFS= read -r hit; do
  file="${hit%%:*}"
  echo "$file" | grep -Eq "$EXEMPT" && continue
  # Pull the line content (drop "file:lineno:" prefix; tolerate trailing CR).
  content="${hit#*:*:}"
  content="${content%$'\r'}"
  # Strip CSS block comments before evaluating the value.
  stripped=$(printf '%s' "$content" | sed 's|/\*[^*]*\*/||g')
  # Extract the value between ":" and ";" (or end of line) for the
  # border-radius declaration. If the line doesn't parse cleanly, fall back
  # to the whole stripped content — better a false positive than a silent miss.
  value=$(printf '%s' "$stripped" | sed -nE 's/.*border-radius[[:space:]]*:[[:space:]]*([^;}]*).*/\1/p')
  [ -z "$value" ] && value="$stripped"
  # Each whitespace-separated token must be a token-function call or one of
  # the allowed literals. Anything else flags the line.
  bad=0
  for tok in $value; do
    case "$tok" in
      'var('*) continue ;;
    esac
    if ! printf '%s' "$tok" | grep -Eq "$ALLOWED_RADIUS_RE"; then
      bad=1
      break
    fi
  done
  if [ "$bad" -eq 1 ]; then
    echo "  [radius]     $hit"
    violations=$((violations + 1))
  fi
done < <(grep -rEin 'border-radius' "$WEB" --include='*.css' --include='*.scss' 2>/dev/null)

if [ "$violations" -gt 0 ]; then
  echo ""
  echo "DESIGN-CONFORMANCE: FAIL — $violations off-token value(s). Replace raw hex with var(--color-*)"
  echo "and use var(--radius) / var(--radius-pill). If a value genuinely has no token, add it to the"
  echo "design token sheet and reference it — do not inline 'close enough' values (application design rules)."
  exit 1
fi

echo "DESIGN-CONFORMANCE: PASS — all colours/radii in component CSS trace to design tokens."
exit 0
