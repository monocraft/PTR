const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const QUARTERS = [
  { label: 'Q1', months: [1, 2, 3] },
  { label: 'Q2', months: [4, 5, 6] },
  { label: 'Q3', months: [7, 8, 9] },
  { label: 'Q4', months: [10, 11, 12] }
];

const state = {
  allProducts: [],
  filteredProducts: [],
  metadata: null
};

const popupState = {
  activeTrigger: null,
  activeProduct: null,
  hideTimer: null
};

const els = {
  metadataNote: document.getElementById('metadataNote'),
  brandFilter: document.getElementById('brandFilter'),
  yearFilter: document.getElementById('yearFilter'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  resetButton: document.getElementById('resetButton'),
  resultCount: document.getElementById('resultCount'),
  metrics: document.getElementById('metrics'),
  timeline: document.getElementById('timeline'),
  metricTemplate: document.getElementById('metricTemplate'),
  detailLayer: document.getElementById('detailLayer')
};

function currency(value) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : '—';
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatMonthDay(value) {
  if (!value) return 'Unknown';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((sum, num) => sum + num, 0) / nums.length;
}

function sortProducts(items, sortKey) {
  const copy = [...items];

  const sorters = {
    'date-desc': (a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''),
    'date-asc': (a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''),
    'msrp-desc': (a, b) => (typeof b.msrpUSD === 'number' ? b.msrpUSD : -Infinity) - (typeof a.msrpUSD === 'number' ? a.msrpUSD : -Infinity),
    'msrp-asc': (a, b) => (typeof a.msrpUSD === 'number' ? a.msrpUSD : Infinity) - (typeof b.msrpUSD === 'number' ? b.msrpUSD : Infinity),
    'brand-asc': (a, b) => a.brand.localeCompare(b.brand) || a.productName.localeCompare(b.productName),
    'name-asc': (a, b) => a.productName.localeCompare(b.productName)
  };

  return copy.sort(sorters[sortKey] || sorters['date-desc']);
}

function populateFilters(products) {
  const brands = [...new Set(products.map(product => product.brand))].sort();
  const years = [...new Set(products.map(product => product.releaseYear))]
    .filter(year => typeof year === 'number')
    .sort((a, b) => b - a);

  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    els.brandFilter.appendChild(option);
  });

  years.forEach(year => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    els.yearFilter.appendChild(option);
  });
}

function applyFilters() {
  const brand = els.brandFilter.value;
  const year = els.yearFilter.value;
  const search = els.searchInput.value.trim().toLowerCase();
  const sort = els.sortSelect.value;

  const results = state.allProducts.filter(product => {
    const matchesBrand = brand === 'all' || product.brand === brand;
    const matchesYear = year === 'all' || String(product.releaseYear) === year;
    const haystack = [
      product.productName,
      product.series,
      product.brand,
      ...(product.features || [])
    ].join(' ').toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesBrand && matchesYear && matchesSearch;
  });

  state.filteredProducts = sortProducts(results, sort);
  hideDetailCard(true);
  renderAll();
}

function buildMetric(label, value, subtext) {
  const node = els.metricTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.metric-label').textContent = label;
  node.querySelector('.metric-value').textContent = value;
  node.querySelector('.metric-subtext').textContent = subtext;
  return node;
}

function renderMetrics(products) {
  els.metrics.innerHTML = '';

  const msrps = products.map(product => product.msrpUSD).filter(value => typeof value === 'number');
  const years = products.map(product => product.releaseYear).filter(year => typeof year === 'number');
  const uniqueBrands = new Set(products.map(product => product.brand)).size;
  const newest = sortProducts(products, 'date-desc')[0];
  const yearSpan = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—';

  const metrics = [
    ['Visible', String(products.length), 'Releases'],
    ['Brands', String(uniqueBrands), 'Shown'],
    ['Avg MSRP', msrps.length ? currency(average(msrps)) : '—', 'Filtered'],
    ['Span', yearSpan, newest ? newest.productName : 'No results']
  ];

  metrics.forEach(([label, value, subtext]) => {
    els.metrics.appendChild(buildMetric(label, value, subtext));
  });
}

function createSourceLinks(sources) {
  const list = document.createElement('div');
  list.className = 'mini-sources';

  (sources || []).slice(0, 4).forEach(source => {
    if (!source || !source.label) return;

    if (source.url) {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      link.textContent = source.label;
      list.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = source.label;
      list.appendChild(span);
    }
  });

  return list;
}

function buildDetailCard(product) {
  const detail = document.createElement('div');
  detail.className = 'detail-card';

  const detailName = document.createElement('h5');
  detailName.className = 'hover-card-title';
  detailName.textContent = product.productName;

  const detailMeta = document.createElement('p');
  detailMeta.className = 'hover-card-meta';
  detailMeta.textContent = `${product.brand}${product.series ? ` · ${product.series}` : ''} · ${formatDate(product.releaseDate)} · ${titleCase(product.releaseType)}`;

  const detailPrice = document.createElement('p');
  detailPrice.className = 'hover-card-price';
  detailPrice.textContent = `${currency(product.msrpUSD)} · ${titleCase(product.priceStatus)}`;

  const featureLabel = document.createElement('p');
  featureLabel.className = 'hover-card-label';
  featureLabel.textContent = 'Features';

  const featureList = document.createElement('ul');
  featureList.className = 'hover-card-features';
  (product.features || []).slice(0, 6).forEach(feature => {
    const li = document.createElement('li');
    li.textContent = feature;
    featureList.appendChild(li);
  });

  const sourceLabel = document.createElement('p');
  sourceLabel.className = 'hover-card-label';
  sourceLabel.textContent = 'Sources';

  detail.append(
    detailName,
    detailMeta,
    detailPrice,
    featureLabel,
    featureList,
    sourceLabel,
    createSourceLinks(product.sources)
  );

  return detail;
}

function clearHideTimer() {
  if (popupState.hideTimer) {
    clearTimeout(popupState.hideTimer);
    popupState.hideTimer = null;
  }
}

function scheduleHideDetailCard() {
  clearHideTimer();
  popupState.hideTimer = setTimeout(() => hideDetailCard(), 120);
}

function hideDetailCard(force = false) {
  clearHideTimer();
  if (popupState.activeTrigger) {
    popupState.activeTrigger.classList.remove('is-active');
  }
  popupState.activeTrigger = null;
  popupState.activeProduct = null;
  els.detailLayer.classList.remove('visible');
  if (force) {
    els.detailLayer.innerHTML = '';
  }
}

function positionDetailCard(trigger) {
  const layer = els.detailLayer;
  if (!trigger || !layer.classList.contains('visible')) return;

  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  const layerWidth = Math.min(layer.offsetWidth || 340, window.innerWidth - (margin * 2));
  const layerHeight = Math.min(layer.offsetHeight || 200, window.innerHeight - (margin * 2));

  let left = rect.right + margin;
  if (left + layerWidth > window.innerWidth - margin) {
    left = rect.left - layerWidth - margin;
  }
  if (left < margin) {
    left = margin;
  }

  let top = rect.top;
  if (top + layerHeight > window.innerHeight - margin) {
    top = window.innerHeight - layerHeight - margin;
  }
  if (top < margin) {
    top = margin;
  }

  layer.style.left = `${Math.round(left)}px`;
  layer.style.top = `${Math.round(top)}px`;
}

function showDetailCard(trigger, product) {
  clearHideTimer();

  if (popupState.activeTrigger && popupState.activeTrigger !== trigger) {
    popupState.activeTrigger.classList.remove('is-active');
  }

  popupState.activeTrigger = trigger;
  popupState.activeProduct = product;
  trigger.classList.add('is-active');

  els.detailLayer.innerHTML = '';
  els.detailLayer.appendChild(buildDetailCard(product));
  els.detailLayer.classList.add('visible');

  requestAnimationFrame(() => positionDetailCard(trigger));
}

function buildReleasePeek(product) {
  const item = document.createElement('article');
  item.className = 'release-peek';
  item.tabIndex = 0;

  const top = document.createElement('div');
  top.className = 'release-peek-top';

  const date = document.createElement('span');
  date.className = 'release-date-pill';
  date.textContent = formatMonthDay(product.releaseDate);

  const type = document.createElement('span');
  type.className = 'release-kind';
  type.textContent = titleCase(product.releaseType);

  top.append(date, type);

  const name = document.createElement('h4');
  name.className = 'release-peek-name';
  name.textContent = product.productName;

  const brand = document.createElement('p');
  brand.className = 'release-peek-brand';
  brand.textContent = `${product.brand}${product.series ? ` · ${product.series}` : ''}`;

  item.append(top, name, brand);

  item.addEventListener('mouseenter', () => showDetailCard(item, product));
  item.addEventListener('mouseleave', scheduleHideDetailCard);
  item.addEventListener('focus', () => showDetailCard(item, product));
  item.addEventListener('blur', scheduleHideDetailCard);
  item.addEventListener('click', event => {
    event.stopPropagation();
    if (popupState.activeTrigger === item && els.detailLayer.classList.contains('visible')) {
      hideDetailCard(true);
      return;
    }
    showDetailCard(item, product);
  });

  return item;
}

function groupProductsByYearMonth(products) {
  const map = new Map();

  sortProducts(products, 'date-asc').forEach(product => {
    if (typeof product.releaseYear !== 'number') return;
    if (typeof product.releaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(product.releaseDate)) return;

    const month = Number(product.releaseDate.slice(5, 7));
    if (!month || month < 1 || month > 12) return;

    const key = `${product.releaseYear}-${String(month).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(product);
  });

  return map;
}

function getVisibleYears(products) {
  const selectedYear = els.yearFilter.value;
  if (selectedYear !== 'all') {
    return [Number(selectedYear)].filter(Number.isFinite);
  }

  return [...new Set(products.map(product => product.releaseYear))]
    .filter(year => typeof year === 'number')
    .sort((a, b) => a - b);
}

function buildMonthCard(year, monthNumber, productsInMonth) {
  const monthCard = document.createElement('section');
  monthCard.className = 'month-card';

  const head = document.createElement('div');
  head.className = 'month-head';

  const title = document.createElement('h4');
  title.className = 'month-title';
  title.textContent = MONTH_NAMES[monthNumber - 1];

  const count = document.createElement('span');
  count.className = 'month-count';
  count.textContent = String(productsInMonth.length);

  head.append(title, count);

  const body = document.createElement('div');
  body.className = 'month-body';

  if (!productsInMonth.length) {
    const empty = document.createElement('p');
    empty.className = 'month-empty';
    empty.textContent = 'No release';
    body.appendChild(empty);
  } else {
    productsInMonth.forEach(product => {
      body.appendChild(buildReleasePeek(product));
    });
  }

  monthCard.append(head, body);
  return monthCard;
}

function buildQuarterCard(year, quarter, byYearMonth) {
  const quarterCard = document.createElement('section');
  quarterCard.className = 'quarter-card';

  const total = quarter.months.reduce((sum, monthNumber) => {
    const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
    return sum + (byYearMonth.get(key) || []).length;
  }, 0);

  const head = document.createElement('div');
  head.className = 'quarter-head';

  const title = document.createElement('h3');
  title.className = 'quarter-title';
  title.textContent = quarter.label;

  const badge = document.createElement('span');
  badge.className = 'year-count';
  badge.textContent = `${total} rel`;

  head.append(title, badge);

  const months = document.createElement('div');
  months.className = 'quarter-months';

  quarter.months.forEach(monthNumber => {
    const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const productsInMonth = byYearMonth.get(key) || [];
    months.appendChild(buildMonthCard(year, monthNumber, productsInMonth));
  });

  quarterCard.append(head, months);
  return quarterCard;
}

function enableHorizontalWheelScroll(container) {
  container.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    container.scrollLeft += event.deltaY;
    hideDetailCard(true);
    event.preventDefault();
  }, { passive: false });
}

function attachSyncedScrollbar(viewport, strip) {
  const shell = document.createElement('div');
  shell.className = 'timeline-scroll-shell';

  const scrollbar = document.createElement('div');
  scrollbar.className = 'year-scrollbar';

  const inner = document.createElement('div');
  inner.className = 'year-scrollbar-inner';
  scrollbar.appendChild(inner);

  shell.append(viewport, scrollbar);

  let syncing = false;

  const syncWidths = () => {
    inner.style.width = `${strip.scrollWidth}px`;
  };

  const syncFromViewport = () => {
    if (syncing) return;
    syncing = true;
    scrollbar.scrollLeft = viewport.scrollLeft;
    requestAnimationFrame(() => {
      syncing = false;
    });
  };

  const syncFromScrollbar = () => {
    if (syncing) return;
    syncing = true;
    viewport.scrollLeft = scrollbar.scrollLeft;
    hideDetailCard(true);
    requestAnimationFrame(() => {
      syncing = false;
    });
  };

  viewport.addEventListener('scroll', syncFromViewport, { passive: true });
  scrollbar.addEventListener('scroll', syncFromScrollbar, { passive: true });

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(syncWidths);
    observer.observe(viewport);
    observer.observe(strip);
  }

  requestAnimationFrame(syncWidths);
  return shell;
}

function scrollToLatestYear(viewport) {
  const panels = viewport.querySelectorAll('.year-snap-item');
  if (!panels.length) return;
  const lastPanel = panels[panels.length - 1];
  viewport.scrollLeft = lastPanel.offsetLeft;
}

function renderTimeline(products) {
  els.timeline.innerHTML = '';

  if (!products.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No releases match the current filters.';
    els.timeline.appendChild(empty);
    return;
  }

  const years = getVisibleYears(products);
  if (!years.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No valid release years found.';
    els.timeline.appendChild(empty);
    return;
  }

  const byYearMonth = groupProductsByYearMonth(products);
  const viewport = document.createElement('div');
  viewport.className = 'year-snap-viewport';

  const strip = document.createElement('div');
  strip.className = 'year-strip';

  years.forEach(year => {
    const snapItem = document.createElement('div');
    snapItem.className = 'year-snap-item';

    const yearPanel = document.createElement('section');
    yearPanel.className = 'year-panel';

    const head = document.createElement('div');
    head.className = 'year-panel-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'year-title-wrap';

    const title = document.createElement('h3');
    title.className = 'year-title';
    title.textContent = String(year);

    const subtitle = document.createElement('span');
    subtitle.className = 'year-subtitle';
    subtitle.textContent = '12 months · quarter split';

    titleWrap.append(title, subtitle);

    const total = Array.from({ length: 12 }, (_, index) => index + 1).reduce((sum, monthNumber) => {
      const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
      return sum + (byYearMonth.get(key) || []).length;
    }, 0);

    const count = document.createElement('span');
    count.className = 'year-count';
    count.textContent = `${total} releases`;

    head.append(titleWrap, count);

    const quarterGrid = document.createElement('div');
    quarterGrid.className = 'quarter-grid';
    QUARTERS.forEach(quarter => {
      quarterGrid.appendChild(buildQuarterCard(year, quarter, byYearMonth));
    });

    yearPanel.append(head, quarterGrid);
    snapItem.appendChild(yearPanel);
    strip.appendChild(snapItem);
  });

  viewport.appendChild(strip);
  viewport.addEventListener('scroll', () => hideDetailCard(true), { passive: true });
  els.timeline.appendChild(attachSyncedScrollbar(viewport, strip));
  enableHorizontalWheelScroll(viewport);

  if (els.yearFilter.value === 'all') {
    requestAnimationFrame(() => scrollToLatestYear(viewport));
  }
}

function renderMetadata() {
  const metadata = state.metadata;
  if (!metadata) return;

  const years = state.allProducts.map(product => product.releaseYear).filter(year => typeof year === 'number');
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  els.metadataNote.classList.remove('loading');
  els.metadataNote.textContent = `${metadata.brands.join(' • ')} · ${state.allProducts.length} releases · ${minYear}–${maxYear}`;
}

function renderAll() {
  const products = state.filteredProducts;
  els.resultCount.textContent = `${products.length} visible`;
  renderMetrics(products);
  renderTimeline(products);
}

function bindEvents() {
  [els.brandFilter, els.yearFilter, els.sortSelect].forEach(element => {
    element.addEventListener('change', applyFilters);
  });

  els.searchInput.addEventListener('input', applyFilters);

  els.resetButton.addEventListener('click', () => {
    els.brandFilter.value = 'all';
    els.yearFilter.value = 'all';
    els.searchInput.value = '';
    els.sortSelect.value = 'date-desc';
    applyFilters();
  });

  els.detailLayer.addEventListener('mouseenter', clearHideTimer);
  els.detailLayer.addEventListener('mouseleave', scheduleHideDetailCard);

  document.addEventListener('click', event => {
    if (!event.target.closest('.release-peek') && !event.target.closest('#detailLayer')) {
      hideDetailCard(true);
    }
  });

  window.addEventListener('resize', () => {
    if (popupState.activeTrigger) {
      positionDetailCard(popupState.activeTrigger);
    }
  });

  window.addEventListener('scroll', () => hideDetailCard(true), { passive: true });
}

async function init() {
  try {
    const response = await fetch('./data/headsets.json');
    if (!response.ok) {
      throw new Error(`Failed to load dataset: ${response.status}`);
    }

    const payload = await response.json();
    state.metadata = payload.metadata || null;
    state.allProducts = Array.isArray(payload.products) ? payload.products : [];
    state.filteredProducts = sortProducts(state.allProducts, 'date-desc');

    populateFilters(state.allProducts);
    renderMetadata();
    bindEvents();
    renderAll();
  } catch (error) {
    els.metadataNote.classList.remove('loading');
    els.metadataNote.textContent = `Could not load dataset. ${error.message}`;
    console.error(error);
  }
}

init();
