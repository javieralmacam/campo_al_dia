const input = document.querySelector('#header-search');
const cards = [...document.querySelectorAll('[data-searchable]')];
const status = document.querySelector('#search-status');

if (input && status) {
  const filterNews = () => {
    const query = input.value.trim().toLocaleLowerCase('es');
    let shown = 0;
    for (const card of cards) {
      const matches = card.textContent.toLocaleLowerCase('es').includes(query);
      card.hidden = !matches;
      if (matches) shown++;
    }
    status.textContent = query
      ? (shown ? `${shown} ${shown === 1 ? 'resultado' : 'resultados'}` : 'No se encontraron noticias')
      : `${shown} ${shown === 1 ? 'noticia' : 'noticias'}`;
  };
  input.value = new URLSearchParams(window.location.search).get('q') || '';
  filterNews();
  input.addEventListener('input', filterNews);
}

const slides = [...document.querySelectorAll('[data-slide]')];
const previous = document.querySelector('[data-slider-prev]');
const next = document.querySelector('[data-slider-next]');
const sliderStatus = document.querySelector('[data-slider-status]');
if (slides.length && previous && next && sliderStatus) {
  let current = 0;
  const showSlide = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    sliderStatus.textContent = `${current + 1} / ${slides.length}`;
  };
  previous.addEventListener('click', () => showSlide(current - 1));
  next.addEventListener('click', () => showSlide(current + 1));
}

const oliveRows = document.querySelector('#olive-price-rows');
if (oliveRows) {
  const loadOlivePrices = async () => {
    const message = document.querySelector('#olive-price-status');
    try {
      const response = await fetch('data/olive-prices.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Cotizaciones no disponibles');
      const data = await response.json();
      if (!Array.isArray(data.rows) || !data.rows.length) throw new Error('Datos vacíos');
      const fragment = document.createDocumentFragment();
      for (const row of data.rows) {
        if (!Number.isFinite(row.price) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error('Datos incorrectos');
        const tr = document.createElement('tr');
        const date = new Date(`${row.date}T12:00:00`);
        const values = [row.variety, row.price.toLocaleString('es-ES', { minimumFractionDigits: 2 }), date.toLocaleDateString('es-ES')];
        values.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
        fragment.append(tr);
      }
      oliveRows.replaceChildren(fragment);
      const checked = new Date(data.checkedAt);
      message.textContent = `Fuente consultada el ${checked.toLocaleDateString('es-ES')}.`;
      if (Date.now() - checked.getTime() > 3 * 86400000) message.textContent += ' La consulta está pendiente de actualización.';
    } catch {
      message.textContent = 'No se ha podido consultar la tabla. Puedes ver las cotizaciones en la fuente.';
      if (!oliveRows.querySelectorAll('tr')[0]?.querySelectorAll('td')[1]) oliveRows.textContent = '';
    }
  };
  loadOlivePrices();
  setInterval(loadOlivePrices, 60 * 60 * 1000);
}
