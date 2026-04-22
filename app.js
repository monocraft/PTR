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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const years = products.map(p => p.releaseYear).filter(year => typeof year === 'number');
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

function getVisibleYearRange(products) {
  const selectedYear = els.yearFilter.value;
  if (selectedYear !== 'all') {
    const year = Number(selectedYear);
    return Number.isFinite(year) ? [year, year] : [null, null];
  }

  const years = products.map(product => product.releaseYear).filter(year => typeof year === 'number');
  if (!years.length) return [null, null];
  return [Math.min(...years), Math.max(...years)];
}

function groupProductsByYearMonth(products) {
  const map = new Map();
  sortProducts(products, 'date-asc').forEach(product => {
    if (typeof product.releaseYear !== 'number') return;
    const month = typeof product.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(product.releaseDate)
      ? Number(product.releaseDate.slice(5, 7))
      : null;
    if (!month || month < 1 || month > 12) return;
    const key = `${product.releaseYear}-${String(month).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(product);
  });
  return map;
}

function buildReleasePeek(product) {
  const item = document.createElement('article');
  item.className = 'release-peek';
  item.tabIndex = 0;

  const compactTop = document.createElement('div');
  compactTop.className = 'release-peek-top';

  const compactDate = document.createElement('span');
  compactDate.className = 'release-peek-date';
  compactDate.textContent = formatMonthDay(product.releaseDate);

  const compactType = document.createElement('span');
  compactType.className = 'release-peek-type';
  compactType.textContent = titleCase(product.releaseType);

  compactTop.append(compactDate, compactType);

  const compactName = document.createElement('h4');
  compactName.className = 'release-peek-name';
  compactName.textContent = product.productName;

  const compactBrand = document.createElement('p');
  compactBrand.className = 'release-peek-brand';
  compactBrand.textContent = `${product.brand}${product.series ? ` · ${product.series}` : ''}`;

  const detail = document.createElement('div');
  detail.className = 'release-hover-card';

  const detailName = document.createElement('h5');
  detailName.className = 'hover-card-title';
  detailName.textContent = product.productName;

  const detailMeta = document.createElement('p');
  detailMeta.className = 'hover-card-meta';
  detailMeta.textContent = `${product.brand}${product.series ? ` · ${product.series}` : ''} · ${formatDate(product.releaseDate)}`;

  const detailPrice = document.createElement('p');
  detailPrice.className = 'hover-card-price';
  detailPrice.textContent = `${currency(product.msrpUSD)} · ${titleCase(product.priceStatus)}`;

  const featureLabel = document.createElement('p');
  featureLabel.className = 'hover-card-label';
  featureLabel.textContent = 'Features';

  const featureList = document.createElement('ul');
  featureList.className = 'hover-card-features';
  (product.features || []).slice(0, 4).forEach(feature => {
    const li = document.createElement('li');
    li.textContent = feature;
    featureList.appendChild(li);
  });

  const sourceLabel = document.createElement('p');
  sourceLabel.className = 'hover-card-label';
  sourceLabel.textContent = 'Sources';

  detail.append(detailName, detailMeta, detailPrice, featureLabel, featureList, sourceLabel, createSourceLinks(product.sources));
  item.append(compactTop, compactName, compactBrand, detail);
  return item;
}

function buildMonthCell(year, monthNumber, productsInMonth) {
  const monthCell = document.createElement('section');
  monthCell.className = 'month-cell';

  const header = document.createElement('div');
  header.className = 'month-cell-head';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'month-title-wrap';

  const title = document.createElement('h4');
  title.className = 'month-title';
  title.textContent = MONTH_NAMES[monthNumber - 1];

  const subtitle = document.createElement('p');
  subtitle.className = 'month-subtitle';
  subtitle.textContent = String(year);

  titleWrap.append(title, subtitle);

  const count = document.createElement('span');
  count.className = 'month-count';
  count.textContent = String(productsInMonth.length);

  header.append(titleWrap, count);
  monthCell.appendChild(header);

  const body = document.createElement('div');
  body.className = 'month-cell-body';

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

  monthCell.appendChild(body);
  return monthCell;
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

  const [minYear, maxYear] = getVisibleYearRange(products);
  if (!minYear || !maxYear) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No valid release years found in the current result set.';
    els.timeline.appendChild(empty);
    return;
  }

  const byYearMonth = groupProductsByYearMonth(products);

  const shell = document.createElement('div');
  shell.className = 'calendar-board-shell';

  const hint = document.createElement('div');
  hint.className = 'calendar-board-hint';
  hint.textContent = 'Hover a release for details. Use shift + mouse wheel or trackpad scroll to move sideways.';
  shell.appendChild(hint);

  const viewport = document.createElement('div');
  viewport.className = 'calendar-board-viewport';

  const canvas = document.createElement('div');
  canvas.className = 'calendar-board-canvas';

  for (let year = maxYear; year >= minYear; year -= 1) {
    const yearSection = document.createElement('section');
    yearSection.className = 'year-row';

    const yearHeader = document.createElement('div');
    yearHeader.className = 'year-row-head';

    const title = document.createElement('h3');
    title.className = 'year-row-title';
    title.textContent = String(year);

    const count = document.createElement('span');
    count.className = 'year-row-count';
    let yearReleaseCount = 0;

    const grid = document.createElement('div');
    grid.className = 'year-grid';

    for (let month = 1; month <= 12; month += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const productsInMonth = byYearMonth.get(key) || [];
      yearReleaseCount += productsInMonth.length;
      grid.appendChild(buildMonthCell(year, month, productsInMonth));
    }

    count.textContent = `${yearReleaseCount} release${yearReleaseCount === 1 ? '' : 's'}`;
    yearHeader.append(title, count);
    yearSection.append(yearHeader, grid);
    canvas.appendChild(yearSection);
  }

  viewport.appendChild(canvas);
  shell.appendChild(viewport);
  els.timeline.appendChild(shell);
  enableHorizontalWheelScroll(viewport);
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
