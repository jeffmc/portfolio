const RADIUS = 340;
const globe  = document.getElementById('globe');

function placePanels() {
  document.querySelectorAll('.panel').forEach(panel => {
    const lat = parseFloat(panel.dataset.lat) || 0;
    const lon = parseFloat(panel.dataset.lon) || 0;
    panel.style.transform = `rotateY(${lon}deg) rotateX(${-lat}deg) translateZ(${RADIUS}px)`;
  });
}

placePanels();

/* ── Drag-to-rotate ─────────────────────────────────────── */
let isDragging = false;
let startX = 0, startY = 0;
let rotX = -10, rotY = 0;    // current globe angles (degrees)
let velX = 0, velY = 0;      // inertia velocity
let lastX = 0, lastY = 0;
let rafId = null;

function applyRotation() {
  // clamp X rotation so it doesn't flip past the poles
  rotX = Math.max(-75, Math.min(75, rotX));
  globe.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

function onPointerDown(e) {
  isDragging = true;
  startX = lastX = e.clientX ?? e.touches?.[0].clientX;
  startY = lastY = e.clientY ?? e.touches?.[0].clientY;
  velX = velY = 0;
  cancelAnimationFrame(rafId);
  globe.style.transition = 'none';
}

function onPointerMove(e) {
  if (!isDragging) return;
  const cx = e.clientX ?? e.touches?.[0].clientX;
  const cy = e.clientY ?? e.touches?.[0].clientY;

  const dx = cx - lastX;
  const dy = cy - lastY;

  rotY += dx * 0.4;
  rotX -= dy * 0.4;

  velX = dx * 0.4;
  velY = dy * 0.4;

  lastX = cx;
  lastY = cy;
  applyRotation();
}

function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;
  startInertia();
}

function startInertia() {
  const FRICTION = 0.93;
  function tick() {
    velX *= FRICTION;
    velY *= FRICTION;
    if (Math.abs(velX) < 0.01 && Math.abs(velY) < 0.01) return;
    rotY += velX;
    rotX -= velY;
    applyRotation();
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
}

/* ── Scroll-to-zoom (perspective) ───────────────────────── */
let perspective = 900;
document.addEventListener('wheel', e => {
  e.preventDefault();
  perspective = Math.max(400, Math.min(2000, perspective - e.deltaY * 1.5));
  document.querySelector('.scene-wrapper').style.perspective = perspective + 'px';
}, { passive: false });

/* ── Auto-spin when idle ─────────────────────────────────── */
let idleTimer = null;
let autoSpinRaf = null;

function resetIdle() {
  clearTimeout(idleTimer);
  cancelAnimationFrame(autoSpinRaf);
  idleTimer = setTimeout(startAutoSpin, 3000);
}

function startAutoSpin() {
  function spin() {
    if (isDragging) return;
    rotY += 0.18;
    applyRotation();
    autoSpinRaf = requestAnimationFrame(spin);
  }
  autoSpinRaf = requestAnimationFrame(spin);
}

/* ── Event wiring ────────────────────────────────────────── */
window.addEventListener('mousedown',  onPointerDown);
window.addEventListener('mousemove',  onPointerMove);
window.addEventListener('mouseup',    onPointerUp);
window.addEventListener('mouseleave', onPointerUp);

window.addEventListener('touchstart', onPointerDown, { passive: true });
window.addEventListener('touchmove',  onPointerMove, { passive: true });
window.addEventListener('touchend',   onPointerUp);

['mousedown','mousemove','mouseup','touchstart','touchmove','touchend'].forEach(ev => {
  window.addEventListener(ev, resetIdle, { passive: true });
});

// Start auto-spin after initial 3s of no interaction
resetIdle();

/* ── Pixel star canvas ───────────────────────────────────── */
(function drawStars() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const GRID = 16; // pixels between possible star positions
  let stars  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // Place stars on a grid with ~12% fill so they feel pixel-aligned
    const cols = Math.ceil(canvas.width  / GRID);
    const rows = Math.ceil(canvas.height / GRID);
    stars = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.12) continue;
        stars.push({
          x: c * GRID,
          y: r * GRID,
          s: Math.random() < 0.2 ? 2 : 1,           // 1 or 2 px square
          o: Math.random() * 0.55 + 0.15,
        });
      }
    }
    render();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      ctx.fillStyle = `rgba(200,200,255,${s.o})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);             // square pixels, no anti-alias
    });
  }

  window.addEventListener('resize', resize);
  resize();
})();
