(() => {
  if (document.body.dataset.page !== 'home') return;

  if (!document.querySelector('link[data-home-thread-styles]')) {
    const threadStyles = document.createElement('link');
    threadStyles.rel = 'stylesheet';
    threadStyles.href = 'home-thread.css?v=4';
    threadStyles.dataset.homeThreadStyles = 'true';
    document.head.appendChild(threadStyles);
  }

  const main = document.querySelector('main');
  const hero = document.querySelector('.home-hero');
  const grid = document.querySelector('.portal-grid');
  const cards = [...document.querySelectorAll('.portal-grid .portal-card')];
  if (!main || !hero || !grid || !cards.length) return;

  const makeDivider = modifier => {
    const divider = document.createElement('div');
    divider.className = `home-journey-divider home-journey-divider--${modifier}`;
    divider.setAttribute('aria-hidden', 'true');
    const node = document.createElement('span');
    node.className = 'home-journey-divider-node';
    divider.appendChild(node);
    main.appendChild(divider);
    return { divider, node };
  };

  const startDivider = makeDivider('start');
  const endDivider = makeDivider('end');

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
    ['100%', '#5ea0f0']
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
      for (let p = 1; p < pieces; p += 1) result.push(previous + gap * (p / pieces));
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
    const dividerHeight = window.matchMedia('(max-width:620px)').matches ? 14 : 18;
    const mobile = window.matchMedia('(max-width:980px)').matches;
    const stem = mobile ? 34 : 48;

    const startY = Math.min(height - 1, heroBottom + dividerHeight * 0.5 + 8);
    const endY = Math.max(startY + stem * 2 + 1, height - dividerHeight * 0.5);
    const nodeYs = cards.map(card => offsetWithin(card, main, 'y') + card.offsetHeight / 2);
    const anchors = addIntermediateAnchors([startY + stem, ...nodeYs, endY - stem]);
    const amplitude = mobile ? 18 : 38;

    startDivider.divider.style.top = `${(startY - dividerHeight / 2).toFixed(2)}px`;
    endDivider.divider.style.top = `${(endY - dividerHeight / 2).toFixed(2)}px`;
    startDivider.node.style.left = `${axisX.toFixed(2)}px`;
    endDivider.node.style.left = `${axisX.toFixed(2)}px`;

    // A straight stem enters/leaves each node before the route starts curving.
    // This keeps the line optically and geometrically centred on the divider nodes.
    let d = `M ${axisX.toFixed(2)} ${startY.toFixed(2)} L ${axisX.toFixed(2)} ${(startY + stem).toFixed(2)}`;

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

    d += ` L ${axisX.toFixed(2)} ${endY.toFixed(2)}`;

    path.setAttribute('d', d);
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', startY.toFixed(2));
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', endY.toFixed(2));
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
    observer.observe(hero);
    observer.observe(grid);
    cards.forEach(card => observer.observe(card));
  }

  scheduleRedraw();
})();