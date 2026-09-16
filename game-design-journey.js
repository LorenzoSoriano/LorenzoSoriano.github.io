(() => {
  if (document.body.dataset.page !== 'game-design') return;

  const wrap = document.querySelector('.design-journey-wrap');
  const grid = document.querySelector('.design-journey-grid');
  const cards = [...document.querySelectorAll('.design-journey-card')];
  if (!wrap || !grid || !cards.length) return;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('design-journey-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');

  const defs = document.createElementNS(NS, 'defs');
  const gradient = document.createElementNS(NS, 'linearGradient');
  gradient.id = 'designJourneyGradient';
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('y1', '0');
  gradient.setAttribute('x2', '0');
  gradient.setAttribute('y2', '1');

  [
    ['0%', '#796cf0'],
    ['42%', '#5ea0f0'],
    ['72%', '#796cf0'],
    ['100%', '#f4d75c']
  ].forEach(([offset, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    gradient.appendChild(stop);
  });

  defs.appendChild(gradient);
  svg.appendChild(defs);

  const path = document.createElementNS(NS, 'path');
  path.classList.add('design-journey-line');
  svg.appendChild(path);
  wrap.prepend(svg);

  function offsetWithin(element, ancestor, axis) {
    let value = 0;
    let node = element;
    const key = axis === 'x' ? 'offsetLeft' : 'offsetTop';
    while (node && node !== ancestor) {
      value += node[key] || 0;
      node = node.offsetParent;
    }
    return value;
  }

  function routeAxisX() {
    const gridLeft = offsetWithin(grid, wrap, 'x');
    if (window.matchMedia('(max-width:620px)').matches) return gridLeft + 12;
    if (window.matchMedia('(max-width:980px)').matches) return gridLeft + 18;
    return gridLeft + grid.offsetWidth / 2;
  }

  function redraw() {
    const width = wrap.clientWidth;
    const height = wrap.scrollHeight;
    if (!width || !height) return;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const axisX = routeAxisX();
    const nodeYs = cards.map(card => offsetWithin(card, wrap, 'y') + card.offsetHeight / 2);
    const startY = Math.max(0, nodeYs[0] - 90);
    const endY = Math.min(height, nodeYs[nodeYs.length - 1] + 90);
    const anchors = [startY, ...nodeYs, endY];
    const mobile = window.matchMedia('(max-width:980px)').matches;
    const amplitude = mobile ? 18 : 38;

    let d = `M ${axisX.toFixed(2)} ${anchors[0].toFixed(2)}`;
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const y0 = anchors[i];
      const y1 = anchors[i + 1];
      const dy = y1 - y0;
      const side = i % 2 === 0 ? 1 : -1;
      const curve = Math.min(amplitude, Math.max(12, dy * .22));
      const cx = axisX + side * curve;
      d += ` C ${cx.toFixed(2)} ${(y0 + dy * .32).toFixed(2)}, ${cx.toFixed(2)} ${(y0 + dy * .68).toFixed(2)}, ${axisX.toFixed(2)} ${y1.toFixed(2)}`;
    }

    path.setAttribute('d', d);
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('y1', startY.toFixed(2));
    gradient.setAttribute('y2', endY.toFixed(2));
  }

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(redraw);
  };

  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('load', schedule, { once:true });
  document.fonts?.ready?.then(schedule);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    observer.observe(wrap);
    observer.observe(grid);
    cards.forEach(card => observer.observe(card));
  }

  schedule();
})();
