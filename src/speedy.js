/**
 * Speedy Video: fine-grained playback speed control for HTML5 videos.
 *
 * A content script with no external dependencies. It finds the page's video
 * and the player's control bar, adds speed buttons to the bar, installs
 * keyboard shortcuts and shows the current speed in an overlay near the top
 * of the video whenever it changes.
 */

// -------------------------------------------------------------- configuration

const config = {
  speedDelta: 0.25, // smallest increment or decrement of playback speed
  minSpeed: 0.2, // lowest playback speed allowed
  maxSpeed: 4.0, // highest playback speed allowed
  speedPresets: { a: 1.0, s: 2.0, d: 3.0 }, // key -> playback speed
  skipSmall: 2, // seconds seeked by shift + left/right
  skipBig: 10, // seconds seeked by shift + up/down
  fasterKey: "w", // key that speeds up by speedDelta
  slowerKey: "q", // key that slows down by speedDelta
  overlayKey: "z", // key that shows the current speed on top of the video
  overlayDuration: 1000, // ms the speed overlay stays visible
  pollInterval: 250, // ms between attempts to find the video or the player bar
  maxTriesVideo: 150, // max number of attempts to find the video
  maxTriesPlayerBar: 150, // max number of attempts to find the player bar
  debug: false, // enables console.log debug info
  buttons: {
    fasterText: "☞",
    slowerText: "☜",
    hoverColor: "DeepSkyBlue" // unless the player below overrides it
  },
  // How to recognise each supported player: the class name of its control bar,
  // plus optional styling overrides for the buttons we add to it. The first
  // player found on the page wins. On any other player the buttons are not
  // added, but the keyboard shortcuts and the speed overlay still work.
  players: {
    youtube: { controlBar: "ytp-chrome-controls", hoverColor: "OrangeRed" },
    netflix: {
      controlBar: "ellipsize-text",
      hoverColor: "OrangeRed",
      tag: "span",
      fontSize: "0.6em"
    },
    videojs: { controlBar: "vjs-control-bar" },
    plyr: { controlBar: "plyr__controls" },
    jwplayer: { controlBar: "jw-controlbar" },
    mediaelement: { controlBar: "mejs__controls" },
    flowplayer: { controlBar: "fp-controls" },
    shaka: { controlBar: "shaka-bottom-controls" },
    bitmovin: { controlBar: "bmpui-ui-controlbar" }
  }
}

// ------------------------------------------------------------------- helpers

const log = message => {
  if (config.debug) console.log(`Speedy Extension: ${message}`)
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// "1.25" and "2" instead of "1.2500000000000002" and "2.00"
const formatSpeed = speed => `${Math.round(speed * 100) / 100}`

// whether keystrokes belong to a text field and should never be hijacked
const isTyping = target =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

// seeking by setting currentTime breaks the netflix player, so its own seek
// shortcuts are left alone
const atNetflix = () => location.hostname.endsWith("netflix.com")

// the <video> that belongs to a player bar: the first one inside the closest
// ancestor of the bar that contains a video (pages may have several videos)
const videoOfPlayerBar = bar => {
  for (let element = bar.parentElement; element; element = element.parentElement) {
    const video = element.querySelector("video")
    if (video) return video
  }
  return undefined
}

// per-player styling of our buttons (added only once)
const injectStyle = ({ hoverColor = config.buttons.hoverColor, fontSize = "1em" }) => {
  if (document.getElementById("speedy-style")) return
  const style = document.createElement("style")
  style.id = "speedy-style"
  style.textContent = `
    #speedy-slower:hover, #speedy-faster:hover { color: ${hoverColor}; }
    #speedy-tag { font-size: ${fontSize}; }`
  document.head.append(style)
}

// -------------------------------------------------------------- the extension

class SpeedyVideo {
  speed = 1.0 // current playback speed
  video = undefined // the <video> element being controlled

  #currentUrl = location.href
  #timers = new Map() // active setInterval handles, keyed by name
  #overlayTimeout = undefined
  #shortcutsActive = false

  start() {
    // only run in the top frame, so the extension is launched once per page
    if (window.top !== window) return
    log("Starting Speedy Video")
    this.#watchUrlChanges()
    this.#findVideo()
  }

  // sets a new playback speed, clamped to [minSpeed, maxSpeed] and rounded to
  // two decimals so that repeated +/- steps don't accumulate float error
  setSpeed(speed) {
    this.speed = Math.round(clamp(speed, config.minSpeed, config.maxSpeed) * 100) / 100
    log(`Speed set to ${this.speed}`)
    this.applySpeed()
    this.showOverlay()
  }

  changeSpeed(delta) {
    this.setSpeed(this.speed + delta)
  }

  // (re)applies the chosen speed and refreshes the number on the player bar;
  // also runs every second, because some players reset the rate on their own
  applySpeed = () => {
    if (!this.video) return
    if (this.video.playbackRate !== this.speed) {
      this.video.playbackRate = this.speed
    }
    const display = document.getElementById("speedy-speed")
    if (display) display.textContent = formatSpeed(this.speed)
  }

  seek(seconds) {
    if (this.video) this.video.currentTime += seconds
  }

  // shows the current speed in an overlay near the top of the video for a moment
  showOverlay() {
    const rect = this.video?.getBoundingClientRect()
    if (!rect?.width || !rect?.height) return // no video, or not visible
    const overlay =
      document.getElementById("speedy-overlay") ?? document.createElement("div")
    overlay.id = "speedy-overlay"
    // in fullscreen only descendants of the fullscreen element are visible, so
    // (re)attach the overlay to it; otherwise to the body
    const container = document.fullscreenElement ?? document.body
    if (overlay.parentElement !== container) container.append(overlay)
    overlay.style.left = `${rect.left + rect.width / 2}px`
    // near the top of the video, where it covers less of the action
    overlay.style.top = `${rect.top + rect.height * 0.1}px`
    overlay.style.fontSize = `${Math.max(12, Math.round(rect.height * 0.025))}px`
    overlay.textContent = `${formatSpeed(this.speed)}x`
    overlay.classList.add("speedy-visible")
    clearTimeout(this.#overlayTimeout)
    this.#overlayTimeout = setTimeout(
      () => overlay.classList.remove("speedy-visible"),
      config.overlayDuration
    )
  }

  // ---------------------------------------------------- finding what to drive

  // single-page sites (e.g. youtube) load a new video without a page load, so
  // look again for the video whenever the URL changes
  #watchUrlChanges() {
    const onChange = () => {
      if (location.href === this.#currentUrl) return
      log(`URL changed to ${location.href}`)
      this.#currentUrl = location.href
      this.#findVideo()
    }
    if (window.navigation) {
      window.navigation.addEventListener("currententrychange", onChange)
    } else {
      setInterval(onChange, config.pollInterval) // e.g. safari < 18.2
    }
  }

  #findVideo() {
    this.#poll("video", config.maxTriesVideo, () => this.#setup())
  }

  // returns true when a video was found and everything is set up
  #setup() {
    // pages may have several videos: start with the first one and switch later
    // to the one that belongs to the player bar we find
    this.video = document.querySelector("video") ?? undefined
    if (!this.video) return false
    log("We found a video tag!")
    this.#poll("playerBar", config.maxTriesPlayerBar, () => this.#addButtons())
    this.#setupShortcuts()
    this.#startTimer("applySpeed", this.applySpeed, 1000)
    return true
  }

  // returns true when our buttons are on a player bar (already or just added)
  #addButtons() {
    if (document.getElementById("speedy-controls")) return true
    const player = this.#findPlayer()
    if (!player) return false
    const { name, bar, options } = player
    log(`Adding buttons to ${name}`)
    // control the video of this player, not necessarily the first on the page
    this.video = videoOfPlayerBar(bar) ?? this.video

    const controls = document.createElement(options.tag ?? "div")
    controls.id = "speedy-controls"
    controls.dataset.player = name
    controls.append(
      this.#button("speedy-slower", config.buttons.slowerText, -config.speedDelta),
      this.#speedDisplay(),
      this.#button("speedy-faster", config.buttons.fasterText, +config.speedDelta)
    )
    bar.append(controls)
    injectStyle(options)
    return true
  }

  #findPlayer() {
    for (const [name, options] of Object.entries(config.players)) {
      const bar = document.getElementsByClassName(options.controlBar)[0]
      if (bar) return { name, bar, options }
    }
    return undefined
  }

  #button(id, text, delta) {
    const button = document.createElement("button")
    button.id = id
    button.textContent = text
    button.addEventListener("click", () => this.changeSpeed(delta))
    return button
  }

  #speedDisplay() {
    const tag = document.createElement("b")
    tag.id = "speedy-tag"
    const speed = document.createElement("span")
    speed.id = "speedy-speed"
    speed.textContent = formatSpeed(this.speed)
    tag.append(speed, "x")
    return tag
  }

  // ---------------------------------------------------------------- shortcuts

  #setupShortcuts() {
    if (this.#shortcutsActive) return
    this.#shortcutsActive = true
    // capture phase, so that we run before the site's own handlers
    document.addEventListener("keydown", this.#onKeydown, true)
  }

  #onKeydown = event => {
    if (isTyping(event.target) || event.altKey || event.metaKey) return
    const action = this.#actionFor(event)
    if (!action) return
    log(`Shortcut: ${event.key}`)
    // also stop the site's own handler for the same key (e.g. youtube seeks
    // 5s on the arrows), otherwise both actions would run
    event.preventDefault()
    event.stopImmediatePropagation()
    action()
  }

  // Speed shortcuts are plain single letters (safe because keystrokes in
  // text fields are ignored); seek shortcuts are prefixed with shift.
  #actionFor({ key, ctrlKey, shiftKey }) {
    if (shiftKey) return atNetflix() ? undefined : this.#seekActionFor(key)
    if (ctrlKey) return undefined // never steal combos like control+a
    return this.#speedActionFor(key.toLowerCase())
  }

  #speedActionFor(key) {
    if (key === config.fasterKey) return () => this.changeSpeed(+config.speedDelta)
    if (key === config.slowerKey) return () => this.changeSpeed(-config.speedDelta)
    if (key === config.overlayKey) return () => this.showOverlay()
    const preset = config.speedPresets[key]
    return preset === undefined ? undefined : () => this.setSpeed(preset)
  }

  #seekActionFor(key) {
    const seconds = {
      ArrowRight: config.skipSmall,
      ArrowLeft: -config.skipSmall,
      ArrowUp: config.skipBig,
      ArrowDown: -config.skipBig
    }[key]
    return seconds === undefined ? undefined : () => this.seek(seconds)
  }

  // ------------------------------------------------------------------- timers

  // calls `fn` now and then every `pollInterval` ms until it returns true or
  // `maxTries` is reached; restarting a poll cancels the previous one first,
  // so polls never leak
  #poll(name, maxTries, fn) {
    this.#stopTimer(name)
    let tries = 0
    const tick = () => {
      tries += 1
      if (fn()) {
        this.#stopTimer(name)
        return true
      }
      if (tries >= maxTries) {
        log(`${name}: giving up after ${tries} tries`)
        this.#stopTimer(name)
        return true
      }
      log(`${name}: try #${tries}`)
      return false
    }
    if (!tick()) {
      this.#timers.set(name, setInterval(tick, config.pollInterval))
    }
  }

  #startTimer(name, fn, ms) {
    this.#stopTimer(name)
    this.#timers.set(name, setInterval(fn, ms))
  }

  #stopTimer(name) {
    clearInterval(this.#timers.get(name))
    this.#timers.delete(name)
  }
}

new SpeedyVideo().start()
