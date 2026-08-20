function onToggleChange(enableToggle) {
  console.log('onToggleChange')
}

function printValue(textValue) {
  console.log('printValue')
}

function toggleNotifications(enabled) {
  console.log('toggleNotifications')
}

function applyTheme(isDarkMode) {
  console.log('applyTheme')
}

function updateUIScale(scaleValue) {
  console.log('updateUIScale')
}

function resetScale() {
  console.log('resetScale')
}

function applyBrandColor(hexColor) {
  console.log('applyBrandColor')
}

function toggleMute(isMuted) {
  console.log('toggleMute')
}

function changeVolume(volume) {
  console.log('changeVolume')
}

function saveQuietHours(start, end) {
  console.log('saveQuietHours')
}

function updatePassword(newPassword) {
  console.log('updatePassword')
}

function exportUserData() {
  console.log('exportUserData')
}

function deleteAccount() {
  console.log('deleteAccount')
}

function pingApiEndpoint(url) {
  console.log('pingApiEndpoint')
}

function clearLocalCache() {
  console.log('clearLocalCache')
}

// ==================================================================================================== //
// DEVELOPER OPTIONS -- The only actually working thing here
// ==================================================================================================== //
async function loadExternalSettingsFromUrl(jsonUrl) {
  if (!jsonUrl) {
    console.warn('[API] No URL provided.');
    return;
  }

  console.log(`[API] Fetching external settings from: ${jsonUrl}`);

  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] Successfully loaded settings JSON:', data);

    if (data.imports) {
      // Resolve the import path relative to the JSON file's URL
      // For example, if jsonUrl is "https://imduck42.github.io/random/settings.json" and
      // data.imports is "./settings.js", it resolves to "https://imduck42.github.io/random/settings.js"
      const baseUrl       = new URL(jsonUrl, window.location.href);
      const resolvedJsUrl = new URL(data.imports, baseUrl).href;
      
      console.log(`[API] Dynamically loading associated JS: ${resolvedJsUrl}`);
      await injectScript(resolvedJsUrl);
    }

    if (typeof appendAndRenderSettings === 'function') {
      appendAndRenderSettings(data.sections || []);
    } else {
      console.warn('[Dev] Settings loaded, but "appendAndRenderSettings" parser hook is missing.');
      alert('Settings loaded successfully! Connect "appendAndRenderSettings" to update your UI.');
    }

    const urls = JSON.parse(localStorage.getItem('imports') || '[]');
    if (!urls.includes(jsonUrl)) {
      urls.push(jsonUrl);
      localStorage.setItem('imports', JSON.stringify(urls));
    }

  } catch (error) {
    console.error('[API] Failed to fetch external config:', error);
    alert(`Error loading settings: ${error.message}`);
  }
}

if (document.readyState !== 'loading') {
  const urls = JSON.parse(localStorage.getItem('imports') || '[]');
  urls.forEach(url => loadExternalSettingsFromUrl(url));
}

// Helper to inject script tags into the document
function injectScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      console.log(`[API] Script already loaded: ${src}`);
      resolve();
      return;
    }

    const script  = document.createElement('script');
    script.src    = src;
    script.type   = 'text/javascript';
    script.onload = () => {
      console.log(`[API] Script successfully evaluated: ${src}`);
      resolve();
    };
    script.onerror = () => {
      reject(new Error(`Failed to load script resource: ${src}`));
    };
    
    document.head.appendChild(script);
  });
}