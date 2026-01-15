// Mobile Menu Script - Handles mobile menu toggle and links
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuIcon = document.getElementById('mobile-menu-icon');

  if (mobileMenuButton && mobileMenu && mobileMenuIcon) {
    mobileMenuButton.addEventListener('click', function() {
      const isHidden = mobileMenu.classList.contains('hidden');

      if (isHidden) {
        // Open menu
        mobileMenu.classList.remove('hidden');
        mobileMenuIcon.classList.remove('fa-bars');
        mobileMenuIcon.classList.add('fa-times');
      } else {
        // Close menu
        mobileMenu.classList.add('hidden');
        mobileMenuIcon.classList.remove('fa-times');
        mobileMenuIcon.classList.add('fa-bars');
      }
    });

    // Close menu when clicking on a link
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.add('hidden');
        mobileMenuIcon.classList.remove('fa-times');
        mobileMenuIcon.classList.add('fa-bars');
      });
    });
  }
});
