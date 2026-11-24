/**
 * Optional room features and visitor tools.
 */

window.RoomFeatures = (() => {
  const status = document.getElementById("feature-status");
  const seasonEffects = document.getElementById("season-effects");
  let audioContext = null;
  let rainSource = null;
  let rainGain = null;
  let syncNightMode = () => {};
  let syncMusicMode = () => {};
  let photoMode = false;

  const presets = {
    study: { mood: 0.18, night: false, strings: 0.35, ambience: "quiet" },
    rainy: { mood: 0.78, night: true, strings: 1, ambience: "rain" },
    weekend: { mood: 0.36, night: false, strings: 0.15, ambience: "quiet" },
  };

  function announce(message) {
    status.textContent = message;
  }

  function setPreset(name, persist, startAmbience = true) {
    const preset = presets[name];
    if (!preset) return;
    Animations.setMoodValue(preset.mood, preset.night);
    Animations.setStringLightLevel(preset.strings);
    document.documentElement.dataset.preset = name;
    syncNightMode(preset.night);
    document.getElementById("ambience-select").value = preset.ambience;
    if (startAmbience) setAmbience(preset.ambience);
    if (persist) localStorage.setItem("rosemay-room-preset", name);
  }

  function setManualDayNight(night) {
    document.getElementById("room-preset").value = "custom";
    document.documentElement.dataset.preset = "custom";
    localStorage.removeItem("rosemay-room-preset");
    Animations.setStringLightLevel(night ? 1 : 0.35);
  }

  function ensureAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio is not supported in this browser.");
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  function stopRain() {
    if (rainSource) {
      rainSource.stop();
      rainSource.disconnect();
      rainSource = null;
    }
    if (rainGain) {
      rainGain.disconnect();
      rainGain = null;
    }
  }

  function playRain() {
    const context = ensureAudioContext();
    stopRain();
    const frames = context.sampleRate * 3;
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) samples[i] = (Math.random() * 2 - 1) * 0.28;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1050;
    const gain = context.createGain();
    gain.gain.value = 0.13;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    rainSource = source;
    rainGain = gain;
    return context.resume();
  }

  function setAmbience(mode) {
    stopRain();
    const music = document.getElementById("bg-music");
    if (mode === "rain") {
      music.pause();
      syncMusicMode(false);
      try {
        playRain().then(() => announce("Soft rain ambience is on.")).catch((error) => {
          announce(`Could not start rain ambience: ${error.message}`);
        });
      } catch (error) {
        announce(`Could not start rain ambience: ${error.message}`);
      }
      return;
    }
    if (mode === "music") {
      if (!music.src) {
        document.getElementById("ambience-select").value = "quiet";
        syncMusicMode(false);
        announce("No music track is configured yet. Add a royalty-free track to enable music.");
        return;
      }
      music.play().then(() => {
        syncMusicMode(true);
        announce("Music is on.");
      }).catch((error) => {
        syncMusicMode(false);
        document.getElementById("ambience-select").value = "quiet";
        announce(`Could not play music: ${error.message}`);
      });
      return;
    }
    music.pause();
    syncMusicMode(false);
    announce("Quiet ambience is on.");
  }

  function setSeason(name) {
    seasonEffects.replaceChildren();
    document.documentElement.dataset.season = name;
    const glyphs = {
      spring: ["✿", "❀"],
      summer: ["✦", "✧"],
      autumn: ["🍂", "🍁"],
      winter: ["❄", "✧"],
    };
    if (!glyphs[name]) return;
    glyphs[name].forEach((glyph, index) => {
      for (let i = 0; i < 10; i++) {
        const particle = document.createElement("span");
        particle.textContent = glyph;
        particle.style.setProperty("--particle-x", `${Math.random() * 100}%`);
        particle.style.setProperty("--particle-delay", `${Math.random() * -18}s`);
        particle.style.setProperty("--particle-duration", `${12 + Math.random() * 15}s`);
        particle.style.setProperty("--particle-size", `${0.65 + Math.random() * 0.75}rem`);
        particle.dataset.variant = String(index);
        seasonEffects.appendChild(particle);
      }
    });
  }

  function togglePhotoMode(enabled) {
    photoMode = enabled;
    document.body.classList.toggle("photo-mode", photoMode);
    document.getElementById("photo-mode-exit").hidden = !photoMode;
    if (photoMode) {
      document.getElementById("room-tools").open = false;
      announce("Photo mode on. Press Escape or P to return to the room.");
    } else {
      announce("Photo mode off.");
    }
  }

  function postcardCaption(value) {
    if (value.indexOf("project-") === 0) {
      const project = PORTFOLIO_DATA.projects[Number(value.slice(8))];
      return project ? project.name : "Rosemay's Room";
    }
    if (value.indexOf("fact-") === 0) {
      return PORTFOLIO_DATA.funFacts[Number(value.slice(5))] || "Rosemay's Room";
    }
    return "Rosemay's Room";
  }

  function downloadPostcard(value, messageTarget) {
    const sceneCanvas = document.getElementById("scene-canvas");
    const renderer = RoomScene.renderer;
    const camera = RoomScene.camera;
    const scene = RoomScene.scene;
    const postcard = document.createElement("canvas");
    postcard.width = 1200;
    postcard.height = 900;
    const context = postcard.getContext("2d");
    if (!context) {
      messageTarget.textContent = "Could not create the postcard image in this browser.";
      return;
    }

    renderer.render(scene, camera);
    context.fillStyle = "#182033";
    context.fillRect(0, 0, postcard.width, postcard.height);
    context.drawImage(sceneCanvas, 0, 0, postcard.width, 720);
    const gradient = context.createLinearGradient(0, 720, 0, 900);
    gradient.addColorStop(0, "#eee8ff");
    gradient.addColorStop(1, "#dceaf0");
    context.fillStyle = gradient;
    context.fillRect(0, 720, postcard.width, 180);
    context.fillStyle = "#26364a";
    context.font = "600 38px Segoe UI, sans-serif";
    context.fillText(postcardCaption(value), 54, 790, 1080);
    context.font = "24px Segoe UI, sans-serif";
    context.fillStyle = "#617187";
    context.fillText("A little corner of Rosemay's Room", 54, 838);

    postcard.toBlob((blob) => {
      if (!blob) {
        messageTarget.textContent = "The postcard image could not be exported.";
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rosemays-room-postcard.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      messageTarget.textContent = "Your postcard was downloaded and is ready to share.";
    }, "image/png");
  }

  function init(options = {}) {
    syncNightMode = options.syncNightMode || syncNightMode;
    syncMusicMode = options.syncMusicMode || syncMusicMode;

    const presetSelect = document.getElementById("room-preset");
    const savedPreset = localStorage.getItem("rosemay-room-preset");
    if (presets[savedPreset]) {
      presetSelect.value = savedPreset;
      setPreset(savedPreset, false, false);
      if (savedPreset === "rainy") {
        announce("Rainy Evening preset restored. Choose Soft rain to start the ambience.");
      }
    } else if (Animations.isNight) {
      presetSelect.value = "custom";
      Animations.setStringLightLevel(1);
    } else {
      presetSelect.value = "study";
      setPreset("study", false, false);
    }

    presetSelect.addEventListener("change", () => {
      if (presets[presetSelect.value]) setPreset(presetSelect.value, true);
    });
    document.getElementById("ambience-select").addEventListener("change", (event) => {
      setAmbience(event.target.value);
    });
    document.getElementById("season-select").addEventListener("change", (event) => {
      setSeason(event.target.value);
    });
    document.getElementById("surprise-button").addEventListener("click", () => {
      const destinations = ["laptop", "bookshelf", "console", "cat", "plants", "coffee", "guitar", "gallery", "notebook"];
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      Portfolio.open(destination);
    });
    document.getElementById("daylife-button").addEventListener("click", () => Portfolio.open("day-in-life"));
    document.getElementById("guestbook-button").addEventListener("click", () => Portfolio.open("guestbook"));
    document.getElementById("postcard-button").addEventListener("click", () => Portfolio.open("postcard"));
    document.getElementById("how-made-button").addEventListener("click", () => Portfolio.open("how-made"));
    document.getElementById("photo-mode-button").addEventListener("click", () => togglePhotoMode(true));
    document.getElementById("photo-mode-exit").addEventListener("click", () => togglePhotoMode(false));
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isTyping) return;
      if (event.key === "Escape" && photoMode) togglePhotoMode(false);
      if (event.key.toLowerCase() === "p") togglePhotoMode(!photoMode);
    });
  }

  return {
    init,
    setManualDayNight,
    downloadPostcard,
    setAmbience,
  };
})();
