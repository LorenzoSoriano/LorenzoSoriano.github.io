(() => {
  const gallery = document.querySelector('.thesis-gallery');
  if (!gallery) return;
  const track = gallery.querySelector('.thesis-gallery-track');
  const slides = [...gallery.querySelectorAll('.thesis-gallery-slide')];
  const prev = gallery.querySelector('[data-thesis-prev]');
  const next = gallery.querySelector('[data-thesis-next]');
  const dotsWrap = document.querySelector('.thesis-gallery-dots');
  if (!track || !slides.length || !dotsWrap) return;

  let index = 0;
  let timer = 0;
  let startX = 0;
  let hovering = false;

  const dots = slides.map((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thesis-gallery-dot';
    button.setAttribute('aria-label', `Go to image ${i + 1}`);
    button.addEventListener('click', () => goTo(i, true));
    dotsWrap.appendChild(button);
    return button;
  });

  function render() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  function goTo(target, reset = false) {
    index = (target + slides.length) % slides.length;
    render();
    if (reset) restartTimer();
  }

  function restartTimer() {
    clearInterval(timer);
    timer = window.setInterval(() => {
      if (!hovering && document.visibilityState === 'visible') goTo(index + 1);
    }, 9000);
  }

  prev?.addEventListener('click', () => goTo(index - 1, true));
  next?.addEventListener('click', () => goTo(index + 1, true));
  gallery.addEventListener('mouseenter', () => { hovering = true; });
  gallery.addEventListener('mouseleave', () => { hovering = false; });
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') goTo(index - 1, true);
    if (event.key === 'ArrowRight') goTo(index + 1, true);
  });
  gallery.addEventListener('touchstart', event => {
    startX = event.changedTouches[0]?.clientX || 0;
  }, { passive:true });
  gallery.addEventListener('touchend', event => {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = endX - startX;
    if (Math.abs(delta) > 45) goTo(index + (delta < 0 ? 1 : -1), true);
  }, { passive:true });

  render();
  restartTimer();
})();
