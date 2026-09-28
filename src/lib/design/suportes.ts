















export interface SuporteDoTexto {
  slug: string
  
  nome: string
  
  objeto: string
  
  tipografia: string
  
  polimentos: ('cru' | 'produzido')[]
}

export const SUPORTES_DO_TEXTO: SuporteDoTexto[] = [
  {
    slug: 'papel-com-clipe',
    nome: 'Papel envelhecido preso com clipe',
    objeto: 'a large sheet of aged off-white paper held by a black binder clip, propped up in the immediate foreground and filling the bottom third of the frame, slightly tilted, edges worn and softly curled',
    tipografia: 'typed on a mechanical typewriter: heavy monospaced slab letterforms, slightly uneven ink, thin horizontal rules drawn above and below the smaller lines',
    polimentos: ['cru', 'produzido'],
  },
  {
    slug: 'folha-amassada',
    nome: 'Folha amassada na mesa',
    objeto: 'a crumpled sheet of copy paper lying open across the desk in the immediate foreground, filling the bottom third of the frame, creases catching the light',
    tipografia: 'typewriter monospaced type printed on the sheet, the letters distorting slightly where the paper folds',
    polimentos: ['cru'],
  },
  {
    slug: 'recorte-de-jornal',
    nome: 'Recorte de jornal com fita crepe',
    objeto: 'a torn rectangle of newsprint taped to a flat dark surface with a strip of masking tape, filling most of the frame, ragged torn edges, visible halftone dot texture and paper fibres',
    tipografia: 'a boxed classified-ad layout: a thin printed rule border, heavy condensed grotesque headline, thin rules separating the smaller lines, slight ink misregistration',
    polimentos: ['cru'],
  },
  {
    slug: 'quadro-branco',
    nome: 'Quadro branco escrito à mão',
    objeto: 'a whiteboard on a stand pushed into the immediate foreground, filling the bottom half of the frame, aluminium tray with markers resting on it',
    tipografia: 'hand-lettered with a thick black dry-erase marker, confident uneven strokes, a hand-drawn underline beneath the main line',
    polimentos: ['cru', 'produzido'],
  },
  {
    slug: 'cartaz-na-porta',
    nome: 'Cartaz colado na porta',
    objeto: 'a weathered paper poster pasted flat onto a dark painted door or wall at the left of the frame, corners lifting, surface stained and creased',
    tipografia: 'heavy condensed grotesque printed in black, a thin coloured rule under the smaller lines, the ink slightly faded where the paper has aged',
    polimentos: ['cru', 'produzido'],
  },
  {
    slug: 'folha-de-caderno',
    nome: 'Folha de caderno colada com fita',
    objeto: 'a torn-out ruled notebook page taped with masking tape to the back of an open laptop lid in the foreground, filling the bottom half of the frame, spiral holes along one edge',
    tipografia: 'handwritten in black ballpoint, capital letters for the main lines and a smaller running hand underneath, following the printed rules of the page',
    polimentos: ['cru'],
  },
  {
    slug: 'impresso-na-parede',
    nome: 'Impresso pregado na parede',
    objeto: 'a printed A3 sheet taped among other pinned documents, flowcharts and sticky notes on a wall, occupying the centre-left of the frame',
    tipografia: 'condensed grotesque printed in black, thin rules above and below the smaller line, a date line set apart at the bottom',
    polimentos: ['cru', 'produzido'],
  },
  {
    slug: 'placa-de-papelao',
    nome: 'Placa de papelão',
    objeto: 'a piece of corrugated cardboard held up in front of the subject, filling the lower half of the frame, rough cut edges and visible flute texture',
    tipografia: 'hand-lettered with a thick black marker straight onto the cardboard, letters bunching where the writer ran out of room',
    polimentos: ['cru'],
  },
  {
    slug: 'tela-de-apresentacao',
    nome: 'Slide projetado na parede',
    objeto: 'a slide projected onto a wall behind the subject, the projection keystoned slightly and the wall texture showing through the light',
    tipografia: 'clean grotesque set large, the projected light washing the letters slightly at the edges',
    polimentos: ['produzido'],
  },
  {
    slug: 'etiqueta-colada',
    nome: 'Etiqueta adesiva colada no objeto',
    objeto: 'a large white adhesive label stuck onto the flat surface of the main object in the scene, slightly crooked, one corner beginning to peel',
    tipografia: 'printed in a plain grotesque as if from a label printer, tight and small, with a thin rule under the main line',
    polimentos: ['cru'],
  },
]

export function getSuporte(slug: string | null | undefined): SuporteDoTexto | null {
  const s = (slug ?? '').trim().toLowerCase()
  return SUPORTES_DO_TEXTO.find((x) => x.slug === s) ?? null
}


export function suportesDoPolimento(polimento: 'cru' | 'produzido'): SuporteDoTexto[] {
  return SUPORTES_DO_TEXTO.filter((s) => s.polimentos.includes(polimento))
}


export function renderSuportes(polimento: 'cru' | 'produzido'): string {
  return suportesDoPolimento(polimento).map((s) => `- ${s.slug}: ${s.nome}`).join('\n')
}


export function renderTodosSuportes(): string {
  return SUPORTES_DO_TEXTO.map((s) => `- ${s.slug}: ${s.nome}`).join('\n')
}
