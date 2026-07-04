/* Terminal Status Animation - x3270 Mainframe Dialup Experience */

(function() {
  'use strict';

  // Boot sequence phases
  const bootSequence = [
    // Modem/Dialup Phase
    { text: 'DIALING HOST', duration: 800 },
    { text: 'CARRIER DETECT', duration: 600 },
    { text: 'CONNECT 9600', duration: 500 },
    { text: 'NEGOTIATING PROTOCOL', duration: 700 },
    { text: 'PARITY CHECK OK', duration: 400 },

    // Terminal Init
    { text: 'TN3270 INITIALIZING', duration: 600 },
    { text: 'EMULATION MODE: 3270', duration: 500 },
    { text: 'SCREEN SIZE: 24x80', duration: 400 },
    { text: 'KEYBOARD MAP LOADED', duration: 500 },

    // Mainframe Handshake
    { text: 'CONTACTING VTAM', duration: 700 },
    { text: 'LU SESSION REQUESTED', duration: 600 },
    { text: 'BIND ACCEPTED', duration: 400 },
    { text: 'SNA LINK ACTIVE', duration: 500 },

    // Session Establishment
    { text: 'SESSION ESTABLISHED', duration: 600 },
    { text: 'TERMINAL ATTACHED', duration: 500 },
    { text: 'TRANSACTION LOGGED', duration: 400 },

    // Visitor Tracking
    { text: 'ORIGIN TRACED', duration: 500 },
    { text: 'VISITOR LOGGED', duration: 400 },
    { text: 'HEADERS PARSED', duration: 400 },
    { text: 'GATEWAY RESOLVED', duration: 500 },
    { text: 'USER AGENT CACHED', duration: 400 },
    { text: 'ACCESS GRANTED', duration: 600 },

    // Final ready state
    { text: 'SYSTEM READY', duration: 2000 }
  ];

  // Connection interruption sequence (dialup phone pickup simulation)
  const connectionStates = [
    { text: 'CONNECTION LOST', minDuration: 1500, maxDuration: 4000 },
    { text: 'ESTABLISHING CONNECTION', minDuration: 1000, maxDuration: 2500 },
    { text: 'SESSION ESTABLISHED', minDuration: 800, maxDuration: 1500 },
    { text: 'SYSTEM READY', minDuration: 8000, maxDuration: 25000 }
  ];

  let statusElement = null;
  let statusRightElement = null;
  let isBooting = true;

  function getRandomDuration(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function updateStatus(text) {
    if (statusElement) {
      statusElement.innerHTML = '> ' + text + '<span class="blink">_</span>';
    }
  }

  function setOnlineStatus(isOnline) {
    if (statusRightElement) {
      if (isOnline) {
        statusRightElement.innerHTML = '<span class="status-dot"></span>STATUS: ONLINE';
      } else {
        statusRightElement.innerHTML = '<span class="status-dot offline"></span>STATUS: OFFLINE';
      }
    }
  }

  function runBootSequence(index) {
    if (index >= bootSequence.length) {
      isBooting = false;
      // Start the connection interruption cycle after boot
      setTimeout(startConnectionCycle, bootSequence[bootSequence.length - 1].duration);
      return;
    }

    const step = bootSequence[index];
    updateStatus(step.text);

    // Set online when we reach SYSTEM READY at end of boot
    if (step.text === 'SYSTEM READY') {
      setOnlineStatus(true);
    }

    setTimeout(function() {
      runBootSequence(index + 1);
    }, step.duration);
  }

  function startConnectionCycle() {
    runConnectionState(0);
  }

  function runConnectionState(index) {
    // Cycle through states: LOST -> ESTABLISHING -> ESTABLISHED -> READY -> repeat
    const state = connectionStates[index];
    updateStatus(state.text);

    // Update online/offline status based on connection state
    if (state.text === 'CONNECTION LOST') {
      setOnlineStatus(false);
    } else if (state.text === 'SESSION ESTABLISHED' || state.text === 'SYSTEM READY') {
      setOnlineStatus(true);
    }

    const duration = getRandomDuration(state.minDuration, state.maxDuration);

    setTimeout(function() {
      // Move to next state, loop back to 0 after SYSTEM READY
      const nextIndex = (index + 1) % connectionStates.length;
      runConnectionState(nextIndex);
    }, duration);
  }

  function init() {
    statusElement = document.querySelector('.status-left');
    statusRightElement = document.querySelector('.status-right');

    if (statusElement) {
      // Check if we're on the homepage
      var isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html';

      if (isHomepage) {
        // Full boot sequence on homepage
        updateStatus('INITIALIZING');
        setOnlineStatus(false);

        // Begin boot sequence after a short delay
        setTimeout(function() {
          runBootSequence(0);
        }, 500);
      } else {
        // Subpages start online immediately
        updateStatus('SYSTEM READY');
        setOnlineStatus(true);

        // Start connection interruption cycle after a delay
        setTimeout(startConnectionCycle, 8000);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
