(() => {
  if (document.body.dataset.page !== 'game-design') return;

  const pageMain = document.querySelector('.page-main');
  const section = document.querySelector('.design-journey-section');
  const grid = document.querySelector('.design-journey-grid');
  const cards = [...document.querySelectorAll('.design-journey-card')];
  const flowSections = [...pageMain?.querySelectorAll(':scope > section') || []];
  if (!pageMain || !section || !grid || !cards.length || !flowSections.length) return;

  pageMain.style.position = 'relative';
  pageMain.style.isolation = 'isolate';
  pageMain.style.overflow = CSS.supports('overflow', 'clip') ? 'clip' : 'hidden';
  flowSections.forEach(item => {
    item.style.position = 'relative';
    item.style.zIndex = '1';
  });

  const makeDivider = modifier => {
    const divider = document.createElement('div');
    divider.className = `design-journey-divider design-journey-divider--${modifier}`;
    divider.setAttribute('aria-hidden', 'true');
    const node = document.createElement('span');
    node.className = 'design-journey-divider-node';
    divider.appendChild(node);
    return { divider, node };
  };

  const startDivider = makeDivider('start');
  const endDivider = makeDivider('end');

  // Both portals are now real flow elements. The opening portal sits between
  // the page intro and the journey, while the closing portal sits immediately
  // before the footer. This keeps both visible even with page clipping enabled.
  pageMain.insertBefore(startDivider.divider, section);
  pageMain.appendChild(endDivider.divider);

  [startDivider, endDivider].forEach(({ divider }) => {
    Object.assign(divider.style, {
      position: 'relative',
      left: '0',
      right: 'auto',
      width: '100%',
      transform: 'none',
      margin: '0'
    });
  });

  // Keep the skills section close to the final boundary.
  const lastContentSection = flowSections[flowSections.length - 1];
  lastContentSection.style.paddingBottom = '52px';

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('design-journey-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.position = 'absolute';
  svg.style.inset = '0 auto auto 0';
  svg.style.width = '100%';
  svg.style.zIndex = '0';
  svg.style.pointerEvents = 'none';
  svg.style.overflow = 'hidden';

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
  pageMain.prepend(svg);

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
    const gridLeft = offsetWithin(grid, pageMain, 'x');
    if (window.matchMedia('(max-width:620px)').matches) return gridLeft + 12;
    if (window.matchMedia('(max-width:980px)').matches) return gridLeft + 18;
    return gridLeft + grid.offsetWidth / 2;
  }

  function visualNodeCenter(dividerData) {
    const dividerRect = dividerData.divider.getBoundingClientRect();
    const nodeRect = dividerData.node.getBoundingClientRect();
    return nodeRect.top + nodeRect.height / 2 - dividerRect.top;
  }

  function addIntermediateAnchors(points, maxGap = 300) {
    const result = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const previous = result[result.length - 1];
      const target = points[i];
      const gap = target - previous;
      const pieces = Math.max(1, Math.ceil(Math.abs(gap) / maxGap));
      for (let p = 1; p < pieces; p += 1) result.push(previous + gap * (p / pieces));
      result.push(target);
    }
    return result;
  }

  function redraw() {
    const width = pageMain.clientWidth;
    if (!width) return;

    const axisX = routeAxisX();
    const mobile = window.matchMedia('(max-width:980px)').matches;
    const stem = mobile ? 34 : 50;

    // Start/end are measured from the actual in-flow portal nodes, so the path
    // visibly grows out of the opening ring and terminates in the closing ring.
    const startY = offsetWithin(startDivider.divider, pageMain, 'y') + visualNodeCenter(startDivider);
    const contentBottom = offsetWithin(endDivider.divider, pageMain, 'y') + endDivider.divider.offsetHeight;
    const endY = offsetWithin(endDivider.divider, pageMain, 'y') + visualNodeCenter(endDivider);
    if (!contentBottom || endY <= startY) return;

    svg.style.height = `${contentBottom}px`;
    svg.setAttribute('viewBox', `0 0 ${width} ${contentBottom}`);

    const pageRect = pageMain.getBoundingClientRect();
    const routeViewportX = pageRect.left + axisX;
    const startRect = startDivider.divider.getBoundingClientRect();
    const endRect = endDivider.divider.getBoundingClientRect();
    startDivider.node.style.left = `${(routeViewportX - startRect.left).toFixed(2)}px`;
    endDivider.node.style.left = `${(routeViewportX - endRect.left).toFixed(2)}px`;

    const nodeYs = cards.map(card => offsetWithin(card, pageMain, 'y') + card.offsetHeight / 2);
    const anchors = addIntermediateAnchors([startY + stem, ...nodeYs, endY - stem]);
    const amplitude = mobile ? 18 : 38;

    let d = `M ${axisX.toFixed(2)} ${startY.toFixed(2)} L ${axisX.toFixed(2)} ${(startY + stem).toFixed(2)}`;

    for (let i = 0; i < anchors.length - 1; i += 1) {
      const y0 = anchors[i];
      const y1 = anchors[i + 1];
      const dy = y1 - y0;
      const side = i % 2 === 0 ? 1 : -1;
      const curve = Math.min(amplitude, Math.max(10, Math.abs(dy) * .18));
      const cx = axisX + side * curve;
      d += ` C ${cx.toFixed(2)} ${(y0 + dy * .32).toFixed(2)}, ${cx.toFixed(2)} ${(y0 + dy * .68).toFixed(2)}, ${axisX.toFixed(2)} ${y1.toFixed(2)}`;
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
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(redraw);
  };

  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('orientationchange', schedule, { passive:true });
  window.addEventListener('load', schedule, { once:true });
  document.fonts?.ready?.then(schedule);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    flowSections.forEach(item => observer.observe(item));
    observer.observe(startDivider.divider);
    observer.observe(endDivider.divider);
    observer.observe(grid);
    cards.forEach(card => observer.observe(card));
  }

  schedule();
})();