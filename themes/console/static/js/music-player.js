/* ============================================================================
   CRT Music Player
   Vanilla JS HTML5-audio player driving the playlist rendered by
   layouts/music/list.html. No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var app = document.querySelector('.music-app');
  if (!app) return;

  var audio   = document.getElementById('mp-audio');
  var listEl  = document.getElementById('mp-list');
  var items   = Array.prototype.slice.call(listEl.querySelectorAll('.mp-track'));
  if (!items.length) return;

  // Controls
  var playBtn    = document.getElementById('mp-play');
  var prevBtn    = document.getElementById('mp-prev');
  var nextBtn    = document.getElementById('mp-next');
  var shuffleBtn = document.getElementById('mp-shuffle');
  var repeatBtn  = document.getElementById('mp-repeat');
  var muteBtn    = document.getElementById('mp-mute');
  var seek       = document.getElementById('mp-seek');
  var vol        = document.getElementById('mp-vol');
  var curEl      = document.getElementById('mp-current');
  var durEl      = document.getElementById('mp-duration');
  var titleEl    = document.getElementById('mp-title');
  var artistEl   = document.getElementById('mp-artist');
  var coverEl    = document.getElementById('mp-cover');

  // Build track model from the DOM (single source of truth = rendered playlist)
  var tracks = items.map(function (li) {
    return {
      el: li,
      src: li.getAttribute('data-src'),
      title: li.getAttribute('data-title') || 'Untitled',
      artist: li.getAttribute('data-artist') || '',
      album: li.getAttribute('data-album') || '',
      cover: li.getAttribute('data-cover') || ''
    };
  });

  var current = -1;
  var isSeeking = false;
  var shuffle = false;
  var repeat = false;

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function playIcon(btn, playing) {
    var i = btn.querySelector('i');
    if (!i) return;
    i.className = playing ? 'bi bi-pause-fill' : 'bi bi-play-fill';
  }

  function setCover(t) {
    if (t.cover) {
      coverEl.style.backgroundImage = 'url("' + t.cover + '")';
      coverEl.classList.add('has-art');
    } else {
      coverEl.style.backgroundImage = '';
      coverEl.classList.remove('has-art');
    }
  }

  function load(index, autoplay) {
    if (index < 0 || index >= tracks.length) return;
    var t = tracks[index];

    // clear previous row state
    tracks.forEach(function (tr) {
      tr.el.classList.remove('playing');
      playIcon(tr.el.querySelector('.mp-track-play'), false);
    });

    current = index;
    audio.src = t.src;
    titleEl.textContent = t.title;
    var sub = t.artist || 'Unknown artist';
    if (t.album) sub += ' · ' + t.album;
    artistEl.textContent = sub;
    setCover(t);

    t.el.classList.add('playing');
    if (autoplay) {
      audio.play().catch(function () { /* autoplay may be blocked */ });
    }
  }

  function togglePlay() {
    if (current === -1) { load(0, true); return; }
    if (audio.paused) audio.play(); else audio.pause();
  }

  function nextIndex() {
    if (shuffle && tracks.length > 1) {
      var r;
      do { r = Math.floor(Math.random() * tracks.length); } while (r === current);
      return r;
    }
    return (current + 1) % tracks.length;
  }

  function prevIndex() {
    // restart if more than 3s in, else go to previous
    if (audio.currentTime > 3) { audio.currentTime = 0; return current; }
    if (shuffle && tracks.length > 1) return nextIndex();
    return (current - 1 + tracks.length) % tracks.length;
  }

  // ---- Wire playlist rows -------------------------------------------------
  tracks.forEach(function (t, i) {
    t.el.addEventListener('click', function (e) {
      // avoid double-trigger when the inner button is clicked
      if (e.target.closest('.mp-track-play')) return;
      if (i === current) { togglePlay(); } else { load(i, true); }
    });
    var b = t.el.querySelector('.mp-track-play');
    if (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (i === current) { togglePlay(); } else { load(i, true); }
      });
    }
  });

  // ---- Transport controls -------------------------------------------------
  playBtn.addEventListener('click', togglePlay);
  nextBtn.addEventListener('click', function () { load(nextIndex(), true); });
  prevBtn.addEventListener('click', function () {
    var p = prevIndex();
    if (p !== current) load(p, true);
  });

  shuffleBtn.addEventListener('click', function () {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle('active', shuffle);
  });
  repeatBtn.addEventListener('click', function () {
    repeat = !repeat;
    repeatBtn.classList.toggle('active', repeat);
  });

  // ---- Volume -------------------------------------------------------------
  vol.addEventListener('input', function () {
    audio.volume = vol.value / 100;
    audio.muted = false;
    updateMuteIcon();
  });
  muteBtn.addEventListener('click', function () {
    audio.muted = !audio.muted;
    updateMuteIcon();
  });
  function updateMuteIcon() {
    var i = muteBtn.querySelector('i');
    var v = audio.muted ? 0 : audio.volume;
    i.className = 'bi ' + (v === 0 ? 'bi-volume-mute-fill'
                          : v < 0.5 ? 'bi-volume-down-fill'
                          : 'bi-volume-up-fill');
  }

  // ---- Seeking ------------------------------------------------------------
  seek.addEventListener('input', function () {
    isSeeking = true;
    if (audio.duration) curEl.textContent = fmt(seek.value / 100 * audio.duration);
  });
  seek.addEventListener('change', function () {
    if (audio.duration) audio.currentTime = seek.value / 100 * audio.duration;
    isSeeking = false;
  });

  // ---- Audio element events ----------------------------------------------
  audio.addEventListener('play', function () {
    playIcon(playBtn, true);
    if (current > -1) playIcon(tracks[current].el.querySelector('.mp-track-play'), true);
  });
  audio.addEventListener('pause', function () {
    playIcon(playBtn, false);
    if (current > -1) playIcon(tracks[current].el.querySelector('.mp-track-play'), false);
  });
  audio.addEventListener('loadedmetadata', function () {
    durEl.textContent = fmt(audio.duration);
  });
  // Some MP3s (no VBR header) refine their duration after metadata; keep in sync
  audio.addEventListener('durationchange', function () {
    durEl.textContent = fmt(audio.duration);
    if (current > -1) {
      var cell = tracks[current].el.querySelector('.mp-track-dur');
      if (cell) cell.textContent = fmt(audio.duration);
    }
  });
  audio.addEventListener('timeupdate', function () {
    if (isSeeking || !audio.duration) return;
    seek.value = (audio.currentTime / audio.duration) * 100;
    curEl.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('ended', function () {
    if (repeat) { audio.currentTime = 0; audio.play(); return; }
    load(nextIndex(), true);
  });

  // ---- Keyboard shortcuts -------------------------------------------------
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight' && e.altKey) { load(nextIndex(), true); }
    else if (e.code === 'ArrowLeft' && e.altKey) { var p = prevIndex(); if (p !== current) load(p, true); }
  });

  // ---- Prefetch durations for the playlist (metadata only) ---------------
  tracks.forEach(function (t) {
    var durCell = t.el.querySelector('.mp-track-dur');
    if (!durCell) return;
    var probe = new Audio();
    probe.preload = 'metadata';
    var setDur = function () {
      if (isFinite(probe.duration)) durCell.textContent = fmt(probe.duration);
    };
    probe.addEventListener('loadedmetadata', setDur);
    probe.addEventListener('durationchange', setDur);
    probe.addEventListener('error', function () {
      durCell.textContent = '--:--';
    });
    probe.src = t.src;
  });

  // init volume icon
  updateMuteIcon();
})();
