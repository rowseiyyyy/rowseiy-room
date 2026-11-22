// ===== Nav scroll state + progress bar =====
const nav = document.getElementById('nav');
const progressBar = document.getElementById('progressBar');

function onScroll(){
  const scrolled = window.scrollY;
  nav.classList.toggle('scrolled', scrolled > 10);

  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrolled / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';

  updateActiveLink();
}
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();

// ===== Active nav link on scroll =====
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveLink(){
  let current = '';
  const offset = 120;
  sections.forEach(sec => {
    const top = sec.offsetTop - offset;
    if (window.scrollY >= top) current = sec.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
}

// ===== Mobile menu =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

// ===== Scroll reveal =====
const revealTargets = document.querySelectorAll(
  '.section-inner > *, .skill-card, .project-card, .edu-card, .about-focus, .focus-item'
);
revealTargets.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting){
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealTargets.forEach(el => observer.observe(el));

// ===== Project detail modals =====
const modalOverlay = document.getElementById('modalOverlay');
const openTriggers = document.querySelectorAll('[data-modal-open]');
const closeTriggers = document.querySelectorAll('[data-modal-close]');
let lastFocused = null;

function openModal(id){
  const modal = document.getElementById('modal-' + id);
  if (!modal) return;
  lastFocused = document.activeElement;
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  modal.classList.add('open');
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-close').focus();
}

function closeModal(){
  modalOverlay.classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

openTriggers.forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.getAttribute('data-modal-open')));
});
closeTriggers.forEach(btn => btn.addEventListener('click', closeModal));

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});

// ===== Resume links (no file uploaded yet) =====
document.querySelectorAll('.resume-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    alert("Resume file hasn't been added yet. Drop your PDF into /assets and update the link in index.html.");
  });
});

// ===== Contact form (no backend configured) =====
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.textContent = "This form isn't connected to a backend yet — please email me directly instead.";
  formNote.style.color = 'var(--orange)';
});