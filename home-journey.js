(() => {
  if (document.body.dataset.page !== 'home') return;

  if (!document.querySelector('link[data-home-thread-styles]')) {
    const threadStyles = document.createElement('link');
    threadStyles.rel = 'stylesheet';
    threadStyles.href = 'home-thread.css?v=1';
    threadStyles.dataset.homeThreadStyles = 'true';
    document.head.appendChild(threadStyles);
  }

  const main = document.querySelector('main');
  const hero = document.querySelector('.home-hero');
  const grid = document.querySelector('.portal-grid');
  const endBand = document.querySelector('.home-journey-end');
  const cards = [...document.querySelectorAll('.portal-grid .portal-card')];
  if (!main || !hero || !grid || !cards.length) return;

  if (endBand && !endBand.querySelector('.home-journey-cut')) {
    const cut = document.createElement('div');
    cut.className = 'home-journey-cut';
    cut.setAttribute('aria-hidden', 'true');
    endBand.appendChild(cut);
  }

  const NS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('home-journey-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');

  const defs = document.createElementNS(NS, 'defs');
  const gradient = document.createElementNS(NS, 'linearGradient');
  gradient.id = 'homeJourneyGradient';
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('y1', '0');
  gradient.setAttribute('x2', '0');
  gradient.setAttribute('y2', '1');

  [
    ['0%', '#796cf0'],
    ['48%', '#5ea0f0'],
    ['78%', '#796cf0'],
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
  path.classList.add('home-journey-line');
  svg.appendChild(path);
  main.prepend(svg);

  let endSvg = null;
  let endPath = null;

  if (endBand) {
    endSvg = document.createElementNS(NS, 'svg');
    endSvg.classList.add('home-journey-end-thread');
    endSvg.setAttribute('aria-hidden', 'true');
    endSvg.setAttribute('preserveAspectRatio', 'none');

    endPath = document.createElementNS(NS, 'path');
    endPath.classList.add('home-journey-end-line');
    endSvg.appendChild(endPath);
    endBand.prepend(endSvg);
  }

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
    const gridLeft = offsetWithin(grid, main, 'x');
    if (window.matchMedia('(max-width:620px)').matches) return gridLeft + 12;
    if (window.matchMedia('(max-width:980px)').matches) return gridLeft + 18;
    return gridLeft + grid.offsetWidth / 2;
  }

  function addIntermediateAnchors(points, maxGap = 270) {
    const result = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const previous = result[result.length - 1];
      const target = points[i];
      const gap = target - previous;
      const pieces = Math.ceil(gap / maxGap);
      for (let p = 1; p < pieces; p += 1) {
        result.push(previous + gap * (p / pieces));
      }
      result.push(target);
    }
    return result;
  }

  function redrawJourney() {
    const width = main.clientWidth;
    const height = main.scrollHeight;
    if (!width || !height) return;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const axisX = routeAxisX();
    const heroBottom = offsetWithin(hero, main, 'y') + hero.offsetHeight;
    const startY = Math.max(0, heroBottom - Math.min(100, hero.offsetHeight * 0.12));
    const nodeYs = cards.map(card => offsetWithin(card, main, 'y') + card.offsetHeight / 2);

    // The route never exposes a visible endpoint: it always reaches the
    // physical bottom of <main>, where the closing cap/footer hides it.
    const endY = Math.max(height - 1, nodeYs[nodeYs.length - 1] + 260);
    const anchors = addIntermediateAnchors([startY, ...nodeYs, endY]);
    const mobile = window.matchMedia('(max-width:980px)').matches;
    const amplitude = mobile ? 18 : 38;

    let d = `M ${axisX.toFixed(2)} ${anchors[0].toFixed(2)}`;

    for (let i = 0; i < anchors.length - 1; i += 1) {
      const y0 = anchors[i];
      const y1 = anchors[i + 1];
      const dy = y1 - y0;
      const side = i % 2 === 0 ? 1 : -1;
      const curve = Math.min(amplitude, Math.max(12, dy * 0.22));
      const cx = axisX + side * curve;
      const cp1y = y0 + dy * 0.32;
      const cp2y = y0 + dy * 0.68;
      d += ` C ${cx.toFixed(2)} ${cp1y.toFixed(2)}, ${cx.toFixed(2)} ${cp2y.toFixed(2)}, ${axisX.toFixed(2)} ${y1.toFixed(2)}`;
    }

    path.setAttribute('d', d);
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', startY.toFixed(2));
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', endY.toFixed(2));

    if (endBand && endSvg && endPath) {
      const bandWidth = endBand.clientWidth;
      const bandHeight = endBand.offsetHeight;
      if (bandWidth && bandHeight) {
        const bandX = offsetWithin(endBand, main, 'x');
        const localX = Math.max(18, Math.min(bandWidth - 18, axisX - bandX));
        const sway = mobile ? 16 : 34;
        const h = bandHeight;

        endSvg.setAttribute('viewBox', `0 0 ${bandWidth} ${bandHeight}`);
        endPath.setAttribute(
          'd',
          `M ${localX.toFixed(2)} -8 ` +
          `C ${(localX + sway).toFixed(2)} ${(h * .20).toFixed(2)}, ${(localX - sway).toFixed(2)} ${(h * .36).toFixed(2)}, ${localX.toFixed(2)} ${(h * .53).toFixed(2)} ` +
          `C ${(localX + sway * .76).toFixed(2)} ${(h * .69).toFixed(2)}, ${(localX - sway * .58).toFixed(2)} ${(h * .84).toFixed(2)}, ${localX.toFixed(2)} ${(h + 10).toFixed(2)}`
        );
      }
    }
  }

  let frame = 0;
  const scheduleRedraw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(redrawJourney);
  };

  window.addEventListener('resize', scheduleRedraw, { passive: true });
  window.addEventListener('load', scheduleRedraw, { once: true });
  document.fonts?.ready?.then(scheduleRedraw);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleRedraw);
    observer.observe(main);
    observer.observe(grid);
    if (endBand) observer.observe(endBand);
    cards.forEach(card => observer.observe(card));
  }

  scheduleRedraw();
})();
