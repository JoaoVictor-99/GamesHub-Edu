"""Banco de dados SQLite do GamesHub Edu.

Tabelas:
  usuarios  (id, nome, email, senha_hash, avatar, criado_em)
  jogos     (id, slug, nome, materia, faixa_etaria, mecanica, descricao, como_jogar, emoji)
  partidas  (id, usuario_id -> usuarios.id, jogo_id -> jogos.id, pontos, duracao_segundos, anotacao, criado_em)
"""
import os
import sqlite3

from flask import g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(BASE_DIR, "gameshub.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '🎮',
    moedas INTEGER NOT NULL DEFAULT 0,
    moedas_totais INTEGER NOT NULL DEFAULT 0,
    skin TEXT NOT NULL DEFAULT 'padrao',
    skin_ada TEXT NOT NULL DEFAULT 'padrao',
    avatar_imagem TEXT,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jogos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    materia TEXT NOT NULL,
    faixa_etaria TEXT NOT NULL,
    mecanica TEXT NOT NULL,
    descricao TEXT NOT NULL,
    como_jogar TEXT NOT NULL,
    emoji TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    jogo_id INTEGER NOT NULL REFERENCES jogos(id) ON DELETE CASCADE,
    pontos INTEGER NOT NULL CHECK (pontos BETWEEN 0 AND 100),
    duracao_segundos INTEGER NOT NULL DEFAULT 0,
    anotacao TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS administradores (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skins_compradas (
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    slug TEXT NOT NULL,
    PRIMARY KEY (usuario_id, tipo, slug)
);
"""

JOGOS = [
    ("alvo-numerico", "Alvo Numérico", "Matemática", "8-12 anos", "Combinar números",
     "Selecione peças do tabuleiro cuja soma acerte o número-alvo antes do tempo acabar.",
     "Clique nas peças para somar. Quando a soma for igual ao alvo, você pontua e um novo alvo aparece. Você tem 60 segundos.", "🎯"),
    ("forca-das-palavras", "Forca das Palavras", "Português", "9-14 anos", "Adivinhar letra por letra",
     "Descubra a palavra escondida usando a dica de gramática e vocabulário.",
        "Leia a dica e escolha letras no teclado. Cada erro custa uma vida. Acerte as 6 palavras com o mínimo de erros.", "🔤"),
    ("robo-programador", "Robô Programador", "Programação", "10-17 anos", "Montar sequência de comandos",
     "Programe o robô com blocos de comando para ele chegar até a bateria sem bater nas paredes.",
     "Adicione comandos (andar, virar à esquerda, virar à direita) e aperte Executar. Use o menor número de comandos possível.", "🤖"),
    ("linha-do-tempo", "Linha do Tempo", "História", "10-15 anos", "Ordenar eventos",
     "Coloque os acontecimentos históricos na ordem certa, do mais antigo ao mais recente.",
     "Use as setas para reorganizar os cartões. Quando achar que está certo, confira a resposta.", "⏳"),
    ("memoria-celular", "Memória da Ciência", "Ciências", "8-13 anos", "Jogo da memória",
     "Encontre os pares: cada conceito de ciências combina com sua explicação.",
     "Vire duas cartas por vez. Se o conceito combinar com a explicação, o par fica aberto. Termine com o menor número de jogadas.", "🧪"),
    ("liga-capitais", "Liga as Capitais", "Geografia", "9-15 anos", "Ligar pares",
     "Conecte cada país à sua capital o mais rápido que conseguir.",
     "Clique em um país e depois na capital correspondente. Erros tiram pontos. São 3 rodadas.", "🗺️"),
    ("codigo-binario", "Código Binário", "TI", "12-18 anos", "Ligar e desligar bits",
     "Ligue os bits certos para formar o número decimal pedido, como um computador faz.",
     "Cada lâmpada vale 128, 64, 32... até 1. Acenda as lâmpadas cuja soma dá o número mostrado. São 6 números.", "💡"),
    ("corrida-fracoes", "Corrida das Frações", "Matemática", "9-14 anos", "Comparar frações",
     "Compare frações, simplifique resultados e avance pela pista matemática.",
     "Responda cinco desafios de frações e porcentagens. Cada acerto vale pontos.", "➗"),
    ("balanca-equacoes", "Balança das Equações", "Matemática", "11-16 anos", "Resolver equações",
     "Encontre o valor desconhecido mantendo os dois lados da equação equilibrados.",
     "Resolva cinco equações de dificuldade crescente escolhendo a resposta correta.", "⚖️"),
    ("detetive-texto", "Detetive do Texto", "Português", "9-15 anos", "Interpretar textos",
     "Investigue pistas de sentido, intenção e vocabulário em pequenos textos.",
     "Leia cada trecho com atenção e escolha a interpretação mais adequada.", "🔎"),
    ("desafio-acentos", "Desafio dos Acentos", "Português", "10-16 anos", "Ortografia",
     "Treine acentuação e uso correto das palavras em português.",
     "Escolha a grafia correta em cinco perguntas rápidas.", "✍️"),
    ("corrida-algoritmos", "Corrida dos Algoritmos", "Programação", "10-17 anos", "Lógica de programação",
     "Organize passos, condições e repetições para resolver desafios de lógica.",
     "Leia o problema e selecione o algoritmo que produz o resultado esperado.", "🏁"),
    ("laboratorio-debug", "Laboratório Debug", "Programação", "11-18 anos", "Encontrar erros",
     "Encontre erros em pequenos trechos de lógica antes que o programa pare.",
     "Analise cada situação e escolha a correção que resolve o problema.", "🐞"),
    ("rotas-civilizacoes", "Rotas das Civilizações", "História", "10-16 anos", "História antiga",
     "Explore acontecimentos e legados de civilizações de diferentes épocas.",
     "Associe cada povo, período ou legado à informação histórica correta.", "🏛️"),
    ("brasil-em-foco", "Brasil em Foco", "História", "10-16 anos", "História do Brasil",
     "Revise períodos, personagens e transformações da história brasileira.",
     "Responda perguntas sobre acontecimentos importantes do Brasil.", "🇧🇷"),
    ("metodo-cientifico", "Missão Científica", "Ciências", "9-14 anos", "Método científico",
     "Monte hipóteses e identifique como investigar fenômenos com evidências.",
     "Escolha a etapa ou conclusão científica adequada para cada situação.", "🔬"),
    ("trilha-ecossistemas", "Trilha dos Ecossistemas", "Ciências", "9-15 anos", "Ecologia",
     "Descubra relações entre seres vivos, ambiente e cadeias alimentares.",
     "Responda cinco desafios sobre ecossistemas e relações ecológicas.", "🌿"),
    ("mapa-biomas", "Mapa dos Biomas", "Geografia", "9-15 anos", "Biomas do mundo",
     "Identifique características de clima, vegetação e paisagens naturais.",
     "Use as pistas de cada pergunta para reconhecer o bioma correspondente.", "🌎"),
    ("coordenadas-mapa", "Coordenadas no Mapa", "Geografia", "10-16 anos", "Cartografia",
     "Pratique orientação, coordenadas e leitura de mapas.",
     "Escolha a direção ou localização correta em cada situação cartográfica.", "🧭"),
    ("internet-segura", "Internet Segura", "TI", "10-17 anos", "Segurança digital",
     "Aprenda a reconhecer riscos e proteger seus dados no ambiente digital.",
     "Escolha a atitude mais segura em situações comuns da internet.", "🛡️"),
    ("cifra-binaria", "Cifra Binária", "TI", "12-18 anos", "Representação digital",
     "Descubra como textos e informações são representados por computadores.",
     "Responda perguntas sobre bits, bytes e representação de dados.", "💾"),
    ("generos-literarios", "Bússola dos Gêneros", "Literatura", "10-17 anos", "Gêneros literários",
     "Reconheça características de gêneros, narradores e formas literárias.",
     "Leia as pistas e escolha o gênero ou elemento literário correspondente.", "📖"),
    ("personagens-literarios", "Detetives Literários", "Literatura", "11-18 anos", "Leitura literária",
     "Interprete personagens, conflitos e recursos narrativos.",
     "Analise cada situação de leitura e selecione a interpretação mais consistente.", "🕵️"),
    ("corpo-humano", "Expedição pelo Corpo", "Biologia", "10-16 anos", "Corpo humano",
     "Explore sistemas, órgãos e funções essenciais do corpo humano.",
     "Associe cada função ao órgão ou sistema responsável.", "🫀"),
    ("genes-heranca", "Código da Herança", "Biologia", "12-18 anos", "Genética",
     "Investigue genes, características herdadas e conceitos de genética.",
     "Responda perguntas sobre DNA, genes e hereditariedade.", "🧬"),
    ("forcas-energia", "Forças em Ação", "Física", "11-17 anos", "Mecânica",
     "Explore movimento, forças e transformações de energia.",
     "Escolha a explicação física correta para cada situação.", "⚙️"),
    ("circuito-eletrico", "Circuito Elétrico", "Física", "12-18 anos", "Eletricidade",
     "Descubra como corrente, tensão e componentes se comportam em circuitos.",
     "Analise cada circuito descrito e selecione a resposta correta.", "⚡"),
    ("habitos-saudaveis", "Missão Bem-Estar", "Área da Saúde", "9-16 anos", "Prevenção e bem-estar",
     "Aprenda escolhas cotidianas que ajudam a cuidar da saúde e do bem-estar.",
     "Escolha hábitos seguros e saudáveis em situações do dia a dia.", "💚"),
    ("primeiros-cuidados", "Primeiros Cuidados", "Área da Saúde", "11-18 anos", "Segurança e prevenção",
     "Pratique decisões iniciais seguras em situações comuns de cuidado.",
     "Escolha a atitude preventiva mais adequada. O jogo não substitui orientação profissional.", "🩹"),
    ("poesia-em-jogo", "Poesia em Jogo", "Literatura", "10-17 anos", "Linguagem poética",
     "Explore ritmo, imagens e figuras de linguagem em versos.",
     "Identifique recursos poéticos e sentidos figurados nas perguntas.", "🪶"),
    ("vida-em-equilibrio", "Vida em Equilíbrio", "Biologia", "10-16 anos", "Ecologia e vida",
     "Entenda relações ecológicas, ciclos naturais e equilíbrio dos ambientes.",
     "Responda desafios sobre ecologia, ciclos e biodiversidade.", "🦋"),
    ("energia-em-movimento", "Energia em Movimento", "Física", "11-17 anos", "Energia e movimento",
     "Investigue calor, luz, som e transformações de energia.",
     "Use conceitos de física para resolver cinco situações práticas.", "🔋"),
    ("rotina-saude", "Rotina de Saúde", "Área da Saúde", "10-17 anos", "Saúde preventiva",
     "Treine decisões de prevenção, higiene, sono e cuidado coletivo.",
     "Escolha a recomendação segura e baseada em cuidados gerais para cada cenário.", "🧼"),
]


# Conta administradora: tudo desbloqueado (conquistas, skins, foto de perfil) e moedas "infinitas".
ADMIN_EMAIL = "gameshubedu2026@gmail.com"
ADMIN_NOME = "Admin GamesHub"
ADMIN_SENHA_HASH = os.environ.get(
    "ADMIN_SENHA_HASH",
    "scrypt:32768:8:1$3gKQ2ikRkFgWUH2L$067c729b5e7f8d716f2f0f7d064a6316af07339076169b5808815cc848ebbae4d93948be2bc2df607a7632a5be9629e4fa6931b1acb443b6de8759bdf7cd0646",
)
ADMIN_MOEDAS = 999_999_999
ADMIN_SKINS = [
    ("jogador", "padrao"), ("jogador", "neon"), ("jogador", "floresta"),
    ("jogador", "cosmos"), ("jogador", "solar"),
    ("ada", "padrao"), ("ada", "verao"), ("ada", "halloween"), ("ada", "natal"),
    ("foto", "personalizado"),
]


def garantir_admin(conn):
    """Cria (se ainda não existir) a conta administradora e libera tudo para ela."""
    linha = conn.execute("SELECT id FROM usuarios WHERE email = ?", (ADMIN_EMAIL,)).fetchone()
    if linha is None:
        cur = conn.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, avatar) VALUES (?, ?, ?, ?)",
            (ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA_HASH, "👑"),
        )
        admin_id = cur.lastrowid
    else:
        admin_id = linha[0]
    conn.execute(
        "UPDATE usuarios SET moedas = MAX(moedas, ?), moedas_totais = MAX(moedas_totais, ?) WHERE id = ?",
        (ADMIN_MOEDAS, ADMIN_MOEDAS, admin_id),
    )
    conn.executemany(
        "INSERT OR IGNORE INTO skins_compradas (usuario_id, tipo, slug) VALUES (?, ?, ?)",
        [(admin_id, tipo, slug) for tipo, slug in ADMIN_SKINS],
    )
    conn.execute("INSERT OR IGNORE INTO administradores (usuario_id) VALUES (?)", (admin_id,))


def eh_admin(usuario_id):
    return get_db().execute(
        "SELECT 1 FROM administradores WHERE usuario_id = ?", (usuario_id,)
    ).fetchone() is not None


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    colunas = {linha[1] for linha in conn.execute("PRAGMA table_info(usuarios)")}
    for nome, tipo in (("moedas", "INTEGER NOT NULL DEFAULT 0"),
                       ("moedas_totais", "INTEGER NOT NULL DEFAULT 0"),
                       ("skin", "TEXT NOT NULL DEFAULT 'padrao'"),
                       ("skin_ada", "TEXT NOT NULL DEFAULT 'padrao'"),
                       ("avatar_imagem", "TEXT")):
        if nome not in colunas:
            conn.execute(f"ALTER TABLE usuarios ADD COLUMN {nome} {tipo}")
    conn.executemany(
        """INSERT OR IGNORE INTO jogos
           (slug, nome, materia, faixa_etaria, mecanica, descricao, como_jogar, emoji)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        JOGOS,
    )
    conn.execute(
        "UPDATE jogos SET como_jogar = ? WHERE slug = ?",
        ("Leia a dica e escolha letras no teclado. Cada erro custa uma vida. Acerte as 6 palavras com o mínimo de erros.",
         "forca-das-palavras"),
    )
    garantir_admin(conn)
    conn.commit()
    conn.close()
