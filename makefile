SAFARI = HTML5\ Speedy\ Video.safariextension
CHROME = HTML5\ Speedy\ Video\ Chrome
CYAN = \033[0;36m
GREEN = \033[0;32m
BOLD = \033[1m
PLAIN = \033[0m

.: all

all: notarget chrome safari

notarget:
	@ echo "${CYAN}${BOLD}Note:${PLAIN}${CYAN} No target specified for make; building all targets.${PLAIN}"

chrome: clean_chrome
	@ echo "> Copying files to Chrome extention folder..."
	@ cp -R icons $(CHROME)/icons
	@ cd src; cp speedy.js style.css jquery-2.1.1.min.js ../$(CHROME)
	@ echo "${GREEN}Chrome extention is ready!${PLAIN}"

safari: clean_safari
	@ echo "> Copying files to Safari extention folder..."
	@ cp icons/* $(SAFARI)
	@ cd src; cp speedy.js style.css jquery-2.1.1.min.js ../$(SAFARI)
	@ echo "${GREEN}Safari extention is ready!${PLAIN}"

clean: clean_chrome clean_safari
	@ rm -f  .DS_Store

clean_chrome:
	@ echo "> Cleaning Chrome extention folder..."
	@ rm -fr $(CHROME)/icons
	@ rm -f  $(CHROME)/speedy.js $(CHROME)/style.css $(CHROME)/jquery-2.1.1.min.js $(CHROME)/.DS_Store

clean_safari:
	@ echo "> Cleaning Safari extention folder..."
	@ rm -f  $(SAFARI)/Icon*
	@ rm -f  $(SAFARI)/speedy.js $(SAFARI)/style.css $(SAFARI)/jquery-2.1.1.min.js $(SAFARI)/.DS_Store
