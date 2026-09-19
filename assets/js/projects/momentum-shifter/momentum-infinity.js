(() => {
  const init = () => {
    const path = document.getElementById('msInfinityPath');
    const arrows = Array.from(document.querySelectorAll('.ms-infinity-track__arrow'));
    if (!path || !arrows.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const length = path.getTotalLength();
    const duration = 8500;
    const tangentStep = Math.max(1.5, length * 0.0015);

    const placeArrow = (arrow, progress) => {
      const wrapped = ((progress % 1) + 1) % 1;
      const distance = wrapped * length;
      const point = path.getPointAtLength(distance);
      const next = path.getPointAtLength((distance + tangentStep) % length);
      const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
      arrow.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
    };

    // Fixed starting positions:
    // .46 = just before the central crossing; .75 = outer area of the right loop.
    arrows.forEach(arrow => placeArrow(arrow, Number(arrow.dataset.phase || 0)));

    if (reduceMotion.matches) return;

    let start = performance.now();

    const frame = now => {
      const cycle = ((now - start) % duration) / duration;
      arrows.forEach(arrow => {
        const phase = Number(arrow.dataset.phase || 0);
        placeArrow(arrow, cycle + phase);
      });
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();