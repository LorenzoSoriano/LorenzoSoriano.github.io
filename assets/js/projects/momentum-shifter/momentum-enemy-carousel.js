(() => {
  const init = () => {
    document.querySelectorAll('[data-enemy-carousel]').forEach(carousel => {
      const slides = Array.from(carousel.querySelectorAll('[data-enemy-slide]'));
      const dots = Array.from(carousel.querySelectorAll('[data-enemy-dot]'));
      const prev = carousel.querySelector('[data-enemy-prev]');
      const next = carousel.querySelector('[data-enemy-next]');
      if (!slides.length) return;

      let index = 0;

      const show = nextIndex => {
        index = (nextIndex + slides.length) % slides.length;

        slides.forEach((slide, i) => {
          const active = i === index;
          slide.classList.toggle('is-active', active);
          slide.hidden = !active;
        });

        dots.forEach((dot, i) => {
          const active = i === index;
          dot.classList.toggle('is-active', active);
          dot.setAttribute('aria-current', active ? 'true' : 'false');
        });
      };

      prev?.addEventListener('click', () => show(index - 1));
      next?.addEventListener('click', () => show(index + 1));
      dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));

      carousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          show(index - 1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          show(index + 1);
        }
      });

      show(0);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
