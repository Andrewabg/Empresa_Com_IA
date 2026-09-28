









import { getTemplateDeArte } from '@/lib/design/templates'
import {
  IDIOMA_DO_TEXTO_DIEGETICO,
  type ArquetipoDeCena,
  type MecanismoPsicologico,
} from './tipos'

export * from './tipos'

export const ARQUETIPOS_DE_CENA: ArquetipoDeCena[] = [
  
  {
    slug: 'documento-fotografado',
    nome: 'Documento fotografado',
    descricao: 'Um documento impresso fotografado sobre a mesa, como quem tirou foto para mandar no grupo.',
    cenaPede: 'A printed document lying on a desk, photographed from directly above, the page slightly crooked and filling most of the frame, a pen and a mug pushed to the edge.',
    textoDiegetico: 'the printed headings and rows of the document itself',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['prova', 'autoridade'],
    camera: 'Phone camera photo from above, harsh overhead light, hard shadow of the phone on the page, slight handheld tilt, visible paper texture.',
    templates: ['bloco-rodape', 'faixa-topo'],
  },
  {
    slug: 'folha-riscada',
    nome: 'Folha riscada a caneta',
    descricao: 'Uma folha impressa com linhas riscadas de caneta vermelha e uma anotação à mão na margem.',
    cenaPede: 'A printed sheet on a scratched wooden desk, several printed rows crossed out with thick red ballpoint strokes, a figure scrawled by hand in the margin and circled, the red pen resting on the page.',
    textoDiegetico: 'the printed rows of the report and the handwritten annotation in the margin',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['perda', 'dor'],
    camera: 'Phone camera photo from above, slight handheld tilt, harsh overhead office light, real shadow falling across the page, mild sensor grain.',
    templates: ['bloco-rodape', 'faixa-topo'],
  },
  {
    slug: 'planilha-impressa',
    nome: 'Planilha impressa',
    descricao: 'Uma planilha em papel com uma coluna marcada de amarelo, no meio de uma pilha desalinhada.',
    cenaPede: 'A printed spreadsheet on a desk, dense grid of rows and columns of figures filling the frame, one whole column highlighted with a yellow marker that bleeds past the cells, reading glasses folded on top.',
    textoDiegetico: 'the rows and columns of figures printed in the spreadsheet',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['perda', 'prova'],
    camera: 'Phone camera photo from a low angle across the desk, window light from the left, hard shadow of the hand at the edge of the frame, mild underexposure and visible grain.',
    templates: ['bloco-rodape', 'split-tipografico'],
  },
  {
    slug: 'recibo',
    nome: 'Recibo de papel',
    descricao: 'Um recibo comprido enrolando na beira da bancada, com a linha do total mais escura que o resto.',
    cenaPede: 'A long thermal paper receipt curling off the edge of a counter and filling the frame, a column of item lines and prices in faint grey ink, the total line printed darker, the paper creased in two places.',
    textoDiegetico: 'the printed item lines, prices and total on the receipt',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['perda', 'dor'],
    camera: 'Phone camera photo, close, harsh ceiling light, hard shadow under the curl of the paper, framing cut off at the bottom edge, visible grain.',
    templates: ['bloco-rodape', 'editorial-central'],
  },
  {
    slug: 'cartao-de-ponto',
    nome: 'Cartão de ponto',
    descricao: 'Um cartão de ponto de papel preso na parede, com uma batida muito mais tarde que as outras.',
    cenaPede: 'An old paper time card pinned to a metal rack on a wall, filling the frame, a printed grid of days and hours with times stamped in faded ink, one row stamped much later than the rest, the paper curled and yellowed.',
    textoDiegetico: 'the printed day and hour grid and the stamped times inside it',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['dor', 'identificacao'],
    camera: 'Direct on-camera flash, harsh shadow behind the card on the wall, 35mm lens, tight and slightly rotated framing, visible paper texture.',
    templates: ['bloco-rodape', 'faixa-topo'],
  },
  {
    slug: 'print-de-conversa',
    nome: 'Print de conversa',
    descricao: 'A tela de um celular mostrando uma conversa de madrugada, com o nome do contato censurado.',
    cenaPede: 'A hand holding a phone at night, the screen filling most of the frame and showing a messaging app conversation with a few short chat bubbles, a late hour on the status bar, the contact name covered by a grey censor bar, the room dark behind.',
    textoDiegetico: 'the chat bubbles of the conversation and the clock on the status bar',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['identificacao', 'urgencia'],
    camera: 'A second phone photographing the first screen, slight moire on the display, screen glare, mild motion blur, off-centre framing, available light only.',
    templates: ['bloco-rodape', 'editorial-central'],
  },
  {
    slug: 'tela-de-aviso',
    nome: 'Tela de aviso',
    descricao: 'A tela de um computador parada num aviso do sistema, no meio do expediente.',
    cenaPede: 'A desktop monitor filling the frame, a plain system dialog box open in the middle of the screen with a short warning message and two buttons, the rest of the desktop dimmed behind it, a dusty keyboard at the bottom edge.',
    textoDiegetico: 'the short warning message and the button labels inside the dialog box',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['urgencia', 'dor'],
    camera: 'Phone camera photographing the monitor, screen glare and moire, room reflection in the glass, slightly rotated framing, fluorescent office light.',
    templates: ['bloco-rodape', 'faixa-topo'],
  },
  {
    slug: 'busca-no-navegador',
    nome: 'Busca no navegador',
    descricao: 'Uma busca digitada pela metade, com as sugestões abertas embaixo dela.',
    cenaPede: 'A laptop screen filling the frame showing a plain browser search box with a half-typed query and a short list of autocomplete suggestions open below it, cursor visible, the rest of the page empty.',
    textoDiegetico: 'the half-typed query in the search box and the suggestion lines below it',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['curiosidade', 'identificacao'],
    camera: 'Phone camera photographing the laptop screen at an angle, screen glare, visible pixel grid, window light from the side, framing cut at the screen edge.',
    templates: ['bloco-rodape', 'editorial-central'],
  },
  {
    slug: 'pagina-de-agenda',
    nome: 'Página de agenda',
    descricao: 'Uma agenda de papel aberta, com a semana inteira escrita à mão e um dia rabiscado.',
    cenaPede: 'An open paper planner filling the frame, a week grid written by hand in ballpoint, one day scribbled over, a coffee ring on the corner, the spiral binding running down the middle.',
    textoDiegetico: 'the handwritten entries in the day columns of the planner',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['dor', 'identificacao'],
    camera: 'Phone camera photo from above, window light from the left, hard shadow along the spiral, slight handheld tilt, visible paper grain.',
    templates: ['bloco-rodape', 'split-tipografico'],
  },
  {
    slug: 'despertador',
    nome: 'Despertador de madrugada',
    descricao: 'Um despertador digital marcando uma hora que ninguém deveria estar acordado.',
    cenaPede: 'A digital alarm clock on a bedside table filling the frame, the lit segment display showing a late night hour, a glass of water and a charging cable beside it, the bedroom pitch dark behind.',
    textoDiegetico: 'the hour shown on the lit segment display of the clock',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['urgencia', 'dor'],
    camera: 'Phone camera photo in the dark, heavy sensor noise, glow bleeding from the display, slight motion blur, off-centre framing.',
    templates: ['bloco-rodape', 'editorial-central'],
  },
  {
    slug: 'quadro-branco',
    nome: 'Quadro branco',
    descricao: 'Um quadro branco no fim da reunião, cheio de caixas e setas escritas à mão.',
    cenaPede: 'A whiteboard filling the frame at the end of a meeting, hand-drawn boxes and arrows in marker, one area rubbed out and rewritten, marker ghosting on the surface, a marker resting on the ledge.',
    textoDiegetico: 'the handwritten words inside the boxes and along the arrows',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['prova', 'autoridade'],
    camera: 'Phone camera photo, fluorescent office light with a hotspot reflection on the board, slightly rotated framing, mild motion blur.',
    templates: ['bloco-rodape', 'faixa-topo'],
  },
  {
    slug: 'parede-de-post-its',
    nome: 'Parede de post-its',
    descricao: 'Uma parede tomada por post-its escritos à mão, alguns já descolando.',
    cenaPede: 'A wall filling the frame covered in handwritten sticky notes in several colours arranged in uneven columns, a few peeling off, one note fallen on the floor at the bottom edge.',
    textoDiegetico: 'the short handwritten phrases on the sticky notes',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['dor', 'identificacao'],
    camera: 'Direct on-camera flash, harsh shadow behind the notes, 35mm lens, slightly rotated framing, visible paper curl.',
    templates: ['bloco-rodape', 'split-tipografico'],
  },
  {
    slug: 'recorte-de-jornal',
    nome: 'Recorte de jornal',
    descricao: 'Um recorte de jornal antigo com a manchete em destaque e o papel amarelado.',
    cenaPede: 'A newspaper clipping filling the frame on a plain surface, a bold headline over two columns of small body type, the paper yellowed and torn along one edge, a fold line across the middle.',
    textoDiegetico: 'the headline and the columns of body type in the clipping',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['prova', 'autoridade'],
    camera: 'Phone camera photo from above, window light raking across the paper, hard shadow in the fold, mild sensor grain.',
    templates: ['bloco-rodape', 'editorial-central'],
  },
  {
    slug: 'classificado',
    nome: 'Anúncio de classificados',
    descricao: 'Uma página de classificados com um anúncio circulado a caneta.',
    cenaPede: 'A classifieds page filling the frame, dense columns of tiny ads, one small ad circled with ballpoint pen, the pen lying across the page, the paper slightly crumpled.',
    textoDiegetico: 'the columns of small classified ads and the circled one',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['curiosidade', 'identificacao'],
    camera: 'Phone camera photo from above, harsh overhead light, hard shadow of the hand at the edge of the frame, visible newsprint texture.',
    templates: ['bloco-rodape', 'split-tipografico'],
  },
  {
    slug: 'fotocopia',
    nome: 'Fotocópia',
    descricao: 'Uma fotocópia tirada às pressas, torta e com a borda preta da máquina.',
    cenaPede: 'A photocopied sheet filling the frame, the page copied slightly skewed with a black band along one edge from the copier lid, contrast blown out, dust specks and a streak across the toner.',
    textoDiegetico: 'the photocopied headings and lines of the original document',
    polimento: 'cru',
    escala: 'preenche-o-quadro',
    mecanismos: ['prova', 'curiosidade'],
    camera: 'Flatbed scan look, flat even light, no depth of field, dust specks and toner streaks, edges slightly out of square.',
    templates: ['bloco-rodape', 'faixa-topo'],
  },

  
  {
    slug: 'pov-de-reuniao',
    nome: 'POV de reunião',
    descricao: 'O ponto de vista de quem está sentado na reunião, com as mãos na mesa.',
    cenaPede: 'First person point of view sitting at a meeting table, own hands resting on the table in the lower frame, other people out of focus across the table, a mug and a closed laptop nearby.',
    polimento: 'produzido',
    escala: 'objeto-na-cena',
    mecanismos: ['identificacao', 'dor'],
    camera: 'Shot on a 35mm lens at f/2, available meeting room light, natural depth of field, framing cut at the wrist, mild underexposure.',
    templates: ['bloco-rodape', 'faixa-topo', 'editorial-central'],
  },
  {
    slug: 'mesa-com-flash',
    nome: 'Mesa fotografada com flash',
    descricao: 'A mesa de trabalho no fim do dia, fotografada de estalo, com tudo fora do lugar.',
    cenaPede: 'A work desk at the end of the day seen from above, objects out of place, cables tangled, a chair pushed away at the edge of the frame, nothing staged.',
    polimento: 'cru',
    escala: 'objeto-na-cena',
    mecanismos: ['dor', 'identificacao'],
    camera: 'Direct on-camera flash, harsh shadows behind every object, 35mm lens, slightly rotated framing, visible dust.',
    templates: ['bloco-rodape', 'split-tipografico'],
  },
  {
    slug: 'lado-a-lado',
    nome: 'Comparação lado a lado',
    descricao: 'Duas situações no mesmo quadro, uma de cada lado, para o olho comparar sozinho.',
    cenaPede: 'A single frame split down the middle by a real element in the scene, a cluttered situation on one side and a calm one on the other, the same light and the same surface on both halves.',
    polimento: 'produzido',
    escala: 'objeto-na-cena',
    mecanismos: ['prova', 'aspiracao'],
    camera: 'Shot on a 50mm lens at f/2, available window light, background falls off softly, subject off-centre, mild grain.',
    templates: ['split-tipografico', 'bloco-rodape'],
  },
  {
    slug: 'antes-e-depois',
    nome: 'Antes e depois',
    descricao: 'O mesmo lugar em dois momentos, do jeito que qualquer um fotografaria.',
    cenaPede: 'The same corner of a workplace photographed from the same spot, cluttered and worn, with clear signs of change in progress: boxes half emptied, a surface half cleared.',
    polimento: 'cru',
    escala: 'objeto-na-cena',
    mecanismos: ['prova', 'aspiracao'],
    camera: 'Phone camera photo, everyday lighting, slight handheld tilt, mild motion blur, framing not squared to the wall.',
    templates: ['split-tipografico', 'faixa-topo'],
  },
  {
    slug: 'retrato-do-fundador',
    nome: 'Retrato ambiental do fundador',
    descricao: 'A pessoa dentro do próprio trabalho, no meio da ação, sem pose.',
    cenaPede: 'A person in the middle of their own workplace, mid-action and not posed, surrounded by the objects of the job, the environment telling the story as much as the face.',
    polimento: 'produzido',
    escala: 'objeto-na-cena',
    mecanismos: ['autoridade', 'identificacao'],
    camera: 'Documentary photo, subject mid-action not posed, available window light with mixed colour temperature, shot on a 35mm lens, framing cut at the elbow.',
    templates: ['prova-social', 'bloco-rodape', 'faixa-topo'],
  },
]


export function getArquetipoDeCena(slug: string | null | undefined): ArquetipoDeCena | null {
  const s = (slug ?? '').trim().toLowerCase()
  return ARQUETIPOS_DE_CENA.find((a) => a.slug === s) ?? null
}


export function temTextoDiegetico(a: ArquetipoDeCena): boolean {
  return !!a.textoDiegetico?.trim()
}


export function arquetiposDoFormato(formato: string): ArquetipoDeCena[] {
  const f = (formato ?? '').trim().toLowerCase()
  return ARQUETIPOS_DE_CENA.filter((a) =>
    a.templates.some((slug) => {
      const t = getTemplateDeArte(slug)
      return t.slug === slug && (!t.formatos || t.formatos.includes(f))
    }),
  )
}


export function arquetiposDoMecanismo(m: MecanismoPsicologico): ArquetipoDeCena[] {
  return ARQUETIPOS_DE_CENA.filter((a) => a.mecanismos.includes(m))
}


export function cenaEsperada(a: ArquetipoDeCena): string {
  return temTextoDiegetico(a)
    ? `${a.descricao} O texto que aparece no objeto faz parte dele e é ESPERADO.`
    : a.descricao
}


export function clausulaDeTextoDiegetico(a: ArquetipoDeCena): string {
  if (!temTextoDiegetico(a)) return ''
  return (
    `The only text visible anywhere in the frame is ${a.textoDiegetico!.trim()}, ` +
    `written in ${IDIOMA_DO_TEXTO_DIEGETICO}. ` +
    'That text is part of the photographed object, not a caption added over it. ' +
    'It does not need to be perfectly formed: it needs to read as something a real person wrote or printed.'
  )
}
