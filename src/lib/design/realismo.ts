










export const AI_TELLS: string[] = [
  'pele plástica, alisada, sem poro nem textura',
  'rosto simétrico e perfeito demais, sorriso de banco de imagem',
  'mãos e dedos malformados ou em quantidade errada',
  'render 3D ou ilustração com gradiente roxo/azul brilhante',
  'luz de estúdio impossível, com contraluz e brilho em tudo ao mesmo tempo',
  'cena limpa demais, sem desgaste, sem bagunça, sem objeto fora do lugar',
  'composição centralizada e simétrica de banco de imagem',
  'escritório moderno genérico com equipe diversa apontando pra um notebook',
  'nitidez uniforme, tudo em foco, sem profundidade de campo real',
  'texto de fundo embolado ou ilegível em placas, telas e etiquetas',
  'gradação cinematográfica azul-laranja aplicada sem motivo',
]


export const ASSINATURAS_DE_CAMERA: string[] = [
  'shot on a 35mm lens, natural depth of field',
  'shot on a 50mm lens at f/2, background falls off softly',
  'phone camera photo, slight handheld tilt, everyday lighting',
  'direct on-camera flash, harsh shadow behind the subject',
  'available window light, mixed color temperature, mild underexposure',
  'documentary photo, subject mid-action, not posed',
]


export const PRESERVAR_NO_REMIX: string[] = [
  'a geometria do rosto: formato, proporções, distância entre os olhos',
  'o tom de pele e a textura dela, com poros e linhas de expressão',
  'a idade aparente',
  'barba, bigode e o corte de cabelo',
  'os óculos e o formato deles',
  'as marcas próprias: sinais, cicatrizes, assimetrias',
]


export const PODE_MUDAR_NO_REMIX: string[] = [
  'a pose e o que a pessoa está fazendo',
  'o ângulo da câmera e a distância',
  'a roupa',
  'o ambiente inteiro',
  'a escala da pessoa dentro do quadro',
  'a interação dela com os objetos da cena',
]

export interface RealismoArgs {
  
  temReferencia: boolean
  
  usarRosto: boolean
}


export function promptRealismo({ temReferencia, usarRosto }: RealismoArgs): string {
  const L: string[] = [
    'REALISMO (inegociável — a arte NÃO pode ter cara de imagem gerada por IA):',
    'O que o modelo desenha é a CENA do anúncio, e ela tem que ler como FOTOGRAFIA de verdade — material que alguém captou, não que uma máquina desenhou. A tipografia do anúncio NÃO é desenhada pelo modelo: ela é composta por cima depois, em fonte real. Aqui se julga só a cena.',
    `NUNCA produza: ${AI_TELLS.join('; ')}.`,
    'PARA PARECER REAL, o promptFundo (em inglês) TEM que especificar, sempre:',
    `- a CÂMERA e a lente (ex.: ${ASSINATURAS_DE_CAMERA.slice(0, 3).join(' / ')}) — nunca "professional photo" genérico;`,
    '- a LUZ concreta e imperfeita (janela, sol duro, flash direto, luz mista de escritório), com sombra real e direção definida;',
    '- pelo menos UMA IMPERFEIÇÃO deliberada: grão/ruído de sensor, leve desfoque de movimento, enquadramento torto ou descentralizado, membro cortado pela borda, roupa amassada, superfície com marca de uso, objeto fora do lugar no fundo;',
    '- assimetria: pessoa real não está centralizada, nem olhando pra lente com sorriso pronto.',
    'Em resposta direta, material que parece captado no dia a dia (foto de celular, print de tela, captura de vídeo, bastidor) costuma vencer arte produzida. Prefira esse registro quando a direção de arte da marca não pedir o contrário.',
  ]

  if (temReferencia) {
    L.push('A FOTO DE REFERÊNCIA é material real: preserve as imperfeições dela (textura de pele, iluminação original, marcas, desgaste). Não "melhore" o sujeito até ele virar render — mantenha-o reconhecível como a pessoa/produto que foi fotografado.')
    if (usarRosto) {
      L.push('REMIX DA PESSOA (não é colagem): a foto de referência entrega uma PESSOA, não um enquadramento. Componha uma cena NOVA em que ela está DENTRO do conceito, agindo. "O fundador no escritório" não é conceito; "o fundador cercado por centenas de fichas de aprovação, porque é ele o gargalo da operação" é.')
      L.push(`PRESERVE, sem exceção: ${PRESERVAR_NO_REMIX.join('; ')}.`)
      L.push(`PODE E DEVE MUDAR: ${PODE_MUDAR_NO_REMIX.join('; ')}.`)

      L.push('NÃO suavize, NÃO rejuvenesça, NÃO afine traços, NÃO aplique retoque de beleza — pele retocada é a denúncia número um de imagem gerada.')
    }
  }

  return L.join('\n')
}
