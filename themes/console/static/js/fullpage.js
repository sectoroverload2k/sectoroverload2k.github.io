// Fullpage CRT Console - JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // Animate skill bars on scroll
  const skillBars = document.querySelectorAll('.skill-progress');
  const crtContent = document.querySelector('.crt-content');

  const animateSkillBars = () => {
    skillBars.forEach(bar => {
      const level = bar.getAttribute('data-level');
      bar.style.width = level + '%';
    });
  };

  // Intersection Observer for skill bars
  const skillsSection = document.querySelector('.skills');
  if (skillsSection && crtContent) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateSkillBars();
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.3,
      root: crtContent
    });

    observer.observe(skillsSection);
  }

  // Add typing effect to header name, then subtitle
  const nameElement = document.querySelector('.crt-header .glitch');
  const subtitle = document.querySelector('.crt-header .subtitle');

  if (nameElement && subtitle) {
    const nameText = nameElement.textContent;
    const subtitleText = subtitle.textContent;

    // Clear both and set up for typing
    nameElement.textContent = '';
    nameElement.setAttribute('data-text', '');
    subtitle.textContent = '';
    subtitle.style.opacity = '1';

    let i = 0;
    let j = 0;

    // Type the name first
    const typeName = () => {
      if (i < nameText.length) {
        nameElement.textContent += nameText.charAt(i);
        nameElement.setAttribute('data-text', nameElement.textContent);
        i++;
        setTimeout(typeName, 80);
      } else {
        // Name done, start subtitle after a short pause
        setTimeout(typeSubtitle, 300);
      }
    };

    // Then type the subtitle
    const typeSubtitle = () => {
      if (j < subtitleText.length) {
        subtitle.textContent += subtitleText.charAt(j);
        j++;
        setTimeout(typeSubtitle, 50);
      }
    };

    setTimeout(typeName, 500);
  }

  // Intense CRT glitch effect on name
  const nameEl = document.querySelector('.crt-header h1');
  if (nameEl) {
    // Green color palette for glitch effects
    const brightGreen = 'rgba(0, 255, 136, 0.9)';
    const midGreen = 'rgba(0, 204, 100, 0.8)';
    const darkGreen = 'rgba(0, 153, 68, 0.7)';
    const dimGreen = 'rgba(51, 136, 85, 0.6)';
    const glowGreen = 'rgba(0, 255, 136, 0.5)';

    const resetStyles = () => {
      nameEl.style.transform = 'none';
      nameEl.style.opacity = '1';
      nameEl.style.filter = 'none';
      nameEl.style.textShadow = `
        0 0 10px ${glowGreen},
        0 0 20px ${glowGreen},
        0 0 40px ${glowGreen},
        2px 2px 0 var(--bg-dark)
      `;
    };

    const doGlitch = () => {
      const glitchType = Math.floor(Math.random() * 8);

      if (glitchType === 0) {
        // Heavy horizontal shift with green split
        const shift = (Math.random() - 0.5) * 20;
        nameEl.style.transform = `translateX(${shift}px)`;
        nameEl.style.textShadow = `
          ${8 + Math.random() * 8}px 0 0 ${darkGreen},
          ${-8 - Math.random() * 8}px 0 0 ${brightGreen},
          0 0 20px ${glowGreen}
        `;
      } else if (glitchType === 1) {
        // Hard flicker - nearly black
        nameEl.style.opacity = '0.1';
      } else if (glitchType === 2) {
        // Bright flash
        nameEl.style.opacity = '1';
        nameEl.style.filter = 'brightness(2) contrast(1.5)';
        nameEl.style.textShadow = `
          0 0 30px ${brightGreen},
          0 0 60px ${glowGreen},
          0 0 90px ${glowGreen}
        `;
      } else if (glitchType === 3) {
        // Major skew distortion
        const skew = (Math.random() - 0.5) * 15;
        const shift = (Math.random() - 0.5) * 10;
        nameEl.style.transform = `skewX(${skew}deg) translateX(${shift}px)`;
        nameEl.style.opacity = '0.8';
      } else if (glitchType === 4) {
        // Vertical jump + scan line effect
        const jumpY = (Math.random() - 0.5) * 8;
        nameEl.style.transform = `translateY(${jumpY}px) scaleY(${0.95 + Math.random() * 0.1})`;
        nameEl.style.textShadow = `
          0 2px 0 ${brightGreen},
          0 -2px 0 ${darkGreen},
          0 0 10px ${glowGreen}
        `;
      } else if (glitchType === 5) {
        // Screen tear - split effect
        nameEl.style.transform = `skewX(${3 + Math.random() * 5}deg)`;
        nameEl.style.clipPath = `inset(0 0 ${Math.random() * 50}% 0)`;
        nameEl.style.textShadow = `
          ${5 + Math.random() * 5}px 0 0 ${dimGreen},
          ${-5 - Math.random() * 5}px 0 0 ${brightGreen},
          0 0 15px ${glowGreen}
        `;
      } else if (glitchType === 6) {
        // Chromatic aberration intense - green shades
        nameEl.style.textShadow = `
          ${10 + Math.random() * 10}px ${Math.random() * 4}px 0 ${darkGreen},
          ${-10 - Math.random() * 10}px ${-Math.random() * 4}px 0 ${brightGreen},
          ${Math.random() * 5}px ${5 + Math.random() * 5}px 0 ${midGreen},
          0 0 20px ${glowGreen}
        `;
        nameEl.style.transform = `scale(1.02)`;
      } else {
        // Full chaos - everything at once
        const shift = (Math.random() - 0.5) * 15;
        const skew = (Math.random() - 0.5) * 10;
        const scaleX = 0.98 + Math.random() * 0.04;
        nameEl.style.transform = `translateX(${shift}px) skewX(${skew}deg) scaleX(${scaleX})`;
        nameEl.style.textShadow = `
          ${6 + Math.random() * 8}px 0 0 ${darkGreen},
          ${-6 - Math.random() * 8}px 0 0 ${brightGreen},
          0 ${Math.random() * 3}px 0 ${midGreen},
          0 0 30px ${glowGreen}
        `;
        nameEl.style.opacity = String(0.7 + Math.random() * 0.3);
      }
    };

    const triggerGlitch = () => {
      // Glitch every 1-4 seconds
      const nextGlitch = 1000 + Math.random() * 3000;

      setTimeout(() => {
        // Sometimes do rapid multiple glitches
        const burstCount = Math.random() > 0.7 ? Math.floor(2 + Math.random() * 3) : 1;

        let glitchIndex = 0;
        const doBurst = () => {
          if (glitchIndex < burstCount) {
            doGlitch();
            glitchIndex++;

            // Reset briefly between bursts
            setTimeout(() => {
              resetStyles();
              if (glitchIndex < burstCount) {
                setTimeout(doBurst, 50 + Math.random() * 50);
              }
            }, 60 + Math.random() * 100);
          }
        };

        doBurst();

        // Final reset and schedule next
        setTimeout(() => {
          resetStyles();
          nameEl.style.clipPath = 'none';
          triggerGlitch();
        }, burstCount * 200 + 100);

      }, nextGlitch);
    };

    // Start the glitch cycle after typing finishes
    setTimeout(triggerGlitch, 4000);
  }

  // Add panel load animation
  const animatePanels = () => {
    const panels = document.querySelectorAll('.panel');
    panels.forEach((panel, index) => {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(20px)';
      panel.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

      setTimeout(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      }, 100 + (index * 100));
    });
  };

  animatePanels();

  // CRT screen power-on effect (homepage only)
  const crtScreen = document.querySelector('.crt-screen');
  const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html';

  if (crtScreen && isHomepage) {
    crtScreen.style.opacity = '0';
    crtScreen.style.transform = 'scaleY(0.01)';
    crtScreen.style.transition = 'none';

    setTimeout(() => {
      crtScreen.style.transition = 'transform 0.3s ease-out';
      crtScreen.style.transform = 'scaleY(1)';

      setTimeout(() => {
        crtScreen.style.transition = 'opacity 0.5s ease-out';
        crtScreen.style.opacity = '1';
      }, 300);
    }, 100);
  }

  // Footer: User Agent (left)
  const userAgentEl = document.getElementById('user-agent');
  if (userAgentEl) {
    // Parse user agent to show a cleaner version
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (ua.includes('Firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
    } else if (ua.includes('Chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('Safari')) {
      browser = 'Safari';
    }

    // Detect OS
    if (ua.includes('Windows')) {
      os = 'Windows';
    } else if (ua.includes('Mac')) {
      os = 'macOS';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
    } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
    }

    userAgentEl.textContent = `${browser} / ${os}`;
  }

  // Footer: IP Address (center)
  const userIpEl = document.getElementById('user-ip');
  if (userIpEl) {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => {
        userIpEl.textContent = data.ip;
      })
      .catch(() => {
        userIpEl.textContent = 'IP Unavailable';
      });
  }

  // Footer: Date/Time (right)
  const datetimeEl = document.getElementById('current-datetime');
  if (datetimeEl) {
    const updateDateTime = () => {
      const now = new Date();
      const options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      datetimeEl.textContent = now.toLocaleString('en-US', options);
    };

    updateDateTime();
    setInterval(updateDateTime, 1000);
  }

  // Custom scrollbar
  const scrollContent = document.querySelector('.crt-content');
  const scrollbar = document.querySelector('.custom-scrollbar');
  const scrollThumb = document.querySelector('.custom-scrollbar-thumb');

  if (scrollContent && scrollbar && scrollThumb) {
    const updateScrollbar = () => {
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const scrollTop = scrollContent.scrollTop;
      const trackHeight = scrollbar.clientHeight;

      // Calculate thumb height (proportional to visible area)
      const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 30);
      scrollThumb.style.height = thumbHeight + 'px';

      // Calculate thumb position
      const maxScroll = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
      scrollThumb.style.top = thumbTop + 'px';

      // Hide scrollbar if content doesn't scroll
      scrollbar.style.display = scrollHeight <= clientHeight ? 'none' : 'block';
    };

    // Update on scroll
    scrollContent.addEventListener('scroll', updateScrollbar);

    // Update on resize
    window.addEventListener('resize', updateScrollbar);

    // Drag functionality
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    scrollThumb.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startScrollTop = scrollContent.scrollTop;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaY = e.clientY - startY;
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const trackHeight = scrollbar.clientHeight;
      const thumbHeight = scrollThumb.offsetHeight;

      const maxScroll = scrollHeight - clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const scrollRatio = maxScroll / maxThumbTop;

      scrollContent.scrollTop = startScrollTop + (deltaY * scrollRatio);
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });

    // Click on track to jump
    scrollbar.addEventListener('click', (e) => {
      if (e.target === scrollThumb) return;

      const rect = scrollbar.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const scrollHeight = scrollContent.scrollHeight;
      const clientHeight = scrollContent.clientHeight;
      const trackHeight = scrollbar.clientHeight;

      const scrollRatio = clickY / trackHeight;
      scrollContent.scrollTop = scrollRatio * (scrollHeight - clientHeight);
    });

    // Initial update
    updateScrollbar();

    // Update after content loads
    setTimeout(updateScrollbar, 100);
  }
});
