const screens = Array.from(document.querySelectorAll('.screen'));
const sceneWrapper = document.querySelector("[data-video-wrapper='scene']");
const sceneVideo = sceneWrapper?.querySelector('video');
const continueBtn = document.querySelector("[data-action='continue']");
const storyScreen = document.querySelector("[data-screen='story']");
const afterVideoScreen = document.querySelector("[data-screen='after-video']");
const afterAudio = document.querySelector("[data-audio='after']");
const snowCanvas = document.getElementById('snowCanvas');
const ctx = snowCanvas.getContext('2d');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let currentIndex = 0;
let pauseTimer = null;
let snowflakes = [];
let animationFrameId = null;
let snowEnabled = true;
let resizeTimer = null;
let sceneIsPlaying = false;
let sceneHasStarted = false;
let audioHasPlayed = false;

function tryPlayAfterAudio(force = false) {
  if (!afterAudio || audioHasPlayed) {
    return;
  }

  const shouldPlay = force || document.visibilityState === 'visible';
  if (!shouldPlay) {
    return;
  }

  afterAudio
    .play()
    .then(() => {
      audioHasPlayed = true;
    })
    .catch(() => {
      const card = afterAudio.closest('.audio-card');
      if (!card || card.querySelector('.audio-unlock')) {
        return;
      }

      const playButton = document.createElement('button');
      playButton.type = 'button';
      playButton.className = 'audio-unlock';
      playButton.textContent = 'Включить музыку';
      playButton.addEventListener('click', () => {
        tryPlayAfterAudio(true);
      });

      card.appendChild(playButton);
    });
}

function pixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 1.6);
}

function resizeCanvas() {
  const ratio = pixelRatio();
  snowCanvas.width = Math.floor(window.innerWidth * ratio);
  snowCanvas.height = Math.floor(window.innerHeight * ratio);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);
  createSnowflakes();
}

function createSnowflakes() {
  if (!snowEnabled) {
    snowflakes = [];
    ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    return;
  }

  const area = window.innerWidth * window.innerHeight;
  const density = window.innerWidth < 640 ? 14000 : 9000;
  const flakeCount = Math.ceil(area / density);
  snowflakes = Array.from({ length: flakeCount }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 1.6 + 0.5,
    speedY: Math.random() * 0.6 + 0.45,
    speedX: Math.random() * 0.5 - 0.25,
    opacity: Math.random() * 0.5 + 0.2,
  }));
}

function drawSnow() {
  if (!snowEnabled) {
    return;
  }

  ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
  snowflakes.forEach((flake) => {
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
    ctx.fill();

    flake.y += flake.speedY;
    flake.x += flake.speedX;

    if (flake.y > snowCanvas.height) {
      flake.y = -flake.radius;
      flake.x = Math.random() * snowCanvas.width;
    }

    if (flake.x > snowCanvas.width) {
      flake.x = 0;
    } else if (flake.x < 0) {
      flake.x = snowCanvas.width;
    }
  });

  animationFrameId = requestAnimationFrame(drawSnow);
}

function startSnow() {
  if (!snowEnabled) {
    return;
  }
  cancelAnimationFrame(animationFrameId);
  drawSnow();
}

function stopSnow() {
  cancelAnimationFrame(animationFrameId);
  ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
}

function applyMotionPreference() {
  snowEnabled = !prefersReducedMotion.matches;
  if (snowEnabled) {
    snowCanvas.style.display = '';
    resizeCanvas();
    startSnow();
  } else {
    snowCanvas.style.display = 'none';
    stopSnow();
  }
}

function pauseScene() {
  if (sceneVideo) {
    sceneVideo.pause();
  }
}

function showScreen(nextIndex) {
  if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= screens.length) return;

  clearTimeout(pauseTimer);
  const previous = screens[currentIndex];

  if (previous.dataset.screen === 'video-scene') {
    pauseScene();
    sceneWrapper?.classList.remove('playing');
  } else if (previous.dataset.screen === 'after-video' && afterAudio) {
    afterAudio.pause();
    afterAudio.currentTime = 0;
  }

  previous.classList.remove('active');
  currentIndex = nextIndex;
  const target = screens[currentIndex];
  target.classList.add('active');
  target.scrollTop = 0;

  if (target.dataset.screen === 'after-video') {
    tryPlayAfterAudio();
  }
}

function goNext() {
  if (currentIndex + 1 < screens.length) {
    showScreen(currentIndex + 1);
  }
}

function playScene() {
  if (!sceneVideo) {
    return;
  }

  sceneWrapper?.classList.add('playing');
  sceneVideo
    .play()
    .then(() => {
      sceneIsPlaying = true;
      sceneHasStarted = true;
      sceneWrapper?.classList.add('started');
    })
    .catch(() => {
      sceneWrapper?.classList.remove('playing');
      sceneIsPlaying = false;
    });
}

continueBtn.addEventListener('click', goNext);
storyScreen.addEventListener('click', goNext);

sceneWrapper.addEventListener('click', (event) => {
  if (!sceneVideo) {
    return;
  }

  if (sceneHasStarted) {
    return;
  }

  event.preventDefault();
  playScene();
});

if (sceneVideo) {
  sceneVideo.addEventListener('play', () => {
    sceneWrapper.classList.add('playing');
    sceneWrapper.classList.add('started');
    sceneIsPlaying = true;
    sceneHasStarted = true;
  });

  sceneVideo.addEventListener('pause', () => {
    sceneWrapper.classList.remove('playing');
    sceneIsPlaying = false;
  });

  sceneVideo.addEventListener('ended', () => {
    sceneWrapper.classList.remove('playing');
    sceneIsPlaying = false;
    goNext();
  });
}

if (afterAudio) {
  afterAudio.addEventListener('play', () => {
    audioHasPlayed = true;
  });
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeCanvas();
  }, 150);
});

const motionChangeHandler = () => applyMotionPreference();

if (typeof prefersReducedMotion.addEventListener === 'function') {
  prefersReducedMotion.addEventListener('change', motionChangeHandler);
} else if (typeof prefersReducedMotion.addListener === 'function') {
  prefersReducedMotion.addListener(motionChangeHandler);
}

window.addEventListener('load', () => {
  applyMotionPreference();
  if (snowEnabled) {
    resizeCanvas();
    startSnow();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && screens[currentIndex]?.dataset.screen === 'after-video') {
    tryPlayAfterAudio();
  }
});
