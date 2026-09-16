(() => {
  const carousel = document.querySelector('.gifted-gallery');
  if (!carousel) return;

  const wrap = carousel.closest('.gifted-gallery-wrap');
  const track = carousel.querySelector('.gifted-gallery-track');
  const slides = [...carousel.querySelectorAll('.gifted-gallery-slide')];
  const prev = carousel.querySelector('[data-gifted-prev]');
  const next = carousel.querySelector('[data-gifted-next]');
  const dotsWrap = wrap?.querySelector('.gifted-gallery-dots');
  if (!track || !slides.length || !dotsWrap) return;

  let index = 0;
  let startX = 0;
  let currentX = 0;

  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gifted-gallery-dot';
    dot.setAttribute('aria-label', `Show image ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  const dots = [...dotsWrap.children];

  function goTo(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(${-index * 100}%)`;
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== index)));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  prev?.addEventListener('click', () => goTo(index - 1));
  next?.addEventListener('click', () => goTo(index + 1));

  carousel.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') goTo(index - 1);
    if (event.key === 'ArrowRight') goTo(index + 1);
  });

  carousel.addEventListener('touchstart', event => {
    startX = event.touches[0]?.clientX || 0;
    currentX = startX;
  }, { passive:true });

  carousel.addEventListener('touchmove', event => {
    currentX = event.touches[0]?.clientX || startX;
  }, { passive:true });

  carousel.addEventListener('touchend', () => {
    const delta = currentX - startX;
    if (Math.abs(delta) > 45) goTo(index + (delta < 0 ? 1 : -1));
  });

  goTo(0);
})();
