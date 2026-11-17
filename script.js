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
