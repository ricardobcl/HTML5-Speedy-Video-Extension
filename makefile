SAFARI = HTML5\ Speedy\ Video.safariextension
CHROME = HTML5\ Speedy\ Video\ Chrome
CYAN = \033[0;36m
GREEN = \033[0;32m
BOLD = \033[1m
PLAIN = \033[0m

no_target: notarget all

all: chrome safari

notarget:
	@ echo "$(CYAN)$(BOLD)Note:$(PLAIN)$(CYAN) No target specified for make; building all targets.$(PLAIN)"

chrome: clean_chrome
	@ echo "> Copying files to Chrome extension folder..."
	@ cp -R icons $(CHROME)/icons
	@ cd src; cp speedy.js style.css ../$(CHROME)
	@ echo "$(GREEN)Chrome extention is ready!$(PLAIN)"

safari: clean_safari
	@ echo "> Copying files to Safari extension folder..."
	@ cp icons/* $(SAFARI)
	@ cd src; cp speedy.js style.css ../$(SAFARI)
	@ echo "$(GREEN)Safari extention is ready!$(PLAIN)"

clean: clean_chrome clean_safari
	@ rm -f  .DS_Store

clean_chrome:
	@ echo "> Cleaning Chrome extension folder..."
	@ rm -fr $(CHROME)/icons
	@ rm -f  $(CHROME)/speedy.js $(CHROME)/style.css $(CHROME)/.DS_Store

clean_safari:
	@ echo "> Cleaning Safari extension folder..."
	@ rm -f  $(SAFARI)/Icon*
	@ rm -f  $(SAFARI)/speedy.js $(SAFARI)/style.css $(SAFARI)/.DS_Store

release: clean_release chrome safari
	@ zip -r SpeedySafari.zip $(SAFARI)
	@ zip -r SpeedyChrome.zip $(CHROME)
	@ echo "$(GREEN)Chrome and Safari extentions releases are ready!$(PLAIN)"

clean_release:
	@ echo "> Cleaning Chrome and Safari releases..."
	@ rm -f SpeedySafari.zip
	@ rm -f SpeedyChrome.zip
