CHROME = chrome
CYAN = \033[0;36m
GREEN = \033[0;32m
BOLD = \033[1m
PLAIN = \033[0m

.PHONY: all install chrome clean clean_chrome release clean_release

all: chrome

# builds the Chrome extension and walks you through loading it in Chrome
install: chrome
	@ open -R "$(CHROME)/manifest.json" >/dev/null 2>&1 || true
	@ osascript >/dev/null 2>&1 \
	  -e 'tell application "Google Chrome"' \
	  -e 'activate' \
	  -e 'if (count of windows) = 0 then make new window' \
	  -e 'tell front window to make new tab with properties {URL:"chrome://extensions/"}' \
	  -e 'end tell' \
	  || echo "(could not open Chrome automatically -- go to chrome://extensions yourself)"
	@ echo ""
	@ echo "$(BOLD)Finish in the Chrome tab that just opened:$(PLAIN)"
	@ echo "  1. turn on $(BOLD)Developer mode$(PLAIN) (top right corner)"
	@ echo "  2. click $(BOLD)Load unpacked$(PLAIN) and choose the folder highlighted in Finder:"
	@ echo "     $(CYAN)$(CURDIR)/$(CHROME)$(PLAIN)"
	@ echo ""
	@ echo "To update later: git pull && make install, then click reload on the extension card."

chrome: clean_chrome
	@ echo "> Building the Chrome extension folder..."
	@ cp -R icons "$(CHROME)/icons"
	@ cp src/speedy.js src/style.css "$(CHROME)"
	@ echo "$(GREEN)Chrome extension is ready!$(PLAIN)"

clean: clean_chrome clean_release
	@ rm -f .DS_Store

clean_chrome:
	@ rm -rf "$(CHROME)/icons"
	@ rm -f "$(CHROME)/speedy.js" "$(CHROME)/style.css" "$(CHROME)/.DS_Store"

release: clean_release chrome
	@ zip -r SpeedyChrome.zip "$(CHROME)"
	@ echo "$(GREEN)Release zip is ready!$(PLAIN)"

clean_release:
	@ rm -f SpeedyChrome.zip
