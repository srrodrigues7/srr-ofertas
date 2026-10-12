-- A Smiles fica só com o calendário aberto. A busca completa e a taxa de
-- embarque ficam atrás do Akamai: escolher o Edge porque ele passa pela
-- proteção é contorná-la, e a regra da casa proíbe (00-contexto.md, seção 4).

DELETE FROM "ofertas"."configuracao" WHERE chave IN (
  'smiles.detalhes_por_hora', 'smiles.detalhar_por_busca',
  'smiles.detalhe_validade_horas', 'smiles.executiva_datas_por_mes');

UPDATE "ofertas"."fonte" SET observacao =
  'Só o calendário (menor preço em milhas Clube por dia), por endpoint aberto. Busca completa e taxa de embarque: bloqueadas pelo Akamai, não usar; pedir acesso à Smiles. Taxa estimada (Valores). Ficha: docs/fontes/smiles.md'
  WHERE id = 'smiles';

-- Executiva só saía da busca completa: os pedidos ficam guardados, desligados.
UPDATE "ofertas"."busca" SET ligada = false,
  observacao = 'Desligado: nenhuma fonte ligada dá preço de executiva (a busca completa da Smiles não é usada).'
  WHERE classe = 'executiva';

-- O que veio pela busca completa sai da vitrine; o calendário refaz o resto.
UPDATE "ofertas"."oferta" SET ativa = false WHERE fonte_id = 'smiles' AND detalhe = 'voo';
