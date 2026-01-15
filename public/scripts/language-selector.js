// Language Selector Script - Handles multi-language switching
document.addEventListener('DOMContentLoaded', function() {
  const languageSelector = document.getElementById('language-selector');
  const languageDropdown = document.getElementById('language-dropdown');
  const languageChevron = document.getElementById('language-chevron');
  const currentLanguageSpan = document.getElementById('current-language');

  if (!languageSelector || !languageDropdown || !languageChevron || !currentLanguageSpan) {
    console.error('Language selector elements not found');
    return;
  }

  console.log('🌍 Language selector initialized for:', window.currentLanguage);
  console.log('🌍 Available hreflang URLs:', window.hreflangData);

  // Update current language display
  const langMap = { 'es': 'ES', 'en': 'EN', 'fr': 'FR' };
  currentLanguageSpan.textContent = langMap[window.currentLanguage] || 'ES';

  // Simple language change function - trust the props
  function changeLanguage(newLang) {
    console.log('🔄 Changing language from', window.currentLanguage, 'to', newLang);

    // Skip if already in the target language
    if (newLang === window.currentLanguage) {
      console.log('✅ Already in target language, skipping');
      closeDropdown();
      return;
    }

    // Use hreflang data - trust that it's always provided
    const targetUrl = window.hreflangData[newLang];
    if (targetUrl) {
      console.log('🚀 Redirecting to:', targetUrl);
      window.location.href = targetUrl;
    } else {
      console.error('❌ No hreflang URL found for language:', newLang);
      console.error('Available hreflang data:', window.hreflangData);
    }
  }

  function closeDropdown() {
    languageDropdown.classList.add('hidden');
    languageChevron.style.transform = 'rotate(0deg)';
  }

  function openDropdown() {
    languageDropdown.classList.remove('hidden');
    languageChevron.style.transform = 'rotate(180deg)';
  }

  // Toggle dropdown
  languageSelector.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = !languageDropdown.classList.contains('hidden');
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Handle language selection
  const languageOptions = document.querySelectorAll('.language-option');
  languageOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const selectedLang = this.getAttribute('data-lang');
      changeLanguage(selectedLang);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!languageSelector.contains(e.target) && !languageDropdown.contains(e.target)) {
      closeDropdown();
    }
  });
});
