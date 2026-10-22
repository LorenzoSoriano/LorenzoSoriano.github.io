(() => {
  const carousel = document.querySelector('.featured-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.featured-carousel-track');
  const slides = [...carousel.querySelectorAll('.project-card')];
  const prev = carousel.querySelector('.featured-carousel-arrow.prev');
  const next = carousel.querySelector('.featured-carousel-arrow.next');
  const dotsWrap = carousel.querySelector('.featured-carousel-dots');
  if (!track || slides.length < 2 || !dotsWrap) return;

  let index = 0;
  const label = key => window.TRANSLATIONS?.[document.documentElement.lang]?.[key] || key;
  function updateLabels() {
    prev?.setAttribute('aria-label', label('previous'));
    next?.setAttribute('aria-label', label('next'));
    dots.forEach((dot, i) => dot.setAttribute('aria-label', `${label('show')} ${slides[i].querySelector('h3')?.textContent.trim()}`));
  }
  document.addEventListener('portfolio:language', updateLabels);
  let touchStartX = 0;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'featured-carousel-dot';
    dot.setAttribute('aria-label', `Show ${slide.querySelector('h3')?.textContent?.trim() || `project ${i + 1}`}`);
    dot.addEventListener('click', () => {
      goTo(i);
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => { dot.classList.toggle('active', i === index); dot.setAttribute('aria-pressed', String(i === index)); });
    slides.forEach((slide, i) => { slide.setAttribute('aria-hidden', String(i !== index)); slide.inert = i !== index; });
  }

  function goTo(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    update();
  }

  prev?.addEventListener('click', () => goTo(index - 1));
  next?.addEventListener('click', () => goTo(index + 1));

  carousel.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
  }, { passive: true });
  carousel.addEventListener('touchend', event => {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = endX - touchStartX;
    if (Math.abs(delta) > 45) goTo(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  update();
  updateLabels();
})();
