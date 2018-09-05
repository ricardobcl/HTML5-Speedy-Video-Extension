// 'app' is the main object of this extension
const app = {
  speed: 1.0, // initial playback speed
  my_video: undefined,
  currentURL: window.location.href,
  tries: 0,
  active_shortcuts: false,
  interval_maintain_speed: undefined
}

// the config object with default values
app.config = {
  default_delta: 0.2, // smallest increment or decrement of playback speed
  default_skip_small: 2, // number of seconds to (small) skip or rewind the video
  default_skip_big: 10, // number of seconds to (big) skip or rewind the video
  debug: false, // flag to disable or enable console log debug info
  max_tries_finding_video: 150, // max number of tries to finding the video
  faster_text: "&#9758;",
  slower_text: "&#9756;",
  playerbar_class_name: {
    youtube: "ytp-chrome-controls", // name class of youtube player bar
    videojs: "vjs-control-bar", // name class of VideoJS player bar
    netflix: "ellipsize-text" // name class of Netflix player bar
  }
}

app.log = string => {
  if (app.config.debug) {
    console.log(`Speedy Extension: ${string}`)
  }
}

app.start = () => {
  // necessary test to only launch the extension 1 time per page (at least on safari)
  if (window.top === window) {
    app.log("Starting Speedy Video")
    // try running setup() 4 times per second until we find the video tag or reach
    // the maximum number of tries 'max_tries_finding_video'
    app.setup()
    app.timeout_finding_video = setInterval(app.setup, 250)
    setInterval(app.check_changed_url, 250)
  }
}

app.check_changed_url = () => {
  if (window.location.href != app.currentURL) {
    app.log("old: " + app.currentURL)
    app.log("new :" + window.location.href)
    // update new url
    app.currentURL = window.location.href
    if (
      app.currentURL.indexOf("watch") >= 0 ||
      app.currentURL.indexOf("Anime") >= 0
    ) {
      // try finding a new video tag
      clearInterval(app.timeout_finding_video)
      app.tries = 0
      // try running setup() 4 times per second until we find the video tag or reach
      // the maximum number of tries 'max_tries_finding_video'
      app.setup()
      app.timeout_finding_video = setInterval(app.setup, 250)
    } else {
      app.log('URL changed, but no "watch" in it.')
    }
  }
}

app.setup = () => {
  app.tries++
  // try to find a valid video tag
  // this may not work well with pages with multiple videos, but I did not find
  // this an issue with youtube, etc.
  app.my_video = document.querySelectorAll("video")[0]
  if (app.my_video !== undefined) {
    app.log("We found a video tag!")
    //stop trying to find the video tag
    clearInterval(app.timeout_finding_video)
    // add buttons to the video player to show current speed and to speed up or down
    app.add_buttons_player()
    app.timeout_finding_status_bar = setInterval(app.add_buttons_player, 250)
    // set up keyboard shortcuts (only once)
    app.setup_shorcuts(app.active_shortcuts)
    // periodically check if the playback speed is correct
    clearInterval(app.interval_maintain_speed)
    app.interval_maintain_speed = setInterval(app.maintain_speed, 500)
  } else {
    if (app.tries >= app.max_tries_finding_video) {
      app.log(`No video tag found after ${app.tries} tries!`)
      clearInterval(app.timeout_finding_video)
    } else {
      app.log(`NO HTML5 video tag yet! Try #${app.tries}`)
    }
  }
}

app.maintain_speed = () => {
  app.my_video.playbackRate = app.speed
  const speed_number_playbar = document.getElementById("speedy_video_speed")
  if (speed_number_playbar) {
    speed_number_playbar.innerHTML = app.my_video.playbackRate.toFixed(1)
  }
}

app.add_buttons_player = () => {
  app.log("Trying to add the control buttons on the player status bar")
  let video_player_buttons = document.getElementById(
    "speedy_extension_addon_2_player"
  )
  if (!video_player_buttons) {
    const youtube = document.getElementsByClassName(
      app.config.playerbar_class_name.youtube
    )[0]
    if (youtube) {
      app.log("adding buttons to YOUTUBE")
      const divButtons = document.createElement("div")
      divButtons.setAttribute("id", "speedy_extension_addon_2_player")
      youtube.appendChild(divButtons)
    }

    const videojs = document.getElementsByClassName(
      app.config.playerbar_class_name.videojs
    )[0]
    if (videojs) {
      app.log("adding buttons to VIDEOJS")
      const divButtons = document.createElement("div")
      divButtons.setAttribute("id", "speedy_extension_addon_2_player")
      videojs.appendChild(divButtons)
    }

    const netflix = document.getElementsByClassName(
      app.config.playerbar_class_name.netflix
    )[0]
    if (netflix) {
      app.log("adding buttons to NETFLIX")
      const spanButtons = document.createElement("span")
      spanButtons.setAttribute("id", "speedy_extension_addon_2_player")
      netflix.insertBefore(spanButtons, null)
    }

    video_player_buttons = document.getElementById(
      "speedy_extension_addon_2_player"
    )
    if (video_player_buttons) {
      const leftButton = document.createElement("button")
      leftButton.setAttribute("id", "speedy_speed_down")
      leftButton.setAttribute("class", "speedy_button left_button")
      leftButton.innerHTML = app.config.slower_text
      video_player_buttons.appendChild(leftButton)

      const speedNumber = document.createElement("b")
      speedNumber.setAttribute("class", "speedy_tag")
      video_player_buttons.appendChild(speedNumber)
      const speedNumberSpan = document.createElement("span")
      speedNumberSpan.setAttribute("id", "speedy_video_speed")
      speedNumber.appendChild(speedNumberSpan)
      speedNumber.insertAdjacentText("beforeend", "X")

      const rightButton = document.createElement("button")
      rightButton.setAttribute("id", "speedy_speed_up")
      rightButton.setAttribute("class", "speedy_button right_button")
      rightButton.innerHTML = app.config.faster_text
      video_player_buttons.appendChild(rightButton)

      document
        .getElementById("speedy_speed_down")
        .addEventListener("click", () => {
          app.speed -= app.config.default_delta
        })
      document
        .getElementById("speedy_speed_up")
        .addEventListener("click", () => {
          app.speed += app.config.default_delta
        })

      app.log("NEW controls were added!")
    } else {
      app.log("ERROR adding the buttons the playerbar")
    }
  } else {
    app.log("Controls were already added!")
    clearInterval(app.timeout_finding_status_bar)
  }
}

app.setup_shorcuts = () => {
  if (app.active_shortcuts) return
  app.active_shortcuts = true

  document.addEventListener("keydown", () => {
    app.log(`Not ignoring keys: ${event.which}`)
    switch (event.which) {
      case 187: // +
        if (!event.ctrlKey) return
        prevent_key_event("speed up", event)
        app.speed += app.config.default_delta
        break
      case 191: // -
        if (!event.ctrlKey) return
        prevent_key_event("slow down", event)
        app.speed -= app.config.default_delta
        break
      case 48: // 0
      case 49: // 1
        if (!event.ctrlKey) return
        prevent_key_event("speed 1", event)
        app.speed = 1.0
        break
      case 50: // 2
        if (!event.ctrlKey) return
        prevent_key_event("speed 2", event)
        app.speed = 2.0
        break
      case 51: // 3
        if (!event.ctrlKey) return
        prevent_key_event("speed 2.5", event)
        app.speed = 2.5
        break
      case 52: // 4
        if (!event.ctrlKey) return
        prevent_key_event("speed 3", event)
        app.speed = 3.0
        break
      case 39: // right arrow
        if (!event.shiftKey) return
        if (at_netflix()) return // this crashes the netflix page
        prevent_key_event("right", event)
        app.my_video.currentTime += app.config.default_skip_small
        break
      case 37: // left arrow
        if (!event.shiftKey) return
        if (at_netflix()) return // this crashes the netflix page
        prevent_key_event("left", event)
        app.my_video.currentTime -= app.config.default_skip_small
        break
      case 38: // up arrow
        if (!event.shiftKey) return
        if (at_netflix()) return // this crashes the netflix page
        prevent_key_event("up", event)
        app.my_video.currentTime += app.config.default_skip_big
        break
      case 40: // down arrow
        if (!event.shiftKey) return
        if (at_netflix()) return // this crashes the netflix page
        prevent_key_event("down", event)
        app.my_video.currentTime -= app.config.default_skip_big
        break
    }
  })
}

const prevent_key_event = (string, event) => {
  app.log(string)
  event.preventDefault()
}

const at_netflix = () => {
  if (app.currentURL.indexOf("netflix") >= 0) {
    return true
  } else {
    return false
  }
}

app.start()
