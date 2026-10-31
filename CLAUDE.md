# Este projeto é construído por etapas, uma sessão por etapa

Antes de qualquer coisa, leia **`docs/etapas/00-contexto.md`**: com quem você
fala, como o sistema está desenhado, as regras da casa e as lições que o Radar
da HUB 92 já pagou caro para aprender.

O plano e o estado de cada etapa estão em `docs/etapas/README.md`.

Quatro regras da construção:

1. **Você trabalha em uma etapa só.** Não comece a próxima, mesmo que pareça
   pequena. Quem abre a próxima é a sessão de controle.
2. **Primeiro pergunte, depois planeje, depois espere.** Leia a sua etapa, leve
   ao Saulo as perguntas de negócio dela (sempre com alternativas), apresente
   um plano detalhado e **espere ele aprovar**. Nunca comece a construir sozinho.
3. **Ao terminar, atualize `docs/etapas/README.md`** com o que a próxima etapa
   precisa saber. É o único fio entre uma janela de contexto e a seguinte.
4. **Avise que terminou e pare.** A sessão de controle revisa com o Saulo antes
   de qualquer passo seguinte.

## Economia de tokens — economize sempre que puder, nunca onde faz falta

**Economize:** leia só o trecho que precisa (busca dirigida, não o arquivo
inteiro), não releia o que acabou de escrever, não repita para o Saulo o que
ele já sabe, respostas objetivas, um comando que resolve em vez de cinco.

**Não economize** onde a qualidade depende disso: ler a documentação da versão
do Next antes de escrever, investigar a fonte até entender de verdade, testar
de verdade, conferir no banco, revisar o próprio trabalho antes de entregar.
Cortar aqui sai mais caro depois.

## Esforço

Cada etapa tem um nível de esforço (baixo, médio, alto, xalto, máximo) no
quadro de `docs/etapas/README.md` e na própria especificação. **Diga ao Saulo,
logo na primeira mensagem, qual é o esforço da sua etapa.** Se, ao estudar a
etapa, achar que o nível está errado, diga por quê.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
