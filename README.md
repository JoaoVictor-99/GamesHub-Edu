# GamesHub Edu — Flask + SQLite

Minijogos educativos com contas, pontuação, conquistas e ranking.

## Rodar localmente
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py        # abre em http://127.0.0.1:5000
```
O banco `gameshub.db` é criado sozinho na primeira execução (com os 33 jogos cadastrados).

## Estrutura
```
app.py            rotas e regras
database.py       conexão SQLite, criação das tabelas e jogos iniciais
templates/        base.html + páginas (herança, if, for, variáveis)
static/css/       estilo (tema neon arcade + Bootstrap 5)
static/js/        os minijogos em JavaScript
requirements.txt  Procfile
```

Os novos jogos de perguntas apresentam cinco questões sorteadas de um banco de 100 por matéria, com cinco alternativas embaralhadas e sem repetição até o banco ser percorrido. Os sete minijogos originais iniciam diretamente suas mecânicas próprias.

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

Obs.: no plano gratuito do Render o disco é apagado a cada novo deploy/reinício, então contas, partidas e fotos de perfil podem sumir. Para manter os dados, adicione um *Persistent Disk* e defina `DATABASE_PATH=/var/data/gameshub.db` e `AVATAR_UPLOAD_DIR=/var/data/avatars`.

## Ada, a guia com IA

A Ada aparece no canto da tela em todas as páginas. Ela dá dicas por página, reage aos acertos e erros nos jogos (troca de expressão) e conversa pelo chat.

Para ligar o "cérebro" de IA dela (de graça, com o Google Gemini):
1. Entre em https://aistudio.google.com/apikey e crie uma chave.
2. No Render, abra o serviço → **Environment** → adicione `ADA_API_KEY` com essa chave.
3. Para rodar localmente no Windows, abra o PowerShell na pasta `gameshub_flask`, defina `$env:ADA_API_KEY="sua-chave"` e inicie o app com `python app.py`. A variável vale para esse terminal; depois de mudar a chave, reinicie o servidor.

Sem uma chave válida, a Ada continua funcionando em modo offline, mas responde apenas perguntas básicas sobre o site. Com a chave, ela pode responder às dúvidas gerais de estudo e conversar normalmente.

Opcional: `ADA_MODEL` (padrão `gemini-2.5-flash`) e `ADA_BASE_URL` (qualquer API compatível com OpenAI).
As expressões ficam em `static/img/ada/` (feliz, coracoes, confusa, decepcao, choro, raiva).

## Conta administradora
Ao iniciar, o site cria automaticamente (se ainda não existir) a conta `gameshubedu2026@gmail.com`
com todas as conquistas, todas as skins (jogador e Ada), o pacote de foto de perfil e 999.999.999 moedas.
Isso funciona também no Render, inclusive com *Persistent Disk*. Para trocar a senha sem mexer no código,
defina a variável `ADMIN_SENHA_HASH` com um hash gerado por `werkzeug.security.generate_password_hash`
(só vale se a conta ainda não existir no banco).
