const input = document.querySelector('#header-search');
const cards = [...document.querySelectorAll('[data-searchable]')];
const status = document.querySelector('#search-status');

if (input && status) {
  const filterNews = () => {
    const query = input.value.trim().toLocaleLowerCase('es');
    let shown = 0;
    for (const [index, card] of cards.entries()) {
      const matches = query
        ? card.textContent.toLocaleLowerCase('es').includes(query)
        : index < 4;
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
  const dots = [...document.querySelectorAll("[data-slider-dot]")];
  const showSlide = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
    sliderStatus.textContent = `${current + 1} / ${slides.length}`;
  };
  dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));
  document.querySelector('.featured-slider').addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  previous.addEventListener('click' , () => showSlide(current - 1));
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

const weatherForm = document.querySelector('#weather-search');
if (weatherForm) {
  const field = document.querySelector('#weather-town');
  const statusWeather = document.querySelector('#weather-status');
  const contentWeather = document.querySelector('#weather-content');
  const places = document.querySelector('#weather-places');
  const choice = document.querySelector('.weather-choice');
  let locations = [];
  let requestNumber = 0;
  const setText = (selector, value) => { document.querySelector(selector).textContent = value; };
  const format = value => Number.isFinite(value) ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value) : '—';
  const loadWeather = async location => {
    const request = ++requestNumber;
    statusWeather.textContent = 'Consultando la previsión…';
    contentWeather.hidden = true;
    try {
      const params = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, current: 'temperature_2m,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', timezone: 'auto', forecast_days: '4' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error('previsión no disponible');
      const data = await response.json();
      if (request !== requestNumber) return;
      if (!data.current || !data.daily || !Array.isArray(data.daily.time)) throw new Error('datos incompletos');
      setText('#weather-location', [location.name, location.admin2 || location.admin1].filter(Boolean).join(', '));
      setText('#weather-temp', `${format(data.current.temperature_2m)} °C`);
      setText('#weather-range', `${format(data.daily.temperature_2m_max[0])}° / ${format(data.daily.temperature_2m_min[0])}°`);
      setText('#weather-rain', `${format(data.daily.precipitation_sum[0])} mm`);
      setText('#weather-wind', `${format(data.current.wind_speed_10m)} km/h`);
      const list = document.querySelector('#weather-days');
      list.replaceChildren();
      data.daily.time.slice(1).forEach((day, index) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        const values = document.createElement('span');
        label.textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`));
        values.textContent = `${format(data.daily.temperature_2m_max[index + 1])}° / ${format(data.daily.temperature_2m_min[index + 1])}° · ${format(data.daily.precipitation_sum[index + 1])} mm`;
        item.append(label, values); list.append(item);
      });
      statusWeather.textContent = `Previsión de hoy · hora local del municipio`;
      contentWeather.hidden = false;
    } catch {
      if (request === requestNumber) statusWeather.textContent = 'No se puede cargar la previsión. Inténtalo de nuevo.';
    }
  };
  weatherForm.addEventListener('submit', async event => {
    event.preventDefault();
    const query = field.value.trim();
    if (query.length < 2) { statusWeather.textContent = 'Escribe al menos dos letras.'; return; }
    const request = ++requestNumber;
    contentWeather.hidden = true; choice.hidden = true;
    statusWeather.textContent = 'Buscando municipios…';
    try {
      const params = new URLSearchParams({ name: query, count: '10', language: 'es', countryCode: 'ES' });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
      if (!response.ok) throw new Error('búsqueda no disponible');
      const data = await response.json();
      if (request !== requestNumber) return;
      locations = data.results || [];
      if (!locations.length) { statusWeather.textContent = 'No se encontró el municipio. Prueba con otro nombre.'; return; }
      places.replaceChildren();
      locations.forEach((location, index) => { const option = document.createElement('option'); option.value = index; option.textContent = [location.name, location.admin2 || location.admin1].filter(Boolean).join(', '); places.append(option); });
      choice.hidden = locations.length < 2;
      loadWeather(locations[0]);
    } catch {
      if (request === requestNumber) statusWeather.textContent = 'No se puede buscar el municipio. Inténtalo de nuevo.';
    }
  });
  places.addEventListener('change', () => loadWeather(locations[Number(places.value)]));
  loadWeather({name: 'Jaén', admin1: 'Andalucía', latitude: 37.7692, longitude: -3.7903});
}
