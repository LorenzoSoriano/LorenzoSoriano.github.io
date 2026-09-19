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
  let timer = null;
  let paused = false;
  let touchStartX = 0;

  const dots = slides.map((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'featured-carousel-dot';
    dot.setAttribute('aria-label', `Show ${slide.querySelector('h3')?.textContent?.trim() || `project ${i + 1}`}`);
    dot.addEventListener('click', () => {
      goTo(i, true);
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function update() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
  }

  function goTo(nextIndex, userAction = false) {
    index = (nextIndex + slides.length) % slides.length;
    update();
    if (userAction) restart();
  }

  function start() {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), 10000);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function restart() {
    stop();
    start();
  }

  prev?.addEventListener('click', () => goTo(index - 1, true));
  next?.addEventListener('click', () => goTo(index + 1, true));

  carousel.addEventListener('mouseenter', () => {
    paused = true;
    stop();
  });
  carousel.addEventListener('mouseleave', () => {
    paused = false;
    start();
  });
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', () => { if (!paused) start(); });

  carousel.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0]?.clientX || 0;
    stop();
  }, { passive: true });
  carousel.addEventListener('touchend', event => {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = endX - touchStartX;
    if (Math.abs(delta) > 45) goTo(index + (delta < 0 ? 1 : -1), true);
    else start();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!paused) start();
  });

  update();
  start();
})();
