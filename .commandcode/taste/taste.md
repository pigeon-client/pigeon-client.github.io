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
- Use purple (#7c6efa) as the primary accent color, not green. Confidence: 0.70

# site
- Show curl install option (curl | sh) for all platforms, not just macOS. Confidence: 0.65

