import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const motionAllowed = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
gsap.registerPlugin(ScrollTrigger);
const nationModal = document.querySelector('[data-nation-modal]');
const nationOpeners = [...document.querySelectorAll('[data-nation-open]')];
const setNationLink = (selector, href) => {
  const link = nationModal?.querySelector(selector);
  if (!(link instanceof HTMLAnchorElement)) return;
  link.hidden = !href;
  link.style.display = href ? 'inline-flex' : 'none';
  if (href) link.href = href;
};
const readJson = (value, fallback = []) => {
  try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; }
};
const setupCarousel = ({ root, image, caption, count, previous, next, slides, interval = 2600, autoplay = false }) => {
  if (!(root instanceof HTMLElement) || !(image instanceof HTMLImageElement) || !slides.length) return () => {};
  let index = 0;
  let timer;
  let paused = !autoplay || !motionAllowed || window.matchMedia('(hover: hover)').matches;
  const render = () => {
    const slide = slides[index];
    image.src = slide.src;
    image.alt = slide.alt || '';
    if (caption) caption.textContent = slide.caption || slide.name || '';
    if (count) count.textContent = `${index + 1} / ${slides.length}`;
  };
  const stop = () => { window.clearInterval(timer); timer = undefined; };
  const start = () => {
    stop();
    if (paused || !motionAllowed || slides.length < 2) return;
    timer = window.setInterval(() => { index = (index + 1) % slides.length; render(); }, interval);
  };
  const move = (amount) => { index = (index + amount + slides.length) % slides.length; render(); start(); };
  const onPrevious = () => move(-1);
  const onNext = () => move(1);
  const onPointerEnter = () => { if (autoplay && motionAllowed) { paused = false; start(); } };
  const onPointerLeave = () => { if (autoplay) { paused = true; stop(); } };
  const onKeydown = (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  };
  let pointerStart;
  const onPointerDown = (event) => { pointerStart = event.clientX; };
  const onPointerUp = (event) => {
    if (pointerStart === undefined) return;
    const distance = event.clientX - pointerStart;
    if (Math.abs(distance) > 48) move(distance > 0 ? -1 : 1);
    pointerStart = undefined;
  };
  previous?.addEventListener('click', onPrevious);
  next?.addEventListener('click', onNext);
  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('pointerdown', onPointerDown, { passive: true });
  root.addEventListener('pointerup', onPointerUp, { passive: true });
  render();
  if (autoplay && motionAllowed && window.matchMedia('(hover: none)').matches) { paused = false; start(); }
  return () => {
    stop();
    previous?.removeEventListener('click', onPrevious);
    next?.removeEventListener('click', onNext);
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointerup', onPointerUp);
  };
};
let activeCarouselStops = [];
const openNationModal = (opener) => {
  if (!(nationModal instanceof HTMLDialogElement) || nationModal.open) return;
  const { title = 'YMR retreat', eyebrow = 'YMR ACROSS NATIONS', country = '', location = '', summary = '', extended: extendedJson = '[]', gallery: galleryJson = '[]', ministers: ministersJson = '[]', youtubeId = '', youtubeNextId = '', instagram = '', registerUrl = '', mapUrl = '' } = opener.dataset;
  const modalTitle = nationModal.querySelector('[data-nation-modal-title]');
  const modalFlag = nationModal.querySelector('[data-nation-modal-flag]');
  const modalKicker = nationModal.querySelector('[data-nation-modal-kicker]');
  const modalHeadline = nationModal.querySelector('[data-nation-modal-headline]');
  const modalSummary = nationModal.querySelector('[data-nation-modal-summary]');
  const modalExtended = nationModal.querySelector('[data-nation-modal-extended]');
  const modalYoutube = nationModal.querySelector('[data-nation-youtube]');
  const modalVideo = nationModal.querySelector('[data-nation-video]');
  const gallery = readJson(galleryJson);
  const extended = readJson(extendedJson);
  const ministers = readJson(ministersJson);
  activeCarouselStops.forEach((stop) => stop());
  activeCarouselStops = [];

  if (modalTitle) modalTitle.textContent = title;
  const isUSA = country === 'US';
  nationModal.dataset.nationCountry = country;
  if (modalFlag) {
    const flag = { CA: '🇨🇦', GB: '🇬🇧', US: '🇺🇸' }[country];
    modalFlag.textContent = flag || '';
    modalFlag.hidden = !flag;
    modalFlag.setAttribute('aria-label', `${({ CA: 'Canada', GB: 'United Kingdom', US: 'United States' })[country] || ''} flag`);
  }
  if (modalKicker) modalKicker.textContent = `${eyebrow} · YMR GLOBAL`;
  if (modalHeadline) modalHeadline.textContent = isUSA ? 'Purpose, fellowship and Kingdom influence.' : 'A shared purpose.';
  if (modalSummary) modalSummary.textContent = summary;
  if (modalExtended instanceof HTMLElement) {
    modalExtended.replaceChildren();
    extended.forEach(({ title: sectionTitle, text }) => {
      const section = document.createElement('article');
      section.className = 'nation-modal__overview-block';
      const heading = document.createElement('h4');
      heading.textContent = sectionTitle;
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      section.append(heading, paragraph);
      modalExtended.append(section);
    });
  }
  const ministerSection = nationModal.querySelector('[data-minister-section]');
  const ministerPlaceholder = nationModal.querySelector('[data-minister-placeholder]');
  const ministerCarousel = nationModal.querySelector('[data-minister-carousel]');
  const placeholderFlag = nationModal.querySelector('[data-minister-placeholder-flag]');
  const fullGallerySection = nationModal.querySelector('[data-full-gallery-section]');
  const fullGalleryTitle = nationModal.querySelector('[data-full-gallery-title]');
  const sessionsSection = nationModal.querySelector('[data-nation-sessions-section]');
  const allSlides = [...gallery, ...ministers.map(({ name, src, alt }) => ({ src, alt, caption: name }))];
  ministerSection?.removeAttribute('hidden');
  ministerPlaceholder?.toggleAttribute('hidden', ministers.length > 0);
  ministerCarousel?.toggleAttribute('hidden', ministers.length === 0);
  if (placeholderFlag instanceof HTMLElement) placeholderFlag.textContent = ({ CA: '🇨🇦', GB: '🇬🇧', US: '🇺🇸' })[country] || '🌍';
  fullGallerySection?.toggleAttribute('hidden', !allSlides.length);
  if (fullGalleryTitle) fullGalleryTitle.textContent = `${title} · Gallery`;
  const ministerImage = nationModal.querySelector('[data-minister-image]');
  const ministerCaption = nationModal.querySelector('[data-minister-caption]');
  activeCarouselStops.push(setupCarousel({
    root: nationModal.querySelector('[data-minister-carousel]'),
    image: ministerImage,
    caption: ministerCaption,
    count: nationModal.querySelector('[data-minister-count]'),
    previous: nationModal.querySelector('[data-minister-previous]'),
    next: nationModal.querySelector('[data-minister-next]'),
    slides: ministers,
  }));
  activeCarouselStops.push(setupCarousel({
    root: nationModal.querySelector('[data-full-gallery-carousel]'),
    image: nationModal.querySelector('[data-full-gallery-image]'),
    caption: nationModal.querySelector('[data-full-gallery-caption]'),
    count: nationModal.querySelector('[data-full-gallery-count]'),
    previous: nationModal.querySelector('[data-full-gallery-previous]'),
    next: nationModal.querySelector('[data-full-gallery-next]'),
    slides: allSlides,
  }));
  if (modalYoutube instanceof HTMLAnchorElement) modalYoutube.href = youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}` : `https://www.youtube.com/@PDanielOlawande/search?query=${encodeURIComponent(`${title} ${location}`)}`;
  if (modalYoutube instanceof HTMLAnchorElement) {
    const label = youtubeId ? `Open ${title} sessions on YouTube` : `Find ${title} sessions on YouTube`;
    modalYoutube.setAttribute('aria-label', label);
    modalYoutube.title = label;
  }
  if (modalVideo instanceof HTMLIFrameElement) {
    const parameters = new URLSearchParams({ autoplay: motionAllowed ? '1' : '0', mute: '1', controls: '1', playsinline: '1', rel: '0' });
    if (youtubeNextId) parameters.set('playlist', `${youtubeId},${youtubeNextId}`);
    modalVideo.src = youtubeId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${parameters}` : '';
    modalVideo.title = `${title} sessions on YouTube`;
    modalVideo.closest('.nation-modal__video')?.toggleAttribute('hidden', !youtubeId);
  }
  sessionsSection?.toggleAttribute('hidden', !youtubeId);
  setNationLink('[data-nation-instagram]', instagram);
  setNationLink('[data-nation-register]', registerUrl);
  setNationLink('[data-nation-map]', mapUrl);
  const scroll = nationModal.querySelector('.edition-modal__scroll');
  if (scroll instanceof HTMLElement) scroll.scrollTop = 0;
  nationModal.showModal();
  if (motionAllowed) gsap.fromTo(nationModal.querySelectorAll('.edition-modal__overview, .edition-modal__sessions, .edition-modal__gallery, .nation-modal__ministers, .nation-modal__full-gallery'),
    { y: 12, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: .38, stagger: .07, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
};
nationOpeners.forEach((opener) => opener.addEventListener('click', () => openNationModal(opener)));
nationModal?.querySelector('[data-close-nation]')?.addEventListener('click', () => { if (nationModal instanceof HTMLDialogElement) nationModal.close(); });
nationModal?.addEventListener('click', (event) => { if (event.target === nationModal && nationModal instanceof HTMLDialogElement) nationModal.close(); });
nationModal?.addEventListener('close', () => {
  const video = nationModal.querySelector('[data-nation-video]');
  if (video instanceof HTMLIFrameElement) video.src = '';
  activeCarouselStops.forEach((stop) => stop());
  activeCarouselStops = [];
});
if (motionAllowed) {
  gsap.fromTo('.nations-hero__copy > *', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .65, stagger: .09, ease: 'power2.out' });
  gsap.fromTo('[data-nations-hero-image]', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, delay: .12, ease: 'power2.out' });
  document.querySelectorAll('[data-nation-feature]').forEach((feature) => {
    gsap.fromTo(feature.children, { y: 16, autoAlpha: 0 }, {
      y: 0,
      autoAlpha: 1,
      duration: .55,
      stagger: .07,
      ease: 'power2.out',
      scrollTrigger: { trigger: feature, start: 'top 86%', once: true },
    });
  });
  const comingSoon = document.querySelector('.nations-coming__copy');
  if (comingSoon) gsap.fromTo(comingSoon, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, scrollTrigger: { trigger: comingSoon, start: 'top 88%', once: true } });
}
