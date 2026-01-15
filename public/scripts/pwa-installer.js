// PWA Install prompt handler con localStorage para recordar dismissal
let deferredPrompt;
const PWA_DISMISSED_KEY = 'pwa_install_dismissed';
const PWA_DISMISSED_EXPIRES_KEY = 'pwa_install_dismissed_expires';
const DISMISS_DURATION_DAYS = 30; // No mostrar por 30 días si se rechaza

// Función para verificar si el prompt fue rechazado recientemente
function isPWAPromptDismissed() {
  const dismissedUntil = localStorage.getItem(PWA_DISMISSED_EXPIRES_KEY);
  if (!dismissedUntil) return false;

  const expiresAt = parseInt(dismissedUntil);
  const now = Date.now();

  if (now < expiresAt) {
    console.log('📱 PWA prompt dismissed until:', new Date(expiresAt));
    return true;
  }

  // Expiró, limpiar
  localStorage.removeItem(PWA_DISMISSED_KEY);
  localStorage.removeItem(PWA_DISMISSED_EXPIRES_KEY);
  return false;
}

// Función para marcar el prompt como rechazado
function markPWAPromptDismissed() {
  const expiresAt = Date.now() + (DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000);
  localStorage.setItem(PWA_DISMISSED_KEY, 'true');
  localStorage.setItem(PWA_DISMISSED_EXPIRES_KEY, expiresAt.toString());
  console.log('📱 PWA prompt dismissed for', DISMISS_DURATION_DAYS, 'days');
}

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('📱 PWA install prompt available');

  // Prevenir el prompt automático
  e.preventDefault();

  // Verificar si fue rechazado recientemente
  if (isPWAPromptDismissed()) {
    console.log('📱 PWA prompt was dismissed recently, skipping');
    return;
  }

  // Guardar el evento para usarlo después
  deferredPrompt = e;

  // Mostrar botón de instalación después de 10 segundos
  setTimeout(() => {
    if (deferredPrompt) {
      showInstallPrompt();
    }
  }, 10000);
});

function showInstallPrompt() {
  // No mostrar si ya existe un banner
  if (document.getElementById('pwa-install-banner')) {
    return;
  }

  // Crear banner de instalación
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; max-width: 90%; width: 400px; animation: slideUp 0.3s ease-out;">
      <div style="background: linear-gradient(135deg, #f04e00 0%, #d94400 100%); color: white; padding: 16px 20px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 12px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">📱 Instalar CLIC App</div>
          <div style="font-size: 13px; opacity: 0.95;">Acceso rápido y offline</div>
        </div>
        <button onclick="installPWA()" style="background: white; color: #f04e00; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap;">
          Instalar
        </button>
        <button onclick="dismissInstallPrompt(true)" style="background: transparent; color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 12px; border-radius: 8px; font-weight: 500; font-size: 14px; cursor: pointer;">
          ✕
        </button>
      </div>
    </div>
    <style>
      @keyframes slideUp {
        from { transform: translate(-50%, 100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(banner);
  console.log('✅ PWA install banner shown');
}

window.installPWA = async function() {
  if (!deferredPrompt) {
    console.warn('⚠️ No deferred prompt available');
    return;
  }

  try {
    // Mostrar el prompt
    deferredPrompt.prompt();

    // Esperar respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`📱 PWA install outcome: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ User accepted PWA installation');
    } else {
      console.log('❌ User dismissed PWA installation');
      markPWAPromptDismissed();
    }

    // Limpiar
    deferredPrompt = null;
    dismissInstallPrompt(false);
  } catch (error) {
    console.error('❌ Error installing PWA:', error);
    dismissInstallPrompt(false);
  }
};

window.dismissInstallPrompt = function(remember = true) {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.animation = 'slideDown 0.3s ease-out';
    setTimeout(() => banner.remove(), 300);
  }

  // Recordar que el usuario rechazó
  if (remember) {
    markPWAPromptDismissed();
  }
};

// Registrar Service Worker para caching y offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // Verificar actualizaciones cada hora
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker registration failed:', error);
      });
  });
}
