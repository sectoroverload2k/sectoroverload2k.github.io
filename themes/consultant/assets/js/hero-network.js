// Animated network over the hero background: drifting nodes joined by thin
// lines, concentrated on the right and faded out toward the text on the left.
// Static single frame when the user prefers reduced motion; paused when the
// hero is off screen or the tab is hidden.
(function () {
  var canvas = document.querySelector('.hero-network');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = canvas.parentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['11,31,58', '15,124,128']; // navy, teal
  var LINK = 150;
  var nodes = [], w = 0, h = 0, running = false, visible = true, raf = 0;

  function fade(x) { // 0 on the left text area -> 1 on the right
    var t = (x / w - 0.38) / 0.3;
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(70, w * h / 16000));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: w * (0.3 + 0.7 * Math.pow(Math.random(), 0.6)),
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1.2 + Math.random() * 1.8,
        c: COLORS[Math.random() < 0.35 ? 1 : 0]
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > LINK * LINK) continue;
        var alpha = (1 - Math.sqrt(d2) / LINK) * 0.22 * Math.min(fade(a.x), fade(b.x));
        if (alpha < 0.01) continue;
        ctx.strokeStyle = 'rgba(' + a.c + ',' + alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k], f = fade(n.x);
      if (f < 0.02) continue;
      ctx.fillStyle = 'rgba(' + n.c + ',' + 0.55 * f + ')';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function step() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < w * 0.3 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  function update() {
    var should = visible && !document.hidden && !reduced;
    if (should && !running) { running = true; raf = requestAnimationFrame(step); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }

  resize(); draw();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { resize(); draw(); }, 150); });
  document.addEventListener('visibilitychange', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; update(); }).observe(hero);
  }
  update();
})();
