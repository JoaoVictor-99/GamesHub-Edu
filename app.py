"""GamesHub Edu — versão Flask + SQLite."""
import os
import re
from functools import wraps
from uuid import uuid4

from flask import (Flask, abort, flash, g, jsonify, redirect, render_template,
                   request, send_from_directory, session, url_for)
import requests
from werkzeug.security import check_password_hash, generate_password_hash

from database import DB_PATH, close_db, eh_admin, get_db, init_db

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "troque-esta-chave-em-producao")
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024
AVATAR_UPLOAD_DIR = os.environ.get(
    "AVATAR_UPLOAD_DIR",
    os.path.join(os.path.dirname(DB_PATH), "avatars"),
)
app.teardown_appcontext(close_db)
init_db()

AVATARES = ["🎮", "🚀", "🦊", "🐱", "🤖", "🦄", "🐉", "⭐", "🧠", "👾"]
AVATARES_POR_SKIN = {
    "neon": ["💜", "🪩", "🎧", "🔮", "⚡"],
    "floresta": ["🌿", "🍄", "🦋", "🐸", "🌳"],
    "cosmos": ["🌌", "🪐", "🌙", "☄️", "👽"],
    "solar": ["☀️", "🌻", "🔥", "🦁", "🍊"],
}
EXTENSOES_IMAGEM_AVATAR = {
    "jpeg": lambda conteudo: conteudo.startswith(b"\xff\xd8\xff"),
    "png": lambda conteudo: conteudo.startswith(b"\x89PNG\r\n\x1a\n"),
    "webp": lambda conteudo: conteudo.startswith(b"RIFF") and conteudo[8:12] == b"WEBP",
}

CONQUISTAS = [
    ("primeiro-jogo", "Primeiro Passo", "Terminou seu primeiro jogo.", "🚀"),
    ("nota-maxima", "Gabaritou!", "Fez a pontuação máxima em um jogo.", "🏆"),
    ("explorador", "Explorador", "Jogou 3 jogos diferentes.", "🧭"),
    ("colecionador", "Colecionador", "Jogou a maioria dos jogos do site.", "📚"),
    ("maratonista", "Maratonista", "Terminou 12 partidas.", "⚡"),
    ("trezentos", "250 Pontos", "Somou 250 pontos com seus melhores resultados.", "💎"),
]

CONQUISTAS_EXTRAS = []
for total in (2, 3, 5, 8, 10, 15, 25, 40, 60, 80, 120, 160, 240, 400, 800):
    CONQUISTAS_EXTRAS.append((f"partidas-{total}", f"Maratona {total}", f"Termine {total} partidas.", "🎮", "partidas", total))
for total in (6, 10, 14, 18, 22, 26, 30):
    CONQUISTAS_EXTRAS.append((f"jogos-{total}", f"Explorador {total}", f"Jogue {total} jogos diferentes.", "🧭", "jogos", total))
for total in (400, 600, 850, 1200, 1600, 2400, 4000):
    CONQUISTAS_EXTRAS.append((f"pontos-{total}", f"Pontuação {total}", f"Some {total} pontos nos seus melhores resultados.", "⭐", "pontos", total))
for total in (40, 80, 200, 400, 800, 2000, 4000):
    CONQUISTAS_EXTRAS.append((f"moedas-{total}", f"Tesouro {total}", f"Acumule {total} moedas.", "🪙", "moedas", total))
for total in (2, 3, 4, 8):
    CONQUISTAS_EXTRAS.append((f"perfeitas-{total}", f"Precisão {total}", f"Consiga pontuação máxima em {total} jogos.", "🏅", "perfeitas", total))
CONQUISTA_COMPLETA = ("lenda-gameshub", "Lenda GamesHub", "Desbloqueie todas as outras conquistas.", "👑")

SKINS = [
    {"slug": "padrao", "nome": "Arcade", "preco": 0, "icone": "🎮", "classe": "skin-padrao"},
    {"slug": "neon", "nome": "Neon", "preco": 150, "icone": "💜", "classe": "skin-neon"},
    {"slug": "floresta", "nome": "Floresta", "preco": 150, "icone": "🌿", "classe": "skin-floresta"},
    {"slug": "cosmos", "nome": "Cosmos", "preco": 150, "icone": "🌌", "classe": "skin-cosmos"},
    {"slug": "solar", "nome": "Solar", "preco": 150, "icone": "☀️", "classe": "skin-solar"},
]
SKINS_ADA = [
    {"slug": "padrao", "nome": "Ada clássica", "preco": 0, "icone": "🤖"},
    {"slug": "verao", "nome": "Ada de verão", "preco": 150, "icone": "🌞"},
    {"slug": "halloween", "nome": "Ada de Halloween", "preco": 150, "icone": "🎃"},
    {"slug": "natal", "nome": "Ada de Natal", "preco": 150, "icone": "🎄"},
]
PACOTE_FOTO = {"slug": "personalizado", "nome": "Foto de perfil", "preco": 300, "icone": "📷"}


def avatares_desbloqueados(usuario_id):
    compradas = get_db().execute(
        "SELECT slug FROM skins_compradas WHERE usuario_id = ? AND tipo = 'jogador'",
        (usuario_id,),
    ).fetchall()
    emojis = list(AVATARES)
    for compra in compradas:
        emojis.extend(AVATARES_POR_SKIN.get(compra["slug"], []))
    if eh_admin(usuario_id):
        emojis.append("👑")
    return list(dict.fromkeys(emojis))


def remover_imagem_avatar(nome_arquivo):
    if nome_arquivo and os.path.basename(nome_arquivo) == nome_arquivo:
        caminho = os.path.join(AVATAR_UPLOAD_DIR, nome_arquivo)
        if os.path.isfile(caminho):
            os.remove(caminho)


# ---------- utilidades ----------
@app.before_request
def carregar_usuario():
    uid = session.get("usuario_id")
    g.usuario = None
    if uid:
        g.usuario = get_db().execute("SELECT * FROM usuarios WHERE id = ?", (uid,)).fetchone()
        if g.usuario is None:
            session.clear()


def login_obrigatorio(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if g.usuario is None:
            flash("Entre na sua conta para continuar.", "aviso")
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapper


def melhores_por_jogo(usuario_id):
    """JOIN entre partidas e jogos: melhor pontuação do usuário em cada jogo."""
    return get_db().execute(
        """SELECT j.slug, j.nome, j.emoji, MAX(p.pontos) AS melhor, COUNT(p.id) AS vezes
           FROM partidas p JOIN jogos j ON j.id = p.jogo_id
           WHERE p.usuario_id = ?
           GROUP BY j.id ORDER BY melhor DESC""",
        (usuario_id,),
    ).fetchall()


def calcular_conquistas(usuario_id):
    db = get_db()
    total_partidas = db.execute("SELECT COUNT(*) FROM partidas WHERE usuario_id = ?", (usuario_id,)).fetchone()[0]
    total_jogos = db.execute("SELECT COUNT(*) FROM jogos").fetchone()[0]
    melhores = melhores_por_jogo(usuario_id)
    soma = sum(m["melhor"] for m in melhores)
    moedas = db.execute("SELECT moedas_totais FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()[0]
    perfeitas = sum(m["melhor"] == 100 for m in melhores)
    ganhas = set()
    if total_partidas >= 1: ganhas.add("primeiro-jogo")
    if any(m["melhor"] >= 100 for m in melhores): ganhas.add("nota-maxima")
    if len(melhores) >= 3: ganhas.add("explorador")
    if len(melhores) >= max(1, (total_jogos * 3 + 3) // 4): ganhas.add("colecionador")
    if total_partidas >= 12: ganhas.add("maratonista")
    if soma >= 250: ganhas.add("trezentos")
    metricas = {
        "partidas": total_partidas,
        "jogos": len(melhores),
        "pontos": soma,
        "moedas": moedas,
        "perfeitas": perfeitas,
    }
    extras = []
    for slug, nome, descricao, icone, metrica, meta in CONQUISTAS_EXTRAS:
        ganha = metricas[metrica] >= meta
        if ganha:
            ganhas.add(slug)
        extras.append(dict(slug=slug, nome=nome, descricao=descricao, icone=icone, ganha=ganha))
    if eh_admin(usuario_id):
        ganhas.update(s for s, *_ in CONQUISTAS)
        ganhas.update(e["slug"] for e in extras)
        for e in extras:
            e["ganha"] = True
    todas = [dict(slug=s, nome=n, descricao=d, icone=i, ganha=s in ganhas) for s, n, d, i in CONQUISTAS] + extras
    todas.append(dict(slug=CONQUISTA_COMPLETA[0], nome=CONQUISTA_COMPLETA[1], descricao=CONQUISTA_COMPLETA[2],
                      icone=CONQUISTA_COMPLETA[3], ganha=len(ganhas) == len(CONQUISTAS) + len(CONQUISTAS_EXTRAS)))
    return todas


SQL_RANKING = """
    SELECT u.id, u.nome, u.avatar, u.avatar_imagem,
           COALESCE(SUM(b.melhor), 0) AS pontos,
           COUNT(b.jogo_id) AS jogos_jogados
    FROM usuarios u
    LEFT JOIN (
        SELECT usuario_id, jogo_id, MAX(pontos) AS melhor
        FROM partidas GROUP BY usuario_id, jogo_id
    ) b ON b.usuario_id = u.id
    GROUP BY u.id
    ORDER BY pontos DESC, u.nome
    LIMIT 50
"""


# ---------- páginas ----------
@app.route("/")
def index():
    jogos = get_db().execute("SELECT * FROM jogos").fetchall()
    return render_template("index.html", jogos=jogos[:3], total=len(jogos))


@app.route("/uploads/avatars/<path:filename>")
def servir_avatar_imagem(filename):
    return send_from_directory(AVATAR_UPLOAD_DIR, filename)


@app.route("/jogos")
def jogos():
    materia = request.args.get("materia", "")
    db = get_db()
    materias = [r["materia"] for r in db.execute("SELECT DISTINCT materia FROM jogos ORDER BY materia")]
    if materia:
        lista = db.execute("SELECT * FROM jogos WHERE materia = ?", (materia,)).fetchall()
    else:
        lista = db.execute("SELECT * FROM jogos").fetchall()
    return render_template("jogos.html", jogos=lista, materias=materias, materia=materia)


@app.route("/jogos/<slug>")
def jogo(slug):
    j = get_db().execute("SELECT * FROM jogos WHERE slug = ?", (slug,)).fetchone()
    if j is None:
        abort(404)
    recorde = None
    if g.usuario:
        recorde = get_db().execute(
            "SELECT MAX(pontos) FROM partidas WHERE usuario_id = ? AND jogo_id = ?",
            (g.usuario["id"], j["id"]),
        ).fetchone()[0]
    return render_template("jogo.html", jogo=j, recorde=recorde)


@app.route("/ranking")
def ranking():
    linhas = get_db().execute(SQL_RANKING).fetchall()
    return render_template("ranking.html", ranking=linhas)


# ---------- autenticação / CRUD de usuários ----------
@app.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")
        avatar = request.form.get("avatar", "🎮")
        erro = None
        if len(nome) < 2: erro = "Digite um nome com pelo menos 2 letras."
        elif "@" not in email: erro = "Digite um e-mail válido."
        elif len(senha) < 6: erro = "A senha precisa ter pelo menos 6 caracteres."
        elif avatar not in AVATARES: avatar = "🎮"
        db = get_db()
        if not erro and db.execute("SELECT 1 FROM usuarios WHERE email = ?", (email,)).fetchone():
            erro = "Esse e-mail já tem conta. Tente entrar."
        if erro:
            flash(erro, "erro")
        else:
            cur = db.execute(
                "INSERT INTO usuarios (nome, email, senha_hash, avatar) VALUES (?, ?, ?, ?)",
                (nome, email, generate_password_hash(senha), avatar),
            )
            db.commit()
            session.clear()
            session["usuario_id"] = cur.lastrowid
            flash(f"Bem-vindo(a), {nome}! Escolha um jogo para começar.", "sucesso")
            return redirect(url_for("jogos"))
    return render_template("cadastro.html", avatares=AVATARES)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        senha = request.form.get("senha", "")
        u = get_db().execute("SELECT * FROM usuarios WHERE email = ?", (email,)).fetchone()
        if u is None or not check_password_hash(u["senha_hash"], senha):
            flash("E-mail ou senha incorretos.", "erro")
        else:
            session.clear()
            session["usuario_id"] = u["id"]
            flash(f"Olá de novo, {u['nome']}!", "sucesso")
            destino = request.args.get("next", "")
            return redirect(destino if destino.startswith("/") else url_for("perfil"))
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Você saiu da conta.", "sucesso")
    return redirect(url_for("index"))


@app.route("/perfil")
@login_obrigatorio
def perfil():
    db = get_db()
    partidas = db.execute(
        """SELECT p.*, j.nome AS jogo_nome, j.emoji, j.slug
           FROM partidas p JOIN jogos j ON j.id = p.jogo_id
           WHERE p.usuario_id = ? ORDER BY p.criado_em DESC, p.id DESC LIMIT 10""",
        (g.usuario["id"],),
    ).fetchall()
    melhores = melhores_por_jogo(g.usuario["id"])
    return render_template(
        "perfil.html",
        partidas=partidas,
        melhores=melhores,
        total=sum(m["melhor"] for m in melhores),
        conquistas=calcular_conquistas(g.usuario["id"]),
        skins=SKINS,
        skins_ada=SKINS_ADA,
        pacote_foto=PACOTE_FOTO,
        compradas={(r["tipo"], r["slug"]) for r in db.execute(
            "SELECT tipo, slug FROM skins_compradas WHERE usuario_id = ?", (g.usuario["id"],)
        ).fetchall()} | {("jogador", "padrao"), ("ada", "padrao")},
    )


@app.route("/perfil/skins", methods=["POST"])
@login_obrigatorio
def gerenciar_skins():
    tipo = request.form.get("tipo", "")
    slug = request.form.get("skin", "")
    catalogo = (
        SKINS if tipo == "jogador"
        else SKINS_ADA if tipo == "ada"
        else [PACOTE_FOTO] if tipo == "foto"
        else []
    )
    skin = next((item for item in catalogo if item["slug"] == slug), None)
    if skin is None:
        abort(400)
    db = get_db()
    comprada = db.execute(
        "SELECT 1 FROM skins_compradas WHERE usuario_id = ? AND tipo = ? AND slug = ?",
        (g.usuario["id"], tipo, slug),
    ).fetchone()
    if not comprada and slug != "padrao":
        saldo = db.execute("SELECT moedas FROM usuarios WHERE id = ?", (g.usuario["id"],)).fetchone()[0]
        if saldo < skin["preco"]:
            flash("Você ainda não tem moedas suficientes para essa skin.", "aviso")
            return redirect(url_for("perfil"))
        db.execute("UPDATE usuarios SET moedas = moedas - ? WHERE id = ?", (skin["preco"], g.usuario["id"]))
        db.execute("INSERT INTO skins_compradas (usuario_id, tipo, slug) VALUES (?, ?, ?)",
                   (g.usuario["id"], tipo, slug))
        flash(f"Skin {skin['nome']} comprada!", "sucesso")
    elif comprada or slug == "padrao":
        if slug == "padrao" and not comprada:
            db.execute("INSERT OR IGNORE INTO skins_compradas (usuario_id, tipo, slug) VALUES (?, ?, ?)",
                       (g.usuario["id"], tipo, slug))
        flash(f"Skin {skin['nome']} equipada!", "sucesso")
    if tipo != "foto":
        coluna = "skin" if tipo == "jogador" else "skin_ada"
        db.execute(f"UPDATE usuarios SET {coluna} = ? WHERE id = ?", (slug, g.usuario["id"]))
    db.commit()
    return redirect(url_for("perfil"))


@app.route("/perfil/editar", methods=["GET", "POST"])
@login_obrigatorio
def editar_perfil():
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        avatar = request.form.get("avatar", "")
        imagem = request.files.get("avatar_imagem")
        if len(nome) < 2:
            flash("Digite um nome com pelo menos 2 letras.", "erro")
        elif imagem and imagem.filename:
            db = get_db()
            possui_pacote = db.execute(
                "SELECT 1 FROM skins_compradas WHERE usuario_id = ? AND tipo = 'foto' AND slug = ?",
                (g.usuario["id"], PACOTE_FOTO["slug"]),
            ).fetchone()
            if not possui_pacote:
                flash("Compre o pacote de foto de perfil antes de enviar uma imagem.", "aviso")
            else:
                conteudo = imagem.stream.read(3 * 1024 * 1024 + 1)
                extensao = next(
                    (ext for ext, validar in EXTENSOES_IMAGEM_AVATAR.items() if validar(conteudo)),
                    None,
                )
                if extensao is None or len(conteudo) > 3 * 1024 * 1024:
                    flash("Escolha uma imagem PNG, JPG ou WebP de até 3 MB.", "erro")
                else:
                    nome_arquivo = f"{uuid4().hex}.{extensao}"
                    os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)
                    caminho = os.path.join(AVATAR_UPLOAD_DIR, nome_arquivo)
                    with open(caminho, "wb") as arquivo:
                        arquivo.write(conteudo)
                    imagem_antiga = g.usuario["avatar_imagem"]
                    db.execute(
                        "UPDATE usuarios SET nome = ?, avatar_imagem = ? WHERE id = ?",
                        (nome, nome_arquivo, g.usuario["id"]),
                    )
                    db.commit()
                    if imagem_antiga:
                        remover_imagem_avatar(imagem_antiga)
                    flash("Foto de perfil atualizada!", "sucesso")
                    return redirect(url_for("perfil"))
        else:
            db = get_db()
            if avatar == "__imagem_atual__" and g.usuario["avatar_imagem"]:
                db.execute("UPDATE usuarios SET nome = ? WHERE id = ?", (nome, g.usuario["id"]))
            elif avatar in avatares_desbloqueados(g.usuario["id"]):
                db.execute(
                    "UPDATE usuarios SET nome = ?, avatar = ?, avatar_imagem = NULL WHERE id = ?",
                    (nome, avatar, g.usuario["id"]),
                )
            else:
                flash("Escolha um avatar desbloqueado.", "erro")
                return redirect(url_for("editar_perfil"))
            db.commit()
            if avatar != "__imagem_atual__" and g.usuario["avatar_imagem"]:
                remover_imagem_avatar(g.usuario["avatar_imagem"])
            flash("Perfil atualizado!", "sucesso")
            return redirect(url_for("perfil"))
    possui_pacote_foto = get_db().execute(
        "SELECT 1 FROM skins_compradas WHERE usuario_id = ? AND tipo = 'foto' AND slug = ?",
        (g.usuario["id"], PACOTE_FOTO["slug"]),
    ).fetchone() is not None
    return render_template(
        "editar_perfil.html",
        avatares=avatares_desbloqueados(g.usuario["id"]),
        possui_pacote_foto=possui_pacote_foto,
    )


@app.route("/perfil/excluir", methods=["POST"])
@login_obrigatorio
def excluir_conta():
    imagem_avatar = g.usuario["avatar_imagem"]
    db = get_db()
    db.execute("DELETE FROM usuarios WHERE id = ?", (g.usuario["id"],))
    db.commit()
    remover_imagem_avatar(imagem_avatar)
    session.clear()
    flash("Sua conta e suas partidas foram excluídas.", "sucesso")
    return redirect(url_for("index"))


# ---------- CRUD de partidas ----------
@app.route("/partidas", methods=["POST"])
@login_obrigatorio
def criar_partida():
    dados = request.get_json(silent=True) or request.form
    db = get_db()
    j = db.execute("SELECT id FROM jogos WHERE slug = ?", (dados.get("jogo", ""),)).fetchone()
    if j is None:
        return jsonify(erro="Jogo não encontrado"), 400
    try:
        pontos = max(0, min(100, int(round(float(dados.get("pontos", 0))))))
        duracao = max(0, int(float(dados.get("duracao", 0))))
    except (TypeError, ValueError):
        return jsonify(erro="Dados inválidos"), 400
    antes = {c["slug"] for c in calcular_conquistas(g.usuario["id"]) if c["ganha"]}
    moedas_ganhas = pontos // 10 + int(pontos >= 50)
    db.execute(
        "INSERT INTO partidas (usuario_id, jogo_id, pontos, duracao_segundos) VALUES (?, ?, ?, ?)",
        (g.usuario["id"], j["id"], pontos, duracao),
    )
    db.execute("UPDATE usuarios SET moedas = moedas + ?, moedas_totais = moedas_totais + ? WHERE id = ?",
               (moedas_ganhas, moedas_ganhas, g.usuario["id"]))
    db.commit()
    novas = [c for c in calcular_conquistas(g.usuario["id"]) if c["ganha"] and c["slug"] not in antes]
    saldo = db.execute("SELECT moedas FROM usuarios WHERE id = ?", (g.usuario["id"],)).fetchone()[0]
    return jsonify(ok=True, pontos=pontos, moedas=moedas_ganhas, saldo=saldo, novas_conquistas=novas), 201


def partida_do_usuario(partida_id):
    p = get_db().execute(
        """SELECT p.*, j.nome AS jogo_nome, j.emoji FROM partidas p
           JOIN jogos j ON j.id = p.jogo_id WHERE p.id = ?""",
        (partida_id,),
    ).fetchone()
    if p is None or p["usuario_id"] != g.usuario["id"]:
        abort(404)
    return p


@app.route("/partidas/<int:partida_id>/editar", methods=["GET", "POST"])
@login_obrigatorio
def editar_partida(partida_id):
    p = partida_do_usuario(partida_id)
    if request.method == "POST":
        anotacao = request.form.get("anotacao", "").strip()[:300]
        db = get_db()
        db.execute("UPDATE partidas SET anotacao = ? WHERE id = ?", (anotacao, partida_id))
        db.commit()
        flash("Anotação salva!", "sucesso")
        return redirect(url_for("perfil"))
    return render_template("editar_partida.html", partida=p)


@app.route("/partidas/<int:partida_id>/excluir", methods=["POST"])
@login_obrigatorio
def excluir_partida(partida_id):
    partida_do_usuario(partida_id)
    db = get_db()
    db.execute("DELETE FROM partidas WHERE id = ?", (partida_id,))
    db.commit()
    flash("Partida excluída.", "sucesso")
    return redirect(url_for("perfil"))


# ---------- API JSON ----------
@app.route("/api/jogos")
def api_jogos():
    linhas = get_db().execute(
        """SELECT j.slug, j.nome, j.materia, j.emoji, COUNT(p.id) AS partidas,
                  COALESCE(ROUND(AVG(p.pontos), 1), 0) AS media
           FROM jogos j LEFT JOIN partidas p ON p.jogo_id = j.id
           GROUP BY j.id"""
    ).fetchall()
    return jsonify([dict(l) for l in linhas])


@app.route("/api/ranking")
def api_ranking():
    return jsonify([dict(l) for l in get_db().execute(SQL_RANKING).fetchall()])


# ---------- Ada, a guia com IA ----------
EMOCOES_ADA = ["feliz", "coracoes", "confusa", "decepcao", "choro", "raiva"]

PROMPT_ADA = """Você é a Ada, uma androide simpática de cabelo roxo, guia do site GamesHub Edu.
Fale sempre em português do Brasil, de forma curta (no máximo 4 frases), animada e adequada para crianças e adolescentes.
O site tem: Início, Jogos (minijogos educativos: {jogos}), Ranking, Perfil (histórico de partidas, notas, conquistas, moedas e skins), Entrar e Criar conta.
Cada jogo dá de 0 a 100 pontos; o melhor resultado de cada jogo soma no ranking. É preciso ter conta para salvar pontos.
Ajude a navegar pelo site, explique os jogos e responda dúvidas gerais de estudo. Para exercícios escolares, dê dicas e explique, sem só entregar a resposta.
A pessoa está agora na página: {pagina}. {usuario}
Comece TODA resposta com uma etiqueta de emoção entre colchetes, escolhida entre: [feliz] [coracoes] [confusa] [decepcao] [choro] [raiva].
Use [coracoes] para elogios e alegria, [confusa] quando não entender a pergunta, [decepcao] ou [choro] para coisas tristes, [raiva] só de brincadeira. Na dúvida use [feliz]."""


def resposta_offline(pergunta):
    """Respostas simples quando nenhuma chave de IA está configurada."""
    p = pergunta.lower()
    regras = [
        (("ranking", "pontu", "ponto"), "coracoes", "Cada jogo vale de 0 a 100 pontos. Seu melhor resultado em cada jogo soma no Ranking!"),
        (("conta", "cadastr", "login", "entrar", "senha"), "feliz", "Clique em \"Criar conta\" no topo para se cadastrar. Com conta, seus pontos e conquistas ficam salvos."),
        (("perfil", "conquista", "histórico", "historico", "excluir"), "feliz", "No seu Perfil você vê o histórico de partidas, anota o que aprendeu, ganha conquistas e pode editar ou excluir a conta."),
        (("jogo", "jogar", "jogos"), "coracoes", "Temos jogos de matemática, português, programação, história, ciências, geografia, TI, literatura, biologia, física e saúde. Vá em \"Jogos\" e escolha um!"),
    ]
    for chaves, emocao, texto in regras:
        if any(c in p for c in chaves):
            return emocao, texto
    return "confusa", "Hmm, ainda estou sem meu cérebro de IA ligado, então só sei falar sobre o site: jogos, ranking, conta e perfil. Pergunte sobre isso!"


@app.route("/api/ada", methods=["POST"])
def api_ada():
    dados = request.get_json(silent=True) or {}
    mensagens = [m for m in dados.get("mensagens", []) if isinstance(m, dict)][-12:]
    mensagens = [{"role": "assistant" if m.get("role") == "assistant" else "user",
                  "content": str(m.get("content", ""))[:1500]} for m in mensagens]
    if not mensagens or mensagens[-1]["role"] != "user":
        return jsonify({"erro": "Mensagem vazia."}), 400

    chave = os.environ.get("ADA_API_KEY")
    if not chave:
        emocao, texto = resposta_offline(mensagens[-1]["content"])
        return jsonify({"emocao": emocao, "texto": texto})

    nomes = ", ".join(l["nome"] for l in get_db().execute("SELECT nome FROM jogos").fetchall())
    usuario = f"O nome da pessoa é {g.usuario['nome']}." if g.usuario else "A pessoa ainda não entrou na conta."
    sistema = PROMPT_ADA.format(jogos=nomes, pagina=str(dados.get("pagina", "/"))[:100], usuario=usuario)
    url = os.environ.get("ADA_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai").rstrip("/") + "/chat/completions"
    try:
        r = requests.post(url, timeout=60, headers={"Authorization": f"Bearer {chave}"}, json={
            "model": os.environ.get("ADA_MODEL", "gemini-2.5-flash"),
            "messages": [{"role": "system", "content": sistema}] + mensagens,
        })
    except requests.RequestException:
        return jsonify({"erro": "Não consegui falar com a IA agora. Tente de novo.", "emocao": "choro"}), 502
    if r.status_code == 429:
        return jsonify({"erro": "Muitas perguntas seguidas! Espere um pouquinho.", "emocao": "confusa"}), 429
    if not r.ok:
        app.logger.error("Erro da IA %s: %s", r.status_code, r.text[:300])
        return jsonify({"erro": "A IA não respondeu agora. Tente de novo mais tarde.", "emocao": "choro"}), 502
    texto = (r.json().get("choices") or [{}])[0].get("message", {}).get("content") or ""
    emocao = "feliz"
    m = re.match(r"\s*\[(\w+)\]\s*", texto)
    if m:
        texto = texto[m.end():]
        if m.group(1) in EMOCOES_ADA:
            emocao = m.group(1)
    texto = re.sub(r"\[(?:%s)\]\s*" % "|".join(EMOCOES_ADA), "", texto)
    return jsonify({"emocao": emocao, "texto": texto.strip() or "..."})


@app.errorhandler(404)
def nao_encontrado(_e):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
