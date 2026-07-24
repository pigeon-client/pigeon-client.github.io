# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# architecture
- Follow feature-first architecture: organize code under app/, features/, shared/, styles/, config/ with clear separation. Confidence: 0.70
- Use reusable components; avoid duplicating UI patterns. Confidence: 0.65
- Services go in dedicated service folders (e.g., services/curlParser, services/request). Confidence: 0.60

# ui
- Modal animations should use soft pop-in, not right-to-center slide. Confidence: 0.65
- Dropdown trigger buttons should use ghost button style. Confidence: 0.60
- Icons should adapt to theme (dark/light mode). Confidence: 0.60
- Avoid separate resize handle divs; use the panel/element itself as the drag handle instead. Confidence: 0.55

# npm
- Use curlconverter package for curl parsing. Confidence: 0.65

# branding
- Use the original orange-red accent color (oklch(0.6171 0.1375 39.0427) / #c96442), not purple. Confidence: 0.75

# site
- Currently only support macOS with a terminal-based approach; don't add other platform options. Confidence: 0.70

# git
- Do not add Co-authored-by bot trailers to commits; only include the project name. Confidence: 0.65

