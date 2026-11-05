# GamesHub Edu — Flask + SQLite

Minijogos educativos com contas, pontuação, conquistas e ranking.

## Rodar localmente
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py        # abre em http://127.0.0.1:5000
```
O banco `gameshub.db` é criado sozinho na primeira execução (com os 7 jogos cadastrados).

## Estrutura
```
app.py            rotas e regras
database.py       conexão SQLite, criação das tabelas e jogos iniciais
templates/        base.html + páginas (herança, if, for, variáveis)
static/css/       estilo (tema neon arcade + Bootstrap 5)
static/js/        os 7 minijogos em JavaScript
requirements.txt  Procfile
```

## Banco de dados
- `usuarios` (id, nome, email, senha_hash, avatar)
- `jogos` (id, slug, nome, materia, ...)
- `partidas` (id, **usuario_id → usuarios**, **jogo_id → jogos**, pontos, duracao_segundos, anotacao)

CRUD: usuários (cadastro, perfil, editar perfil, excluir conta) e partidas (salvar ao terminar um jogo, listar no perfil, editar anotação, excluir).
JOINs: ranking, perfil (histórico e melhores resultados) e `/api/jogos`.

## Rotas
| Rota | Método | Descrição |
|---|---|---|
| `/` | GET | Início |
| `/jogos` | GET | Lista com filtro por matéria |
| `/jogos/<slug>` | GET | Jogar |
| `/ranking` | GET | Ranking (JOIN) |
| `/cadastro`, `/login` | GET/POST | Conta |
| `/logout` | GET | Sair |
| `/perfil` | GET | Histórico e conquistas |
| `/perfil/editar` | GET/POST | Editar perfil |
| `/perfil/excluir` | POST | Excluir conta |
| `/partidas` | POST | Salvar partida (JSON) |
| `/partidas/<id>/editar` | GET/POST | Editar anotação |
| `/partidas/<id>/excluir` | POST | Excluir partida |
| `/api/jogos` | GET | **JSON** com estatísticas dos jogos |
| `/api/ranking` | GET | **JSON** do ranking |

## Publicar no Render
1. Envie esta pasta para um repositório no GitHub.
2. No Render: **New → Web Service** → escolha o repositório.
3. Build command: `pip install -r requirements.txt` · Start command: `gunicorn app:app`.
4. Em **Environment**, adicione `SECRET_KEY` com um texto aleatório longo.

Obs.: no plano gratuito do Render o disco é apagado a cada novo deploy/reinício, então contas e partidas podem sumir. Para manter os dados, adicione um *Persistent Disk* e defina `DATABASE_PATH=/var/data/gameshub.db`.

## Ada, a guia com IA

A Ada aparece no canto da tela em todas as páginas. Ela dá dicas por página, reage aos acertos e erros nos jogos (troca de expressão) e conversa pelo chat.

Para ligar o "cérebro" de IA dela (de graça, com o Google Gemini):
1. Entre em https://aistudio.google.com/apikey e crie uma chave.
2. No Render, abra o serviço → **Environment** → adicione `ADA_API_KEY` com essa chave.

Sem a chave, a Ada continua funcionando, mas só responde perguntas básicas sobre o site.

Opcional: `ADA_MODEL` (padrão `gemini-2.5-flash`) e `ADA_BASE_URL` (qualquer API compatível com OpenAI).
As expressões ficam em `static/img/ada/` (feliz, coracoes, confusa, decepcao, choro, raiva).
