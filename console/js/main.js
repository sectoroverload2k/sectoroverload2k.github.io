// Console Resume - Main JavaScript

document.addEventListener('DOMContentLoaded', () => {
  // CRT Magnet cursor effect - only visible inside scanline areas
  const createMagnetEffect = () => {
    // Get all scanline containers (panels and header)
    const scanlineContainers = document.querySelectorAll('.scanline-overlay, .panel-scanline');

    scanlineContainers.forEach(container => {
      // Create magnet overlay for each container
      const magnetOverlay = document.createElement('div');
      magnetOverlay.className = 'crt-magnet';
      magnetOverlay.innerHTML = `
        <div class="magnet-rgb"></div>
        <div class="magnet-scanlines"></div>
        <div class="magnet-glow"></div>
      `;
      container.appendChild(magnetOverlay);
    });

    let mouseX = 0;
    let mouseY = 0;

    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Update each magnet overlay position relative to its container
      scanlineContainers.forEach(container => {
        const rect = container.getBoundingClientRect();
        const magnet = container.querySelector('.crt-magnet');

        // Calculate position relative to container
        const relX = mouseX - rect.left;
        const relY = mouseY - rect.top;

        // Check if mouse is inside this container
        const isInside = mouseX >= rect.left && mouseX <= rect.right &&
                         mouseY >= rect.top && mouseY <= rect.bottom;

        if (isInside) {
          magnet.style.opacity = '1';
          magnet.style.left = relX + 'px';
          magnet.style.top = relY + 'px';

          // Frequent random glitch shifts
          if (Math.random() > 0.6) {
            const rgbShift = magnet.querySelector('.magnet-rgb');
            const glitchX = (Math.random() - 0.5) * 25;
            const glitchY = (Math.random() - 0.5) * 15;
            const skew = (Math.random() - 0.5) * 10;
            rgbShift.style.transform = `translate(${glitchX}px, ${glitchY}px) skew(${skew}deg)`;
            setTimeout(() => {
              rgbShift.style.transform = 'translate(0, 0) skew(0deg)';
            }, 30 + Math.random() * 40);
          }

          // Frequent scanline distortion
          if (Math.random() > 0.5) {
            const scanlines = magnet.querySelector('.magnet-scanlines');
            const scaleY = 0.5 + Math.random() * 1;
            const scaleX = 0.9 + Math.random() * 0.2;
            scanlines.style.transform = `scaleY(${scaleY}) scaleX(${scaleX})`;
            scanlines.style.opacity = 0.4 + Math.random() * 0.6;
            setTimeout(() => {
              scanlines.style.transform = 'scaleY(1) scaleX(1)';
              scanlines.style.opacity = 0.8;
            }, 40 + Math.random() * 60);
          }

          // Random glow intensity spikes
          if (Math.random() > 0.7) {
            const glow = magnet.querySelector('.magnet-glow');
            glow.style.opacity = Math.random() * 0.5;
            glow.style.transform = `translate(-50%, -50%) scale(${0.8 + Math.random() * 0.5})`;
            setTimeout(() => {
              glow.style.opacity = 0.2;
              glow.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 50);
          }
        } else {
          magnet.style.opacity = '0';
        }
      });
    });

    // Hide all when mouse leaves window
    document.addEventListener('mouseleave', () => {
      scanlineContainers.forEach(container => {
        const magnet = container.querySelector('.crt-magnet');
        magnet.style.opacity = '0';
      });
    });
  };

  createMagnetEffect();
  // Animate skill bars on scroll
  const skillBars = document.querySelectorAll('.skill-progress');

  const animateSkillBars = () => {
    skillBars.forEach(bar => {
      const level = bar.getAttribute('data-level');
      bar.style.width = level + '%';
    });
  };

  // Intersection Observer for skill bars
  const skillsSection = document.querySelector('.skills');
  if (skillsSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateSkillBars();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(skillsSection);
  }

  // Add typing effect to header name, then subtitle
  const nameElement = document.querySelector('.glitch');
  const subtitle = document.querySelector('.subtitle');

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



  // Console boot sequence (optional - adds startup text)
  const addBootSequence = () => {
    const header = document.querySelector('.header-panel');
    if (!header) return;

    const bootText = document.createElement('div');
    bootText.className = 'boot-sequence';
    bootText.style.cssText = `
      position: absolute;
      top: 12px;
      left: 50px;
      font-size: 0.7rem;
      color: var(--accent-green);
      opacity: 0.8;
      font-family: var(--font-mono);
      z-index: 15;
      text-shadow: 0 0 4px var(--accent-green), 0 0 8px var(--glow-green), 0 0 12px var(--glow-green);
    `;
    bootText.innerHTML = '> SYSTEM INITIALIZED<span class="blink">_</span>';
    header.appendChild(bootText);

    const statusText = document.createElement('div');
    statusText.style.cssText = `
      position: absolute;
      top: 12px;
      right: 50px;
      font-size: 0.7rem;
      color: var(--accent-cyan);
      opacity: 0.8;
      font-family: var(--font-mono);
      z-index: 15;
      text-shadow: 0 0 4px var(--accent-cyan), 0 0 8px var(--glow-cyan), 0 0 12px var(--glow-cyan);
    `;
    statusText.textContent = 'STATUS: ONLINE';
    header.appendChild(statusText);
  };

  addBootSequence();

  // Intense CRT glitch effect on name
  const nameEl = document.querySelector('.header-panel h1');
  const headerContent = document.querySelector('.header-content');
  if (nameEl && headerContent) {
    const resetStyles = () => {
      nameEl.style.transform = 'none';
      nameEl.style.opacity = '1';
      nameEl.style.filter = 'none';
      nameEl.style.textShadow = `
        0 0 10px var(--glow-cyan),
        0 0 20px var(--glow-cyan),
        0 0 40px var(--glow-cyan),
        2px 2px 0 var(--bg-dark)
      `;
      headerContent.style.filter = 'none';
    };

    const doGlitch = () => {
      const glitchType = Math.floor(Math.random() * 8);

      if (glitchType === 0) {
        // Heavy horizontal shift with RGB split
        const shift = (Math.random() - 0.5) * 20;
        nameEl.style.transform = `translateX(${shift}px)`;
        nameEl.style.textShadow = `
          ${8 + Math.random() * 8}px 0 0 rgba(255, 0, 0, 0.8),
          ${-8 - Math.random() * 8}px 0 0 rgba(0, 255, 255, 0.8),
          0 0 20px var(--glow-cyan)
        `;
      } else if (glitchType === 1) {
        // Hard flicker - nearly black
        nameEl.style.opacity = '0.1';
        headerContent.style.filter = 'brightness(0.3)';
      } else if (glitchType === 2) {
        // Bright flash
        nameEl.style.opacity = '1';
        nameEl.style.filter = 'brightness(2) contrast(1.5)';
        nameEl.style.textShadow = `
          0 0 30px rgba(255, 255, 255, 0.9),
          0 0 60px var(--glow-cyan),
          0 0 90px var(--glow-cyan)
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
          0 2px 0 rgba(0, 255, 255, 0.5),
          0 -2px 0 rgba(255, 0, 0, 0.5),
          0 0 10px var(--glow-cyan)
        `;
      } else if (glitchType === 5) {
        // Screen tear - split effect
        nameEl.style.transform = `skewX(${3 + Math.random() * 5}deg)`;
        nameEl.style.clipPath = `inset(0 0 ${Math.random() * 50}% 0)`;
        nameEl.style.textShadow = `
          ${5 + Math.random() * 5}px 0 0 rgba(255, 0, 0, 0.7),
          ${-5 - Math.random() * 5}px 0 0 rgba(0, 255, 255, 0.7),
          0 0 15px var(--glow-cyan)
        `;
      } else if (glitchType === 6) {
        // Chromatic aberration intense
        nameEl.style.textShadow = `
          ${10 + Math.random() * 10}px ${Math.random() * 4}px 0 rgba(255, 0, 0, 0.9),
          ${-10 - Math.random() * 10}px ${-Math.random() * 4}px 0 rgba(0, 255, 255, 0.9),
          ${Math.random() * 5}px ${5 + Math.random() * 5}px 0 rgba(0, 255, 0, 0.5),
          0 0 20px var(--glow-cyan)
        `;
        nameEl.style.transform = `scale(1.02)`;
      } else {
        // Full chaos - everything at once
        const shift = (Math.random() - 0.5) * 15;
        const skew = (Math.random() - 0.5) * 10;
        const scaleX = 0.98 + Math.random() * 0.04;
        nameEl.style.transform = `translateX(${shift}px) skewX(${skew}deg) scaleX(${scaleX})`;
        nameEl.style.textShadow = `
          ${6 + Math.random() * 8}px 0 0 rgba(255, 0, 0, 0.8),
          ${-6 - Math.random() * 8}px 0 0 rgba(0, 255, 255, 0.8),
          0 ${Math.random() * 3}px 0 rgba(0, 255, 0, 0.5),
          0 0 30px var(--glow-cyan)
        `;
        nameEl.style.opacity = String(0.7 + Math.random() * 0.3);
        headerContent.style.filter = `brightness(${0.8 + Math.random() * 0.4})`;
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
});
