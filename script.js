(() => {
  const startScreen = document.getElementById("startScreen");
  const videoScreen = document.getElementById("videoScreen");
  const endScreen = document.getElementById("endScreen");
  const finale = document.getElementById("finale");
  const celebration = document.getElementById("celebration");
  const reveal = document.getElementById("reveal");
  const countdown = document.getElementById("countdown");
  const venue = document.getElementById("venue");
  const blessing = document.getElementById("blessing");
  const finaleClose = document.getElementById("finaleClose");
  const video = document.getElementById("inviteVideo");
  const bgMusic = document.getElementById("bgMusic");
  const stage = document.getElementById("stage");
  const scrollHint = document.getElementById("scrollHint");
  const scratchCard = document.getElementById("scratchCard");
  const scratchCanvas = document.getElementById("scratchCanvas");
  const scratchContent = document.getElementById("scratchContent");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const countDays = document.getElementById("countDays");
  const countHours = document.getElementById("countHours");
  const countMinutes = document.getElementById("countMinutes");
  const countSeconds = document.getElementById("countSeconds");

  // October 23, 2026 · 08:00 PM local time
  const EVENT_DATE = new Date(2026, 9, 23, 20, 0, 0);

  let opened = false;
  let scratchReady = false;
  let countdownTimer = null;

  function showOverlay(screen) {
    [startScreen, videoScreen].forEach((el) => {
      const active = el === screen;
      el.classList.toggle("is-active", active);
      if (active) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    });
  }

  async function startBackgroundMusic() {
    try {
      bgMusic.loop = true;
      bgMusic.volume = 0.85;
      bgMusic.currentTime = 0;
      await bgMusic.play();
    } catch (err) {
      console.warn("Background music could not start:", err);
    }
  }

  async function openInvitation() {
    if (opened) return;
    opened = true;

    startScreen.classList.add("is-leaving");
    showOverlay(videoScreen);

    // Start background song on the user tap gesture; keep it for the whole visit
    startBackgroundMusic();

    try {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.currentTime = 0;
      video.controls = false;
      await video.play();
    } catch (err) {
      console.warn("Video playback could not start:", err);
    }
  }

  function observeInView(element) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add("is-inview");
            if (element === reveal && !scratchReady) {
              initScratch();
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
  }

  function enablePageScroll() {
    document.documentElement.classList.add("is-scrollable");
    document.body.classList.add("is-scrollable");

    // Keep focus on body so wheel/keyboard scroll the page, not a trapped overlay
    stage.removeAttribute("tabindex");
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  function showEnd() {
    video.pause();

    startScreen.classList.remove("is-active");
    startScreen.setAttribute("hidden", "");
    videoScreen.classList.remove("is-active");
    videoScreen.setAttribute("hidden", "");

    enablePageScroll();

    finale.removeAttribute("hidden");
    requestAnimationFrame(() => {
      finale.classList.add("is-visible");
      endScreen.classList.add("is-active");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    observeInView(celebration);
    observeInView(reveal);
    observeInView(countdown);
    observeInView(venue);
    observeInView(blessing);
    observeInView(finaleClose);
    startCountdown();
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function getTimeLeft(now) {
    const diff = Math.max(0, EVENT_DATE.getTime() - now.getTime());
    const totalSeconds = Math.floor(diff / 1000);

    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      done: diff <= 0,
    };
  }

  function renderCountdown() {
    const time = getTimeLeft(new Date());

    countDays.textContent = pad(time.days);
    countHours.textContent = pad(time.hours);
    countMinutes.textContent = pad(time.minutes);
    countSeconds.textContent = pad(time.seconds);

    if (time.done && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown() {
    renderCountdown();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(renderCountdown, 1000);
  }

  function paintScratchSurface(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#c9a35a");
    gradient.addColorStop(0.35, "#f0d59a");
    gradient.addColorStop(0.55, "#a78e3a");
    gradient.addColorStop(1, "#d8b36a");

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 18; i += 1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.08})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      const y = Math.random() * height;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + (Math.random() * 24 - 12));
      ctx.stroke();
    }

    for (let i = 0; i < 120; i += 1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
    }

    ctx.fillStyle = "rgba(58, 20, 8, 0.72)";
    ctx.font = `600 ${Math.max(16, width * 0.07)}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH HERE", width / 2, height / 2);
  }

  function initScratch() {
    const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    scratchReady = true;
    let drawing = false;
    let revealed = false;
    let lastPoint = null;

    function resizeCanvas() {
      const rect = scratchCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      scratchCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
      scratchCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintScratchSurface(ctx, rect.width, rect.height);
    }

    function getPoint(event) {
      const rect = scratchCanvas.getBoundingClientRect();
      const source = event.touches ? event.touches[0] : event;
      return {
        x: source.clientX - rect.left,
        y: source.clientY - rect.top,
      };
    }

    function scratchAt(point) {
      const rect = scratchCanvas.getBoundingClientRect();
      const radius = Math.max(18, rect.width * 0.08);

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = radius * 2;

      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();

      lastPoint = point;
    }

    function clearedPercent() {
      const pixels = ctx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
      let cleared = 0;
      const step = 16;
      for (let i = 3; i < pixels.length; i += step) {
        if (pixels[i] < 128) cleared += 1;
      }
      const samples = Math.floor(pixels.length / step);
      return (cleared / samples) * 100;
    }

    function completeReveal() {
      if (revealed) return;
      revealed = true;
      drawing = false;
      lastPoint = null;

      scratchCard.classList.add("is-revealed");
      scratchContent.setAttribute("aria-hidden", "false");
      launchConfetti();
    }

    function onStart(event) {
      if (revealed) return;
      event.preventDefault();
      drawing = true;
      lastPoint = getPoint(event);
      scratchAt(lastPoint);
    }

    function onMove(event) {
      if (!drawing || revealed) return;
      event.preventDefault();
      scratchAt(getPoint(event));
      if (clearedPercent() >= 42) {
        completeReveal();
      }
    }

    function onEnd() {
      drawing = false;
      lastPoint = null;
    }

    resizeCanvas();

    scratchCanvas.addEventListener("mousedown", onStart);
    scratchCanvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    scratchCanvas.addEventListener("touchstart", onStart, { passive: false });
    scratchCanvas.addEventListener("touchmove", onMove, { passive: false });
    scratchCanvas.addEventListener("touchend", onEnd);
    scratchCanvas.addEventListener("touchcancel", onEnd);

    window.addEventListener("resize", () => {
      if (!revealed) resizeCanvas();
    });
  }

  function launchConfetti() {
    const ctx = confettiCanvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#e8c78e", "#d4b06a", "#f5eee0", "#c45c5c", "#fff4d6", "#8b1e1e"];
    const particles = [];
    const burstCount = 140;
    let frameId = 0;
    let start = 0;

    function resize() {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }

    resize();
    confettiCanvas.classList.add("is-active");

    const origins = [
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.75 },
      { x: window.innerWidth * 0.8, y: window.innerHeight * 0.75 },
      { x: window.innerWidth * 0.5, y: window.innerHeight * 0.55 },
    ];

    for (let i = 0; i < burstCount; i += 1) {
      const origin = origins[i % origins.length];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 7 + Math.random() * 11;

      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed * (0.7 + Math.random()),
        vy: Math.sin(angle) * speed - Math.random() * 6,
        size: 4 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        gravity: 0.18 + Math.random() * 0.1,
        drag: 0.985,
        life: 1,
        decay: 0.008 + Math.random() * 0.01,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }

    function frame(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;

      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      particles.forEach((p) => {
        p.vx *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.life -= p.decay;

        if (p.life <= 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      if (elapsed < 3200 && particles.some((p) => p.life > 0)) {
        frameId = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(frameId);
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiCanvas.classList.remove("is-active");
      }
    }

    frameId = requestAnimationFrame(frame);
  }

  stage.addEventListener(
    "pointerup",
    (event) => {
      if (opened) return;
      if (typeof event.button === "number" && event.button !== 0) return;
      openInvitation();
    },
    { passive: true }
  );

  stage.addEventListener("keydown", (event) => {
    if (opened) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openInvitation();
    }
  });

  stage.setAttribute("tabindex", "0");

  scrollHint.addEventListener("click", (event) => {
    event.preventDefault();
    celebration.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  video.addEventListener("ended", showEnd);

  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.controls = false;
  video.removeAttribute("controls");

  // Keep background music going even if the tab briefly pauses playback
  document.addEventListener("visibilitychange", () => {
    if (!opened || document.hidden) return;
    if (bgMusic.paused) {
      bgMusic.play().catch(() => {});
    }
  });
})();
