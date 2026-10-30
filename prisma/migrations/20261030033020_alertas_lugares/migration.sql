-- V6 — os destinos dos alertas que já estavam no cadastro SEM país (aprendidos
-- do mural do Melhores Destinos, que só diz a cidade): a migração dos alertas
-- os inseria com país e região, mas "ON CONFLICT DO NOTHING" não completa o
-- que já existe. Aqui só se preenche o que está vazio; nada é trocado.
UPDATE "ofertas"."lugar" AS l
   SET "pais" = v.pais, "regiao" = COALESCE(l."regiao", v.regiao)
  FROM (VALUES
    ('ADD', 'Etiópia', 'África'),
    ('CMN', 'Marrocos', 'África'),
    ('AKL', 'Nova Zelândia', 'Oceania'),
    ('BNE', 'Austrália', 'Oceania'),
    ('PER', 'Austrália', 'Oceania'),
    ('ASU', 'Paraguai', 'América do Sul'),
    ('MDZ', 'Argentina', 'América do Sul'),
    ('USH', 'Argentina', 'América do Sul'),
    ('PDP', 'Uruguai', 'América do Sul'),
    ('CUR', 'Curaçao', 'Caribe e México'),
    ('ATH', 'Grécia', 'Europa'),
    ('GVA', 'Suíça', 'Europa'),
    ('ZRH', 'Suíça', 'Europa'),
    ('MUC', 'Alemanha', 'Europa'),
    ('VIE', 'Áustria', 'Europa'),
    ('IST', 'Turquia', 'Europa'),
    ('AUH', 'Emirados Árabes', 'Oriente Médio'),
    ('DOH', 'Catar', 'Oriente Médio'),
    ('CMB', 'Sri Lanka', 'Ásia'),
    ('DEL', 'Índia', 'Ásia'),
    ('HAN', 'Vietnã', 'Ásia'),
    ('SGN', 'Vietnã', 'Ásia'),
    ('HKG', 'China', 'Ásia'),
    ('KUL', 'Malásia', 'Ásia'),
    ('MNL', 'Filipinas', 'Ásia')
  ) AS v(codigo, pais, regiao)
 WHERE l."codigo" = v.codigo AND l."pais" IS NULL;
