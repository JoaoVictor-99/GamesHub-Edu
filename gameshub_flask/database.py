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
"""

JOGOS = [
    ("alvo-numerico", "Alvo Numérico", "Matemática", "8-12 anos", "Combinar números",
     "Selecione peças do tabuleiro cuja soma acerte o número-alvo antes do tempo acabar.",
     "Clique nas peças para somar. Quando a soma for igual ao alvo, você pontua e um novo alvo aparece. Você tem 60 segundos.", "🎯"),
    ("forca-das-palavras", "Forca das Palavras", "Português", "9-14 anos", "Adivinhar letra por letra",
     "Descubra a palavra escondida usando a dica de gramática e vocabulário.",
     "Leia a dica e escolha letras no teclado. Cada erro custa uma vida. Acerte as 5 palavras com o mínimo de erros.", "🔤"),
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
]


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
    conn.executemany(
        """INSERT OR IGNORE INTO jogos
           (slug, nome, materia, faixa_etaria, mecanica, descricao, como_jogar, emoji)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        JOGOS,
    )
    conn.commit()
    conn.close()
