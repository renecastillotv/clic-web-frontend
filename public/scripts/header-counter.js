// Header Counter Script - Updates favorites counter in header
function updateSimpleHeaderCounter(info) {
  const counter = document.getElementById('favorites-counter');
  if (!counter) return;

  console.log('📢 Updating header counter:', info.count);

  if (info.count > 0) {
    counter.textContent = info.count > 99 ? '99+' : info.count.toString();
    counter.classList.remove('hidden');
  } else {
    counter.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Setting up header counter');

  if (window.simpleFavoritesManager) {
    window.simpleFavoritesManager.addListener(updateSimpleHeaderCounter);
  }
});
