"""Recoge referencias públicas; conserva el fichero anterior si la fuente falla."""
import argparse
import json
import re
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE = 'https://agromerka.com/observatorio/precio/aceituna-mesa/andalucia/'
TARGET = Path(__file__).resolve().parents[1] / 'data/olive-prices.json'

class TextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

def extract(html):
    parser = TextParser()
    parser.feed(html)
    text = ' '.join(' '.join(parser.parts).split())
    rows = []
    for variety in ('manzanilla', 'hojiblanca', 'gordal'):
        pattern = (r'El precio de aceituna de mesa ' + variety +
                   r' en Andalucía.{0,500}?El último dato,\s*(\d+,\d+)\s*€/kg de aceituna\s*, es\s*'
                   r'de la semana\s*(\d+)\s*\(\s*([^)]*?(\d{4}))\s*\)')
        match = re.search(pattern, text)
        if not match:
            raise ValueError('No se ha encontrado una cotización fechada de ' + variety)
        price, week, period, year = match.groups()
        value = float(price.replace(',', '.'))
        end = date.fromisocalendar(int(year), int(week), 7).isoformat()
        if not 0 < value < 20 or end > date.today().isoformat():
            raise ValueError('Cotización fuera de rango')
        rows.append({'variety': variety.capitalize(), 'price': value, 'date': end,
                     'period': period.strip(), 'unit': '€/kg'})
    return rows

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--html', help='Archivo descargado para validación local')
    opts = args.parse_args()
    if opts.html:
        html = Path(opts.html).read_text()
    else:
        request = Request(SOURCE, headers={'User-Agent': 'CampoAlDia/1.0 (public price reference)'})
        with urlopen(request, timeout=40) as response:
            html = response.read().decode('utf-8')
    rows = extract(html)
    if TARGET.exists():
        previous = json.loads(TARGET.read_text())
        old = {r['variety']: r for r in previous['rows']}
        if any(r['date'] < old.get(r['variety'], r)['date'] for r in rows):
            raise ValueError('La fuente ha devuelto datos anteriores; se conserva la última referencia')
    payload = {'source': SOURCE, 'checkedAt': datetime.now(timezone.utc).isoformat(), 'rows': rows}
    TARGET.parent.mkdir(exist_ok=True)
    temporary = TARGET.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(TARGET)

if __name__ == '__main__':
    main()
