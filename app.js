const state = {
  allProducts: [],
  filteredProducts: [],
  metadata: null
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
  brandChart: document.getElementById('brandChart'),
  yearChart: document.getElementById('yearChart'),
  productGrid: document.getElementById('productGrid'),
  timeline: document.getElementById('timeline'),
  emptyState: document.getElementById('emptyState'),
  metricTemplate: document.getElementById('metricTemplate'),
  barRowTemplate: document.getElementById('barRowTemplate'),
  productTemplate: document.getElementById('productTemplate')
};

function currency(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatMonthYear(dateStr) {
  if (!dateStr) return 'Unknown month';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatMonthDay(dateStr) {
  if (!dateStr) return 'Unknown date';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return dateStr;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function titleCase(input) {
  return String(input || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function groupCount(items, keyFn) {
  const map = new Map();
  items.forEach(item => {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
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
  const brands = [...new Set(products.map(p => p.brand))].sort();
  const years = [...new Set(products.map(p => p.releaseYear))].sort((a, b) => b - a);

  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    els.brandFilter.appendChild(option);
  });

  years.forEach(year => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = year;
    els.yearFilter.appendChild(option);
  });
}

function applyFilters() {
  const brand = els.brandFilter.value;
  const year = els.yearFilter.value;
  const search = els.searchInput.value.trim().toLowerCase();
  const sort = els.sortSelect.value;

  let results = state.allProducts.filter(product => {
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

  results = sortProducts(results, sort);
  state.filteredProducts = results;
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
  const msrps = products.map(p => p.msrpUSD).filter(n => typeof n === 'number');
  const years = products.map(p => p.releaseYear);
  const coveredYears = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—';
  const uniqueBrands = new Set(products.map(p => p.brand)).size;
  const newest = products[0] ? `${products[0].brand} · ${products[0].productName}` : '—';

  const metrics = [
    ['Tracked releases', String(products.length), 'Current result set'],
    ['Brands visible', String(uniqueBrands), 'Across active filters'],
    ['Average MSRP', msrps.length ? currency(average(msrps)) : '—', 'Based on visible records'],
    ['Year span', coveredYears, `Newest visible: ${newest}`]
  ];

  metrics.forEach(([label, value, subtext]) => {
    els.metrics.appendChild(buildMetric(label, value, subtext));
  });
}

function renderBarChart(target, map, numericSort = false) {
  target.innerHTML = '';
  const rows = [...map.entries()];
  if (numericSort) {
    rows.sort((a, b) => Number(a[0]) - Number(b[0]));
  } else {
    rows.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  }

  const max = Math.max(...rows.map(([, value]) => value), 1);

  rows.forEach(([label, value]) => {
    const node = els.barRowTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.bar-title').textContent = label;
    node.querySelector('.bar-value').textContent = value;
    node.querySelector('.bar-fill').style.width = `${(value / max) * 100}%`;
    target.appendChild(node);
  });

  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No data for the current filters.';
    target.appendChild(empty);
  }
}

function renderProducts(products) {
  els.productGrid.innerHTML = '';

  products.forEach(product => {
    const node = els.productTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector('.brand-pill').textContent = product.brand;
    node.querySelector('.product-name').textContent = product.productName;
    node.querySelector('.product-series').textContent = product.series ? `Series: ${product.series}` : 'Series not specified';
    node.querySelector('.release-badge').textContent = titleCase(product.releaseType);
    node.querySelector('.release-date').textContent = formatDate(product.releaseDate);
    node.querySelector('.msrp').textContent = currency(product.msrpUSD);
    node.querySelector('.price-status').textContent = titleCase(product.priceStatus);

    const featureList = node.querySelector('.feature-list');
    (product.features || []).forEach(feature => {
      const li = document.createElement('li');
      li.textContent = feature;
      featureList.appendChild(li);
    });

    const sourceList = node.querySelector('.source-list');
    (product.sources || []).forEach(source => {
      const li = document.createElement('li');

      if (source.url) {
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.textContent = source.label;
        li.appendChild(link);
      } else {
        li.textContent = source.label;
      }

      sourceList.appendChild(li);
    });

    els.productGrid.appendChild(node);
  });

  els.emptyState.classList.toggle('hidden', products.length > 0);
}

function getMonthKey(product) {
  if (typeof product.releaseDate === 'string' && /^\d{4}-\d{2}/.test(product.releaseDate)) {
    return product.releaseDate.slice(0, 7);
  }
  return 'unknown';
}

function createSourceLinks(sources) {
  const list = document.createElement('div');
  list.className = 'mini-sources';

  (sources || []).slice(0, 2).forEach(source => {
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

function enableHorizontalWheelScroll(container) {
  container.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    container.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
}

function renderTimeline(products) {
  els.timeline.innerHTML = '';

  if (!products.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No grouped timeline to show.';
    els.timeline.appendChild(empty);
    return;
  }

  const byMonth = new Map();
  sortProducts(products, 'date-asc').forEach(product => {
    const monthKey = getMonthKey(product);
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey).push(product);
  });

  const monthKeys = [...byMonth.keys()].sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return a.localeCompare(b);
  });

  const shell = document.createElement('div');
  shell.className = 'release-board-shell';

  const hint = document.createElement('div');
  hint.className = 'release-board-hint';
  hint.textContent = 'Scroll sideways to browse launch months.';
  shell.appendChild(hint);

  const board = document.createElement('div');
  board.className = 'release-board';

  let previousYear = '';

  monthKeys.forEach(monthKey => {
    const productsInMonth = sortProducts(byMonth.get(monthKey), 'date-asc');
    const column = document.createElement('section');
    column.className = 'release-column';

    let currentYear = 'Unknown';
    let monthTitle = 'Unknown date';
    let monthSubtitle = 'Needs source verification';

    if (monthKey !== 'unknown') {
      currentYear = monthKey.slice(0, 4);
      monthTitle = formatMonthYear(`${monthKey}-01`).split(' ')[0];
      monthSubtitle = currentYear;
    }

    if (currentYear !== previousYear) {
      column.classList.add('is-year-start');
      previousYear = currentYear;
    }

    const header = document.createElement('div');
    header.className = 'release-column-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'release-column-title-wrap';

    const title = document.createElement('h3');
    title.className = 'release-column-title';
    title.textContent = monthTitle;

    const subtitle = document.createElement('p');
    subtitle.className = 'release-column-subtitle';
    subtitle.textContent = monthSubtitle;

    titleWrap.append(title, subtitle);

    const count = document.createElement('span');
    count.className = 'release-column-count';
    count.textContent = `${productsInMonth.length}`;

    header.append(titleWrap, count);
    column.appendChild(header);

    const stack = document.createElement('div');
    stack.className = 'release-card-stack';

    productsInMonth.forEach(product => {
      const card = document.createElement('article');
      card.className = 'release-mini-card';

      const top = document.createElement('div');
      top.className = 'release-mini-top';

      const day = document.createElement('span');
      day.className = 'release-mini-date';
      day.textContent = formatMonthDay(product.releaseDate);

      const type = document.createElement('span');
      type.className = 'release-mini-type';
      type.textContent = titleCase(product.releaseType);

      top.append(day, type);

      const name = document.createElement('h4');
      name.className = 'release-mini-name';
      name.textContent = product.productName;

      const brand = document.createElement('p');
      brand.className = 'release-mini-brand';
      brand.textContent = `${product.brand} · ${product.series || 'Series n/a'}`;

      const meta = document.createElement('p');
      meta.className = 'release-mini-meta';
      meta.textContent = `${currency(product.msrpUSD)} · ${titleCase(product.priceStatus)}`;

      const featureTitle = document.createElement('p');
      featureTitle.className = 'release-mini-label';
      featureTitle.textContent = 'Features';

      const features = document.createElement('ul');
      features.className = 'release-mini-features';
      (product.features || []).slice(0, 3).forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        features.appendChild(li);
      });

      const sourceTitle = document.createElement('p');
      sourceTitle.className = 'release-mini-label';
      sourceTitle.textContent = 'Sources';

      card.append(top, name, brand, meta, featureTitle, features, sourceTitle, createSourceLinks(product.sources));
      stack.appendChild(card);
    });

    column.appendChild(stack);
    board.appendChild(column);
  });

  shell.appendChild(board);
  els.timeline.appendChild(shell);
  enableHorizontalWheelScroll(board);
}

function renderMetadata() {
  const metadata = state.metadata;
  if (!metadata) return;

  const brands = metadata.brands.join(', ');
  const caveats = (metadata.caveats || []).map(text => `• ${text}`).join(' ');
  els.metadataNote.classList.remove('loading');
  els.metadataNote.textContent = `Tracked brands: ${brands}. ${caveats}`;
}

function renderAll() {
  const products = state.filteredProducts;
  els.resultCount.textContent = `${products.length} visible product${products.length === 1 ? '' : 's'}`;

  renderMetrics(products);
  renderBarChart(els.brandChart, groupCount(products, p => p.brand));
  renderBarChart(els.yearChart, groupCount(products, p => p.releaseYear), true);
  renderProducts(products);
  renderTimeline(products);
}

function bindEvents() {
  [els.brandFilter, els.yearFilter, els.sortSelect].forEach(el => {
    el.addEventListener('change', applyFilters);
  });

  els.searchInput.addEventListener('input', applyFilters);

  els.resetButton.addEventListener('click', () => {
    els.brandFilter.value = 'all';
    els.yearFilter.value = 'all';
    els.searchInput.value = '';
    els.sortSelect.value = 'date-desc';
    applyFilters();
  });
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
