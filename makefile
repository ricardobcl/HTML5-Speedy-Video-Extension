CHROME = chrome
CYAN = \033[0;36m
GREEN = \033[0;32m
BOLD = \033[1m
PLAIN = \033[0m

.PHONY: all chrome clean clean_chrome release clean_release

all: chrome

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
