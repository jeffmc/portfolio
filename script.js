/**
 * Spherical Portfolio
 *
 * Each .panel element carries data-lat / data-lon (degrees).
 * We convert those to a CSS transform that:
 *   1. Rotates the element to its longitude around Y
 *   2. Rotates it to its latitude around X
 *   3. Translates it outward by the sphere radius
 *   4. Adds a small counter-rotation so the card face stays readable
 */

const RADIUS = 340; // must match --radius in CSS
const globe  = document.getElementById('globe');

/* ── Place panels on the sphere ─────────────────────────── */
function placePanels() {
  document.querySelectorAll('.panel').forEach(panel => {
    const lat = parseFloat(panel.dataset.lat) || 0;
    const lon = parseFloat(panel.dataset.lon) || 0;

    // Convert to radians for trig (used to optionally offset positions)
    const latR = (lat * Math.PI) / 180;
    const lonR = (lon * Math.PI) / 180;

    // Spherical → Cartesian (for reference / future use)
    // x = R·cos(lat)·sin(lon), y = -R·sin(lat), z = R·cos(lat)·cos(lon)

    /*
     * CSS 3-D transform pipeline:
     *   rotateY(lon)      — spin to the right longitude
     *   rotateX(-lat)     — tilt to the right latitude
     *   translateZ(R)     — push outward to sphere surface
     *
     * The panel naturally faces the camera (outward normal),
     * because translateZ pushes it away from the centre.
     */
    panel.style.transform = `
      rotateY(${lon}deg)
      rotateX(${-lat}deg)
      translateZ(${RADIUS}px)
    `;
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

/* ── Subtle star canvas background ──────────────────────── */
(function drawStars() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;opacity:0.55';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.7 + 0.2,
    }));
    render();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.o})`;
      ctx.fill();
    });
  }

  window.addEventListener('resize', resize);
  resize();
})();
