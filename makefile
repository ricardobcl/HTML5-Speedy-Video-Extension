SAFARI = HTML5\ Speedy\ Video.safariextension
CHROME = HTML5\ Speedy\ Video\ Chrome

.: all

all: clean
	cp icons/* $(SAFARI)
	cp -R icons $(CHROME)/icons
	cd src; cp speedy.js style.css jquery-2.1.1.min.js ../$(SAFARI)
	cd src; cp speedy.js style.css jquery-2.1.1.min.js ../$(CHROME)

clean:
	rm -f  .DS_Store
	rm -fr $(CHROME)/icons
	rm -f  $(CHROME)/speedy.js $(CHROME)/style.css $(CHROME)/jquery-2.1.1.min.js $(CHROME)/.DS_Store
	rm -f  $(SAFARI)/Icon*
	rm -f  $(SAFARI)/speedy.js $(SAFARI)/style.css $(SAFARI)/jquery-2.1.1.min.js $(SAFARI)/.DS_Store

