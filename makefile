CHROME = HTML5\ Speedy\ Video\ Chrome
CYAN = \033[0;36m
GREEN = \033[0;32m
BOLD = \033[1m
PLAIN = \033[0m

no_target: notarget all

all: chrome

notarget:
	@ echo "$(CYAN)$(BOLD)Note:$(PLAIN)$(CYAN) No target specified for make; building all targets.$(PLAIN)"

chrome: clean_chrome
	@ echo "> Copying files to Chrome extension folder..."
	@ cp -R icons $(CHROME)/icons
	@ cd src; cp speedy.js style.css ../$(CHROME)
	@ echo "$(GREEN)Chrome extention is ready!$(PLAIN)"

clean: clean_chrome
	@ rm -f  .DS_Store

clean_chrome:
	@ echo "> Cleaning Chrome extension folder..."
	@ rm -fr $(CHROME)/icons
	@ rm -f  $(CHROME)/speedy.js $(CHROME)/style.css $(CHROME)/.DS_Store

release: clean_release chrome
	@ zip -r SpeedyChrome.zip $(CHROME)
	@ echo "$(GREEN)Chrome extention release is ready!$(PLAIN)"

clean_release:
	@ echo "> Cleaning Chrome release..."
	@ rm -f SpeedyChrome.zip
