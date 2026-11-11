// Minijogos do GamesHub Edu (JavaScript puro). Cada jogo termina com pontuação de 0 a 100,
// que é enviada ao Flask via POST /partidas.
(function () {
  const palco = document.getElementById("palco");
  if (!palco) return;
  const slug = palco.dataset.jogo;
  const inicio = Date.now();

  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => shuffle(a).slice(0, n);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hud = (itens) => `<div class="hud">${itens.map(([l, v, t]) => `<div class="${t === "html" ? "hud-html" : t || ""}"><small>${l}</small>${t === "html" ? v : `<strong>${v}</strong>`}</div>`).join("")}</div>`;
  const render = (html) => { palco.innerHTML = html; };
  const ada = (emocao, texto) => window.dispatchEvent(new CustomEvent("ada", { detail: { emocao, texto } }));
  const on = (sel, ev, fn) => palco.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  let moedasGanhas = 0, saldoMoedas = null;

  async function terminar(pontos) {
    pontos = Math.max(0, Math.min(100, Math.round(pontos)));
    if (pontos >= 90) ada("coracoes", `Uau, ${pontos} pontos! Você é incrível! 💜`);
    else if (pontos >= 60) ada("coracoes", `${pontos} pontos, mandou bem!`);
    else if (pontos >= 30) ada("decepcao", `${pontos} pontos... dá pra melhorar, tenta de novo!`);
    else ada("choro", `Só ${pontos} pontos... 😢 Bora tentar outra vez?`);
    const duracao = Math.round((Date.now() - inicio) / 1000);
    let msg = "Entre na sua conta para salvar seus pontos.";
    let extra = "";
    if (palco.dataset.logado === "sim") {
      try {
        const r = await fetch(palco.dataset.salvar, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jogo: slug, pontos, duracao }) });
        const d = await r.json();
        msg = r.ok ? "Pontuação salva no seu perfil!" : (d.erro || "Não foi possível salvar.");
        if (r.ok) { moedasGanhas = d.moedas || 0; saldoMoedas = d.saldo; }
        if (d.novas_conquistas && d.novas_conquistas.length)
          extra = `<div class="alerta alerta-sucesso mt-3">Conquista desbloqueada: ${d.novas_conquistas.map((c) => c.icone + " " + esc(c.nome)).join(", ")}</div>`;
      } catch { msg = "Sem conexão — pontuação não salva."; }
    }
    render(`<div class="fim anim-pop"><p class="texto-suave mb-0">Sua pontuação</p><div class="alvo">${pontos}</div>
      <p>${pontos >= 90 ? "Incrível! 🏆" : pontos >= 60 ? "Mandou bem! 🎉" : "Continue praticando! 💪"}</p>
      ${saldoMoedas === null ? "" : `<p class="moedas-resultado"><img class="moeda-icone" src="/static/img/ada/moeda.png" alt=""> +${moedasGanhas} moedas · saldo ${saldoMoedas}</p>`}
      <p class="texto-suave">${msg} (${duracao}s)</p>${extra}
      <div class="d-flex gap-2 justify-content-center mt-3"><button class="btn btn-game" id="denovo">Jogar de novo</button>
      <a class="btn btn-outline-neon" href="/jogos">Outros jogos</a></div></div>`);
    document.getElementById("denovo").onclick = () => location.reload();
  }

  // ---------- Alvo Numérico ----------
  function alvoNumerico() {
    let tempo = 60, pontos = 0, acertos = 0, nums = [], sel = [], alvo = 0;
    function novo() {
      nums = Array.from({ length: 16 }, () => 1 + Math.floor(Math.random() * 15));
      const k = 3 + Math.floor(Math.random() * 3);
      alvo = pick(nums.map((_, i) => i), k).reduce((s, i) => s + nums[i], 0);
      sel = [];
    }
    function desenhar() {
      const soma = sel.reduce((s, i) => s + nums[i], 0);
      render(hud([["Tempo", tempo + "s", tempo <= 10 ? "ruim" : ""], ["Acertos", acertos], ["Pontos", pontos, "bom"]]) +
        `<div class="text-center"><small class="texto-suave">ALVO</small><div class="alvo">${alvo}</div><p>Soma atual: <strong>${soma}</strong></p></div>
        <div class="grade mx-auto" style="grid-template-columns:repeat(4,1fr);max-width:420px">${nums.map((n, i) => `<button class="peca ${sel.includes(i) ? "sel" : ""}" data-i="${i}">${n}</button>`).join("")}</div>
        <div class="text-center mt-3"><button class="btn btn-outline-neon btn-sm" id="limpar">Limpar</button></div>`);
      on(".peca", "click", (e) => {
        const i = +e.currentTarget.dataset.i;
        sel = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i];
        const s = sel.reduce((a, j) => a + nums[j], 0);
        if (s === alvo) { acertos++; pontos = Math.min(100, pontos + 10); novo(); ada("coracoes", "Acertou o alvo!"); }
        else if (s > alvo) { sel = []; ada("decepcao", "Passou do alvo! Tenta de novo."); }
        desenhar();
      });
      document.getElementById("limpar").onclick = () => { sel = []; desenhar(); };
    }
    novo(); desenhar();
    const t = setInterval(() => { tempo--; if (tempo <= 0) { clearInterval(t); terminar(pontos); } else desenhar(); }, 1000);
  }

  // ---------- Forca ----------
  function forca() {
    const PALAVRAS = [
      ["SUBSTANTIVO", "Classe de palavra que dá nome a seres, objetos e lugares."], ["VERBO", "Palavra que indica ação, estado ou fenômeno da natureza."],
      ["ADJETIVO", "Palavra que dá uma qualidade ao substantivo."], ["SINÔNIMO", "Palavra com significado parecido com o de outra."],
      ["ANTÔNIMO", "Palavra com significado oposto ao de outra."], ["PRONOME", "Palavra que substitui o nome, como 'ele' e 'nós'."],
      ["ADVÉRBIO", "Modifica o verbo indicando tempo, lugar ou modo."], ["PARÁGRAFO", "Parte do texto que começa com recuo e reúne uma ideia."],
      ["INTERJEIÇÃO", "Expressa emoção rápida, como 'Ufa!' e 'Oba!'."], ["SÍLABA", "Cada pedacinho de som em que dividimos uma palavra."],
      ["PLURAL", "Forma da palavra que indica mais de um."], ["VÍRGULA", "Sinal de pontuação que indica uma pequena pausa."],
      ["SUBJUNTIVO", "Modo verbal que expressa hipótese, desejo ou possibilidade."], ["PREPOSIÇÃO", "Palavra que conecta termos e estabelece relações entre eles."],
      ["PROPAROXÍTONA", "Palavra cuja antepenúltima sílaba é a tônica."], ["DITONGO", "Encontro de uma vogal e uma semivogal na mesma sílaba."],
      ["HIATO", "Encontro de duas vogais pronunciadas em sílabas diferentes."], ["METÁFORA", "Figura de linguagem que aproxima ideias por uma relação de sentido."],
      ["ONOMATOPEIA", "Palavra que imita ou representa um som."], ["PREDICADO", "Termo da oração que declara algo sobre o sujeito."],
      ["PAROXÍTONA", "Palavra cuja penúltima sílaba é a tônica."], ["CONJUNÇÃO", "Palavra que liga termos ou orações."],
    ];
    const norm = (c) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const rodadas = pick(PALAVRAS, 6); let r = 0, chutes = [], pontos = 0, estado = "jogando", ultimoChute = 0;
    function desenhar() {
      const [palavra, dica] = rodadas[r]; const letras = palavra.split("");
      const erros = chutes.filter((c) => !letras.some((l) => norm(l) === c)).length;
      if (estado === "jogando") {
        if (letras.every((l) => chutes.includes(norm(l)))) { estado = "ganhou"; pontos += Math.max(8, 20 - erros * 2); ada("coracoes", "Descobriu a palavra!"); }
        else if (erros >= 5) { estado = "perdeu"; ada("choro", "Ah não, acabaram as vidas..."); }
        else if (chutes.length && chutes.length !== ultimoChute) { const k = chutes[chutes.length - 1]; const ok = letras.some((l) => norm(l) === k); ada(ok ? "coracoes" : erros >= 4 ? "raiva" : "decepcao", ok ? "Boa letra!" : erros >= 4 ? "Cuidado, poucas vidas!" : "Essa letra não tem..."); }
        ultimoChute = chutes.length;
      }
      render(hud([["Palavra", `${r + 1}/${rodadas.length}`], ["Vidas", "❤".repeat(Math.max(0, 5 - erros)) || "0", erros >= 3 ? "ruim" : ""], ["Pontos", pontos, "bom"]]) +
        `<div class="cartao text-center mb-3" style="background:var(--acento)"><small class="text-primary-neon fw-bold">DICA</small><div class="fs-5">${dica}</div></div>
        <div class="d-flex flex-wrap justify-content-center gap-2 my-4">${letras.map((l) => { const v = chutes.includes(norm(l)) || estado === "perdeu"; return `<span class="letra ${v ? "vis" : ""}">${v ? l : ""}</span>`; }).join("")}</div>` +
        (estado === "jogando"
          ? `<div class="grade mx-auto" style="grid-template-columns:repeat(9,1fr);max-width:560px">${LETRAS.map((k) => { const u = chutes.includes(k); const b = u && letras.some((l) => norm(l) === k); return `<button class="peca p-1 fs-6 ${b ? "ok" : ""}" data-k="${k}" ${u ? "disabled" : ""}>${k}</button>`; }).join("")}</div>`
          : `<div class="text-center anim-pop"><p class="fs-4 fw-bold ${estado === "ganhou" ? "text-sucesso" : "text-perigo"}">${estado === "ganhou" ? "Acertou!" : "A palavra era " + palavra}</p><button class="btn btn-game" id="prox">${r + 1 >= rodadas.length ? "Ver resultado" : "Próxima palavra"}</button></div>`));
      on(".peca", "click", (e) => { chutes.push(e.currentTarget.dataset.k); desenhar(); });
      const p = document.getElementById("prox");
      if (p) p.onclick = () => { if (r + 1 >= rodadas.length) return terminar(pontos); r++; chutes = []; estado = "jogando"; desenhar(); };
    }
    document.addEventListener("keydown", (e) => { const k = e.key.toUpperCase(); if (estado === "jogando" && LETRAS.includes(k) && !chutes.includes(k)) { chutes.push(k); desenhar(); } });
    desenhar();
  }

  // ---------- Robô Programador ----------
  function robo() {
    const FASES = [["S...", "##.#", "...G"], ["S.#..", "..#..", "#....", "..#.G"], ["S#...", ".#.#.", ".#.#.", "...#G"],
      ["S....#", "####..", "......", ".#####", ".#####", ".....G"]];
    const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], SETA = ["➡️", "⬇️", "⬅️", "⬆️"];
    const achar = (f, ch) => { for (let y = 0; y < f.length; y++) { const x = f[y].indexOf(ch); if (x >= 0) return { x, y }; } };
    const livre = (f, x, y) => y >= 0 && y < f.length && x >= 0 && x < f[y].length && f[y][x] !== "#";
    const aplicar = (f, s, c) => c === "L" ? { ...s, d: (s.d + 3) % 4 } : c === "R" ? { ...s, d: (s.d + 1) % 4 } : (livre(f, s.x + DX[s.d], s.y + DY[s.d]) ? { ...s, x: s.x + DX[s.d], y: s.y + DY[s.d] } : null);
    function otimo(f) {
      const g = achar(f, "G"); let fr = [{ ...achar(f, "S"), d: 0 }]; const visto = new Set([fr[0].x + "," + fr[0].y + ",0"]);
      for (let p = 0; fr.length; p++) { const nx = []; for (const s of fr) { if (s.x === g.x && s.y === g.y) return p;
        for (const c of "FLR") { const n = aplicar(f, s, c); const k = n && n.x + "," + n.y + "," + n.d; if (n && !visto.has(k)) { visto.add(k); nx.push(n); } } } fr = nx; }
    }
    let fase = 0, prog = [], batidas = 0, pontos = 0, estado = { ...achar(FASES[0], "S"), d: 0 }, rastro = [], msg = "", rodando = false;
    function desenhar() {
      const f = FASES[fase];
      render(hud([["Fase", `${fase + 1}/${FASES.length}`], ["Batidas", batidas, batidas ? "ruim" : ""], ["Mínimo", otimo(f) + " cmds"], ["Pontos", pontos, "bom"]]) +
        `<div class="row g-3"><div class="col-md-6 text-center"><div class="robo-grade" style="grid-template-columns:repeat(${f[0].length},54px)">${f.map((linha, y) => linha.split("").map((c, x) => {
          const aqui = estado.x === x && estado.y === y; const r = rastro.some((t) => t.x === x && t.y === y);
          return `<div class="robo-cel ${c === "#" ? "parede" : ""} ${r ? "rastro" : ""}">${aqui ? "🤖" : c === "G" ? "🔋" : c === "#" ? "🧱" : ""}</div>`; }).join("")).join("")}</div>
          <p class="small texto-suave mt-2">Robô virado para ${SETA[estado.d]}</p></div>
        <div class="col-md-6"><p class="fw-bold mb-1">Seu programa (${prog.length}):</p><div class="cartao p-2 mb-2" style="min-height:60px">${prog.map((c) => `<span class="cmd">${c === "F" ? "⬆ Andar" : c === "L" ? "↺ Esquerda" : "↻ Direita"}</span>`).join("") || '<span class="texto-suave small">Adicione comandos…</span>'}</div>
          <div class="d-flex flex-wrap gap-2"><button class="btn btn-outline-neon btn-sm" data-c="F">⬆ Andar</button><button class="btn btn-outline-neon btn-sm" data-c="L">↺ Esquerda</button><button class="btn btn-outline-neon btn-sm" data-c="R">↻ Direita</button>
          <button class="btn btn-perigo btn-sm" id="apagar">⌫</button></div>
          <button class="btn btn-game w-100 mt-3" id="exec" ${rodando || !prog.length ? "disabled" : ""}>▶ Executar</button><p class="mt-2 fw-bold">${msg}</p></div></div>`);
      on("[data-c]", "click", (e) => { if (!rodando) { prog.push(e.currentTarget.dataset.c); desenhar(); } });
      document.getElementById("apagar").onclick = () => { prog.pop(); desenhar(); };
      document.getElementById("exec").onclick = executar;
    }
    async function executar() {
      const f = FASES[fase], g = achar(f, "G"); rodando = true; estado = { ...achar(f, "S"), d: 0 }; rastro = [estado]; msg = "";
      for (const c of prog) {
        await new Promise((r) => setTimeout(r, 350));
        const n = aplicar(f, estado, c);
        if (!n) { batidas++; ada(batidas >= 3 ? "raiva" : "decepcao", batidas >= 3 ? "Batemos de novo! Grrr!" : "Opa, bateu na parede!"); msg = "💥 Bateu na parede! Ajuste o programa."; rodando = false; return desenhar(); }
        estado = n; rastro.push(n); desenhar();
        if (n.x === g.x && n.y === g.y) {
          pontos += Math.max(5, 25 - batidas * 6 - Math.max(0, prog.length - otimo(f)) * 3);
          await new Promise((r) => setTimeout(r, 600));
          if (fase === FASES.length - 1) return terminar(Math.min(100, pontos));
          fase++; prog = []; batidas = 0; estado = { ...achar(FASES[fase], "S"), d: 0 }; rastro = []; ada("coracoes", "Bateria carregada!"); msg = "🔋 Bateria carregada! Próxima fase."; rodando = false; return desenhar();
        }
      }
      ada("confusa", "Hmm, faltou caminho até a bateria..."); msg = "O robô parou antes da bateria."; rodando = false; desenhar();
    }
    desenhar();
  }

  // ---------- Linha do Tempo ----------
  function linhaDoTempo() {
    const CONJ = [
      ["História do Brasil", [["Chegada dos portugueses ao Brasil", 1500, "1500", "Ocorreu no início da colonização portuguesa."], ["Inconfidência Mineira", 1789, "1789", "Movimento colonial contra a cobrança de impostos pela Coroa portuguesa."], ["Independência do Brasil", 1822, "1822", "Dom Pedro I proclamou a separação de Portugal."], ["Abolição da escravatura (Lei Áurea)", 1888, "1888", "A lei foi assinada um ano antes da proclamação da República."], ["Proclamação da República", 1889, "1889", "O fim da monarquia aconteceu logo após a abolição."], ["Inauguração de Brasília", 1960, "1960", "A nova capital foi inaugurada no governo de Juscelino Kubitschek."]]],
      ["Mundo antigo ao moderno", [["Construção das pirâmides de Gizé", -2560, "c. 2560 a.C.", "Aconteceu muito antes da fundação de Roma."], ["Fundação de Roma", -753, "753 a.C.", "Segundo a tradição, a cidade foi fundada em 753 a.C."], ["Queda do Império Romano do Ocidente", 476, "476", "Marca o início convencional da Idade Média na Europa."], ["Carta Magna", 1215, "1215", "Documento medieval que limitou alguns poderes do rei da Inglaterra."], ["Colombo chega à América", 1492, "1492", "A viagem aconteceu no final do século XV."], ["Revolução Francesa", 1789, "1789", "Começou no final do século XVIII."]]],
      ["Séculos XVIII a XX", [["Início da Revolução Industrial", 1760, "c. 1760", "Começou antes da independência dos Estados Unidos."], ["Independência dos Estados Unidos", 1776, "1776", "As colônias declararam sua independência no século XVIII."], ["Começa a Primeira Guerra Mundial", 1914, "1914", "O conflito começou no início do século XX."], ["Fim da Segunda Guerra Mundial", 1945, "1945", "Terminou antes da chegada humana à Lua."], ["Ser humano pisa na Lua", 1969, "1969", "A missão Apollo 11 ocorreu durante a Guerra Fria."], ["Queda do Muro de Berlim", 1989, "1989", "O evento ocorreu no fim da década de 1980."]]],
    ];
    let r = 0, ordem = shuffle(CONJ[0][1]), conferido = false, pontos = 0, dicasUsadas = 0, dicaAtual = "";
    function desenhar() {
      const certa = CONJ[r][1].slice().sort((a, b) => a[1] - b[1]);
      const controleDica = `<div class="hud-dica"><strong>${7 - dicasUsadas}/7</strong>${conferido ? "" : `<select class="form-select form-select-sm campo" id="evento-dica" aria-label="Escolha o evento para receber uma dica">${ordem.map((ev, i) => `<option value="${i}">${esc(ev[0])}</option>`).join("")}</select><button class="btn btn-outline-neon btn-sm" id="pedir-dica" ${dicasUsadas >= 7 ? "disabled" : ""}>Dica</button>`}</div>`;
      render(hud([["Rodada", `${r + 1}/3`], ["Tema", CONJ[r][0]], ["Pontos", pontos, "bom"], ["Dicas", controleDica, "html"]]) +
        (dicaAtual ? `<div class="alerta alerta-aviso">Dica: ${dicaAtual}</div>` : "") +
        `<p class="texto-suave">Do mais antigo (topo) ao mais recente:</p>` +
        ordem.map((ev, i) => { const ok = conferido && ev === certa[i];
          return `<div class="evento"><div class="cartao ${conferido ? (ok ? "border-success" : "border-danger") : ""}">${ev[0]}${conferido ? ` <strong class="${ok ? "text-sucesso" : "text-perigo"}">(${ev[2]})</strong>` : ""}</div>
          ${conferido ? "" : `<button class="btn btn-outline-neon btn-sm" data-up="${i}" ${i === 0 ? "disabled" : ""}>▲</button><button class="btn btn-outline-neon btn-sm" data-dn="${i}" ${i === ordem.length - 1 ? "disabled" : ""}>▼</button>`}</div>`; }).join("") +
        `<div class="text-center mt-3"><button class="btn btn-game" id="acao">${conferido ? (r === 2 ? "Ver resultado" : "Próxima rodada") : "Conferir"}</button></div>`);
      on("[data-up]", "click", (e) => { const i = +e.currentTarget.dataset.up; [ordem[i - 1], ordem[i]] = [ordem[i], ordem[i - 1]]; desenhar(); });
      on("[data-dn]", "click", (e) => { const i = +e.currentTarget.dataset.dn; [ordem[i + 1], ordem[i]] = [ordem[i], ordem[i + 1]]; desenhar(); });
      const pedirDica = document.getElementById("pedir-dica");
      if (pedirDica) pedirDica.onclick = () => {
        if (dicasUsadas >= 7) return;
        const evento = ordem[+document.getElementById("evento-dica").value];
        dicaAtual = evento[3]; dicasUsadas++; desenhar();
      };
      document.getElementById("acao").onclick = () => {
        if (!conferido) { conferido = true; const nc = ordem.filter((ev, i) => ev === certa[i]).length; pontos += Math.round(nc * (100 / certa.length / CONJ.length)); dicaAtual = ""; ada(nc === certa.length ? "coracoes" : nc >= 3 ? "confusa" : "decepcao", nc === certa.length ? "Ordem perfeita!" : `${nc} de ${certa.length} no lugar certo.`); return desenhar(); }
        if (r === 2) return terminar(pontos);
        r++; ordem = shuffle(CONJ[r][1]); conferido = false; dicaAtual = ""; desenhar();
      };
    }
    desenhar();
  }

  // ---------- Memória ----------
  function memoria() {
    const PARES = [["Fotossíntese", "Plantas produzem açúcares usando luz"], ["Célula", "Unidade estrutural e funcional da vida"], ["Gravidade", "Interação de atração entre corpos com massa"],
      ["Evaporação", "Passagem gradual do líquido para o estado gasoso"], ["Coração", "Impulsiona o sangue pelo corpo"], ["Oxigênio", "Gás usado na respiração de muitos organismos"],
      ["Sol", "Estrela central do sistema solar"], ["Raiz", "Absorve água e sais minerais do solo"], ["Mitocôndria", "Estrutura celular ligada à produção de energia"],
      ["Núcleo", "Abriga grande parte do material genético celular"], ["Condensação", "Passagem do estado gasoso para o líquido"], ["Ecossistema", "Interação entre seres vivos e fatores do ambiente"],
      ["Produtor", "Organismo que produz matéria orgânica na cadeia alimentar"], ["Decompositor", "Organismo que recicla nutrientes ao decompor matéria"],
      ["Cadeia alimentar", "Relação de alimentação entre organismos"], ["Microscópio", "Instrumento que amplia estruturas pequenas"]];
    const quantidadePares = 8;
    const cartas = shuffle(pick(PARES, quantidadePares).flatMap(([a, b], i) => [{ t: a, p: i }, { t: b, p: i }]));
    let abertas = [], achadas = new Set(), jogadas = 0, travado = false;
    function desenhar() {
      render(hud([["Jogadas", jogadas], ["Pares", `${achadas.size}/${quantidadePares}`, "bom"]]) +
        `<div class="grade" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${cartas.map((c, i) => { const v = abertas.includes(i) || achadas.has(c.p);
          return `<button class="peca carta ${achadas.has(c.p) ? "ok" : v ? "sel" : "virada"}" data-i="${i}" ${v ? "disabled" : ""}>${v ? c.t : "❓"}</button>`; }).join("")}</div>`);
      on(".carta", "click", (e) => {
        if (travado) return; abertas.push(+e.currentTarget.dataset.i);
        if (abertas.length === 2) {
          jogadas++; const [a, b] = abertas;
          if (cartas[a].p === cartas[b].p) { ada("coracoes", "Achou um par!"); achadas.add(cartas[a].p); abertas = []; if (achadas.size === quantidadePares) { desenhar(); return setTimeout(() => terminar(100 - Math.max(0, jogadas - quantidadePares) * 4), 500); } }
          else { ada("confusa", "Não é par... lembra onde estavam?"); travado = true; setTimeout(() => { abertas = []; travado = false; desenhar(); }, 900); }
        }
        desenhar();
      });
    }
    desenhar();
  }

  // ---------- Liga as Capitais ----------
  function capitais() {
    const TODOS = [["Brasil", "Brasília"], ["Argentina", "Buenos Aires"], ["França", "Paris"], ["Japão", "Tóquio"], ["Canadá", "Ottawa"], ["Austrália", "Camberra"],
      ["Egito", "Cairo"], ["Itália", "Roma"], ["Portugal", "Lisboa"], ["México", "Cidade do México"], ["Chile", "Santiago"], ["Alemanha", "Berlim"], ["Peru", "Lima"], ["Espanha", "Madri"], ["China", "Pequim"],
      ["Índia", "Nova Délhi"], ["Coreia do Sul", "Seul"], ["Quênia", "Nairóbi"], ["Noruega", "Oslo"], ["Suécia", "Estocolmo"], ["Grécia", "Atenas"], ["Turquia", "Ancara"], ["Indonésia", "Jacarta"], ["Marrocos", "Rabat"]];
    const quantidadePorRodada = 6;
    const rodadas = [0, 1, 2].map(() => []); shuffle(TODOS).slice(0, quantidadePorRodada * 3).forEach((p, i) => rodadas[Math.floor(i / quantidadePorRodada)].push(p));
    let r = 0, sel = null, feitos = new Set(), erros = 0, errosTotal = 0, caps = shuffle(rodadas[0]), erroCap = null;
    function desenhar() {
      const ps = rodadas[r];
      render(hud([["Rodada", `${r + 1}/3`], ["Erros", errosTotal + erros, erros ? "ruim" : ""]]) +
        `<div class="row g-3"><div class="col-6"><div class="grade">${ps.map(([p]) => `<button class="peca fs-6 ${feitos.has(p) ? "ok" : sel === p ? "sel" : ""}" data-p="${p}" ${feitos.has(p) ? "disabled" : ""}>${p}</button>`).join("")}</div></div>
        <div class="col-6"><div class="grade">${caps.map(([p, c]) => `<button class="peca fs-6 ${feitos.has(p) ? "ok" : erroCap === c ? "erro" : ""}" data-c="${c}" data-dono="${p}" ${feitos.has(p) ? "disabled" : ""}>${c}</button>`).join("")}</div></div></div>
        <p class="texto-suave small mt-3 text-center">Clique em um país e depois na capital.</p>`);
      on("[data-p]", "click", (e) => { sel = e.currentTarget.dataset.p; erroCap = null; desenhar(); });
      on("[data-c]", "click", (e) => {
        if (!sel) return;
        if (e.currentTarget.dataset.dono === sel) { feitos.add(sel); erroCap = null; ada("coracoes", "Capital certa!"); } else { erros++; erroCap = e.currentTarget.dataset.c; ada(erros >= 3 ? "raiva" : "decepcao", erros >= 3 ? "De novo errado?!" : "Não é essa capital..."); }
        sel = null;
        if (ps.every(([p]) => feitos.has(p))) {
          errosTotal += erros; erros = 0;
          if (r === 2) return terminar(100 - errosTotal * 5);
          r++; feitos = new Set(); caps = shuffle(rodadas[r]);
        }
        desenhar();
      });
    }
    desenhar();
  }

  // ---------- Código Binário ----------
  function binario() {
    const VAL = [512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
    const alvos = Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 1023));
    let r = 0, bits = Array(VAL.length).fill(false), erros = 0, pontos = 0;
    function desenhar() {
      const soma = VAL.reduce((s, v, i) => s + (bits[i] ? v : 0), 0);
      render(hud([["Número", `${r + 1}/${alvos.length}`], ["Erros", erros, erros ? "ruim" : ""], ["Pontos", pontos, "bom"]]) +
        `<div class="text-center"><small class="texto-suave">FORME O NÚMERO</small><div class="alvo">${alvos[r]}</div><p>Valor atual: <strong>${soma}</strong> · binário <code>${bits.map((b) => (b ? 1 : 0)).join("")}</code></p></div>
        <div class="grade mx-auto" style="grid-template-columns:repeat(5,1fr);max-width:480px">${VAL.map((v, i) => `<div class="text-center"><button class="peca bit ${bits[i] ? "on" : ""}" data-i="${i}">💡</button><small class="texto-suave">${v}</small></div>`).join("")}</div>
        <div class="text-center mt-3"><button class="btn btn-game" id="conf">Confirmar</button></div>`);
      on(".bit", "click", (e) => { const i = +e.currentTarget.dataset.i; bits[i] = !bits[i]; desenhar(); });
      document.getElementById("conf").onclick = () => {
        if (soma === alvos[r]) { ada("coracoes", "Número formado!"); pontos += Math.max(4, 13 - erros * 3); erros = 0; if (r === alvos.length - 1) return terminar(Math.min(100, pontos)); r++; bits = Array(VAL.length).fill(false); }
        else { erros++; ada(erros >= 3 ? "raiva" : "decepcao", erros >= 3 ? "Grr, confere os valores!" : "Ainda não é esse número."); }
        desenhar();
      };
    }
    desenhar();
  }

  const MATERIA_QUIZ = {
    "corrida-fracoes": "matematica", "balanca-equacoes": "matematica",
    "detetive-texto": "portugues", "desafio-acentos": "portugues",
    "corrida-algoritmos": "programacao", "laboratorio-debug": "programacao",
    "rotas-civilizacoes": "historia", "brasil-em-foco": "historia",
    "metodo-cientifico": "ciencias", "trilha-ecossistemas": "ciencias",
    "mapa-biomas": "geografia", "coordenadas-mapa": "geografia",
    "internet-segura": "ti", "cifra-binaria": "ti",
    "generos-literarios": "literatura", "personagens-literarios": "literatura", "poesia-em-jogo": "literatura",
    "corpo-humano": "biologia", "genes-heranca": "biologia", "vida-em-equilibrio": "biologia",
    "forcas-energia": "fisica", "circuito-eletrico": "fisica", "energia-em-movimento": "fisica",
    "habitos-saudaveis": "saude", "primeiros-cuidados": "saude", "rotina-saude": "saude",
  };

  const CONCEITOS = {
    matematica: [
      ["fração", "Representa partes iguais de um todo por meio de numerador e denominador.", "Dividir uma pizza em oito partes iguais e considerar três."],
      ["porcentagem", "Expressa uma razão com denominador 100.", "Uma promoção reduz o preço em 15 de cada 100 reais."],
      ["equação", "Igualdade matemática que contém uma ou mais incógnitas.", "Descobrir o número que torna x + 4 = 9 verdadeira."],
      ["perímetro", "Medida do contorno de uma figura plana.", "Somar os lados de um jardim retangular para cercá-lo."],
      ["área", "Medida da superfície ocupada por uma figura.", "Calcular quantos ladrilhos cobrem o chão de uma sala."],
      ["média aritmética", "Soma dos valores dividida pela quantidade de valores.", "Somar cinco notas e dividir o resultado por cinco."],
      ["proporção", "Relação de igualdade entre duas razões.", "Ajustar uma receita mantendo a mesma relação de ingredientes."],
      ["potência", "Multiplicação de fatores iguais representada por base e expoente.", "Escrever 2 × 2 × 2 como 2³."],
      ["número primo", "Número natural maior que 1 com exatamente dois divisores positivos.", "O número 7 só pode ser dividido exatamente por 1 e por 7."],
      ["probabilidade", "Medida da chance de um resultado acontecer.", "Estimar a chance de sair cara ao lançar uma moeda equilibrada."],
    ],
    portugues: [
      ["substantivo", "Palavra que nomeia pessoas, lugares, objetos, sentimentos ou ideias.", "Na frase 'A menina leu', identifica quem é a menina."],
      ["verbo", "Palavra que expressa ação, estado ou fenômeno da natureza.", "Na frase 'As crianças brincam', indica o que elas fazem."],
      ["adjetivo", "Palavra que atribui característica a um substantivo.", "Em 'céu azul', descreve a palavra céu."],
      ["pronome", "Palavra que acompanha ou substitui um substantivo.", "Usar 'ela' para não repetir o nome de uma pessoa."],
      ["advérbio", "Palavra que pode modificar verbo, adjetivo ou outro advérbio.", "Em 'chegou cedo', informa quando alguém chegou."],
      ["sinônimo", "Palavra com sentido igual ou semelhante ao de outra.", "Usar 'contente' no lugar de 'feliz' em certo contexto."],
      ["antônimo", "Palavra com sentido oposto ao de outra.", "O sentido de 'claro' se opõe ao de 'escuro'."],
      ["sujeito", "Termo sobre o qual se declara algo na oração.", "Em 'Os atletas correram', indica quem correu."],
      ["predicado", "Parte da oração que declara algo sobre o sujeito.", "Em 'Os atletas correram', corresponde ao que se diz deles."],
      ["conjunção", "Palavra que liga termos ou orações.", "Usar 'mas' para conectar duas ideias em oposição."],
    ],
    programacao: [
      ["variável", "Espaço identificado por um nome que guarda um valor durante a execução.", "Guardar a pontuação atual do jogador em uma referência chamada pontos."],
      ["laço de repetição", "Estrutura que executa instruções várias vezes.", "Fazer o personagem avançar dez passos sem escrever dez comandos iguais."],
      ["condicional", "Estrutura que escolhe ações conforme uma condição verdadeira ou falsa.", "Se a resposta estiver certa, somar um ponto; caso contrário, mostrar uma dica."],
      ["função", "Bloco reutilizável de instruções que realiza uma tarefa.", "Criar uma rotina chamada calcularTotal para somar itens do carrinho."],
      ["algoritmo", "Sequência finita e ordenada de passos para resolver um problema.", "Descrever os passos para organizar uma lista do menor para o maior."],
      ["depuração", "Processo de localizar, compreender e corrigir erros em um programa.", "Inspecionar valores e corrigir uma condição que falha em um caso."],
      ["parâmetro", "Informação recebida por uma função para influenciar seu comportamento.", "Passar o nome do jogador a uma função que exibe uma saudação."],
      ["lista", "Estrutura que mantém vários valores em uma sequência ordenada.", "Guardar as respostas de uma rodada em uma coleção indexada."],
      ["booleano", "Tipo de dado que representa verdadeiro ou falso.", "Uma variável concluido pode indicar se a tarefa terminou."],
      ["evento", "Ocorrência que pode disparar uma ação no programa.", "Executar uma função quando a pessoa clica em um botão."],
    ],
    historia: [
      ["Independência do Brasil", "Ruptura política que tornou o Brasil independente de Portugal em 1822.", "Dom Pedro declarou a separação às margens do riacho Ipiranga."],
      ["Lei Áurea", "Lei assinada em 1888 que aboliu legalmente a escravidão no Brasil.", "A princesa Isabel sancionou a lei em 13 de maio daquele ano."],
      ["Proclamação da República", "Movimento de 1889 que encerrou a monarquia e iniciou o regime republicano no Brasil.", "O marechal Deodoro da Fonseca liderou o movimento no Rio de Janeiro."],
      ["Revolução Francesa", "Processo iniciado em 1789 que transformou a política e a sociedade francesas.", "A queda da Bastilha tornou-se um símbolo do início da revolução."],
      ["Revolução Industrial", "Transformação iniciada no século XVIII marcada pela mecanização da produção.", "Máquinas a vapor passaram a ser usadas em fábricas e transportes."],
      ["Antigo Egito", "Civilização do nordeste da África organizada ao longo do rio Nilo.", "Pirâmides e hieróglifos são importantes vestígios dessa civilização."],
      ["Império Romano", "Estado da Antiguidade que dominou áreas ao redor do mar Mediterrâneo.", "Estradas, leis e latim marcaram sua influência histórica."],
      ["Brasília", "Capital federal brasileira inaugurada em 1960 durante o governo de Juscelino Kubitschek.", "A cidade planejada substituiu o Rio de Janeiro como capital."],
      ["Primeira Guerra Mundial", "Conflito de grandes proporções ocorrido entre 1914 e 1918.", "O assassinato do arquiduque Francisco Ferdinando foi o estopim imediato."],
      ["Segunda Guerra Mundial", "Conflito global ocorrido entre 1939 e 1945.", "A guerra terminou em 1945 após a rendição das potências do Eixo."],
    ],
    ciencias: [
      ["fotossíntese", "Processo pelo qual plantas, algas e algumas bactérias convertem energia luminosa em energia química.", "Uma planta usa luz, água e gás carbônico para produzir açúcares."],
      ["evaporação", "Passagem gradual de uma substância do estado líquido para o gasoso.", "Uma poça diminui ao longo do dia quente sem entrar em ebulição."],
      ["condensação", "Mudança do estado gasoso para o líquido.", "Gotículas aparecem na parte externa de um copo gelado."],
      ["gravidade", "Interação que atrai corpos com massa uns em direção aos outros.", "Uma bola lançada para cima retorna em direção ao chão."],
      ["ecossistema", "Conjunto de seres vivos e fatores não vivos que interagem em um ambiente.", "Plantas, animais, água, solo e clima interagem em uma lagoa."],
      ["microscópio", "Instrumento que amplia estruturas pequenas para observação.", "Uma estudante observa células que não são visíveis a olho nu."],
      ["oxigênio", "Elemento químico presente no ar e usado na respiração de muitos organismos.", "Peixes obtêm esse gás dissolvido na água pelas brânquias."],
      ["estado sólido", "Estado da matéria que mantém forma e volume definidos.", "Um cubo de gelo mantém sua forma enquanto não derrete."],
      ["estado líquido", "Estado da matéria com volume definido e forma que depende do recipiente.", "A água assume o formato de um copo sem deixar de ocupar volume."],
      ["energia", "Grandeza associada à capacidade de produzir transformações ou realizar trabalho.", "A energia química dos alimentos é usada pelo corpo em atividades."],
    ],
    geografia: [
      ["Linha do Equador", "Paralelo imaginário de latitude zero que divide os hemisférios Norte e Sul.", "Um ponto ao norte dessa linha está no Hemisfério Norte."],
      ["legenda cartográfica", "Chave que explica o significado de cores e símbolos usados em um mapa.", "Um quadrado azul pode indicar uma represa conforme a chave do mapa."],
      ["escala cartográfica", "Relação proporcional entre uma distância no mapa e a distância real.", "Um centímetro no mapa pode representar vários quilômetros no terreno."],
      ["latitude", "Distância angular de um ponto em relação à Linha do Equador.", "A coordenada informa se um lugar está ao norte ou ao sul do Equador."],
      ["longitude", "Distância angular de um ponto em relação ao meridiano de Greenwich.", "A coordenada ajuda a localizar um lugar a leste ou oeste de Greenwich."],
      ["bioma", "Grande conjunto de ecossistemas com clima, vegetação e fauna característicos.", "A Caatinga apresenta adaptações à escassez de água em certas épocas."],
      ["bacia hidrográfica", "Área drenada por um rio principal e seus afluentes.", "Vários cursos d'água escoam para um mesmo rio principal."],
      ["clima", "Padrão de condições atmosféricas observado em uma região por longos períodos.", "Décadas de temperatura e chuva ajudam a caracterizar uma região."],
      ["tempo atmosférico", "Condição momentânea da atmosfera em determinado lugar.", "A previsão informa chuva e temperatura esperadas para amanhã."],
      ["densidade demográfica", "Relação entre a população de um território e sua área.", "Comparar quantas pessoas vivem por quilômetro quadrado em duas cidades."],
    ],
    ti: [
      ["byte", "Unidade de informação digital normalmente formada por oito bits.", "Um caractere simples pode ser representado usando um ou mais bytes."],
      ["phishing", "Tentativa de obter dados por meio de mensagens ou páginas enganosas.", "Um e-mail falso pede que a pessoa confirme a senha em um link suspeito."],
      ["backup", "Cópia de segurança usada para recuperar dados em caso de perda.", "Manter uma cópia dos arquivos importantes em outro local seguro."],
      ["autenticação em dois fatores", "Verificação de identidade que combina dois fatores diferentes.", "Além da senha, um serviço pede um código temporário no celular."],
      ["firewall", "Sistema que controla tráfego de rede conforme regras de segurança.", "Uma rede bloqueia conexões não autorizadas usando regras configuradas."],
      ["navegador", "Programa usado para acessar e visualizar páginas e serviços da web.", "Uma pessoa abre um site usando Firefox, Edge ou outro aplicativo."],
      ["CPU", "Componente que executa instruções e coordena operações do computador.", "O processador realiza cálculos e executa instruções de programas."],
      ["criptografia", "Técnica que transforma dados para que só destinatários autorizados os compreendam.", "Uma conversa protegida fica ilegível para quem não possui a chave adequada."],
      ["endereço IP", "Identificador numérico usado para localizar uma interface em uma rede.", "Um dispositivo usa esse identificador para trocar dados pela internet."],
      ["sistema operacional", "Software que gerencia recursos do dispositivo e oferece serviços aos aplicativos.", "Windows, Linux e Android coordenam arquivos, memória e programas."],
    ],
    literatura: [
      ["verso", "Cada linha de uma composição poética.", "Uma linha isolada de um poema pode ser identificada por essa unidade."],
      ["estrofe", "Conjunto de versos agrupados em um poema.", "Um espaço em branco pode separar esse bloco do próximo no poema."],
      ["narrador", "Voz que conta os acontecimentos de uma narrativa.", "Uma voz em primeira pessoa relata uma viagem que viveu."],
      ["metáfora", "Figura de linguagem que aproxima ideias sem usar comparação explícita.", "Dizer 'o tempo é um rio' associa duas ideias de forma figurada."],
      ["personagem", "Figura que participa das ações de uma narrativa ou peça.", "A protagonista toma decisões que influenciam o rumo da história."],
      ["conflito narrativo", "Problema ou tensão que impulsiona os acontecimentos de uma narrativa.", "Uma personagem precisa escolher entre cumprir uma promessa e proteger alguém."],
      ["fábula", "Narrativa breve que frequentemente apresenta animais personificados e uma moral.", "Uma história curta termina com uma reflexão sobre prudência."],
      ["rima", "Semelhança sonora entre palavras, especialmente no final de versos.", "'Coração' e 'canção' compartilham sons finais semelhantes."],
      ["crônica", "Texto breve que costuma refletir sobre situações cotidianas.", "Uma cena comum no ônibus vira ponto de partida para uma reflexão."],
      ["drama", "Gênero literário estruturado para representar ações por meio de falas e cenas.", "A história é apresentada por personagens que dialogam no palco."],
    ],
    biologia: [
      ["DNA", "Molécula que armazena informação genética em muitos seres vivos.", "Características hereditárias estão relacionadas às informações dessa molécula."],
      ["célula", "Unidade estrutural e funcional básica dos seres vivos.", "Tecidos do corpo são formados por muitas unidades microscópicas."],
      ["coração", "Órgão muscular que impulsiona o sangue pelo sistema circulatório.", "Suas contrações ajudam a levar sangue aos tecidos do corpo."],
      ["cloroplasto", "Estrutura celular de plantas e algas onde ocorre a fotossíntese.", "A clorofila presente nessa estrutura capta energia luminosa."],
      ["produtor", "Organismo que produz matéria orgânica a partir de fontes inorgânicas de energia.", "Uma planta usa luz para produzir açúcares em uma cadeia alimentar."],
      ["respiração celular", "Processo celular que libera energia a partir de moléculas orgânicas.", "Células obtêm energia utilizável a partir de nutrientes."],
      ["sistema nervoso", "Conjunto de estruturas que recebe informações e coordena respostas do organismo.", "O cérebro interpreta um estímulo e ajuda a coordenar uma reação."],
      ["biodiversidade", "Variedade de genes, espécies e ecossistemas em uma região ou no planeta.", "Uma floresta abriga muitas espécies e diferentes ambientes."],
      ["cadeia alimentar", "Representação das relações de alimentação e transferência de matéria e energia.", "Capim, gafanhoto e sapo aparecem em sequência de alimentação."],
      ["mutação", "Alteração no material genético que pode ter diferentes efeitos.", "Uma mudança na sequência do DNA pode ou não alterar uma característica."],
    ],
    fisica: [
      ["força", "Interação capaz de alterar o movimento ou deformar um corpo.", "Empurrar um carrinho pode mudar sua velocidade ou direção."],
      ["newton", "Unidade de medida de força no Sistema Internacional.", "Um dinamômetro pode indicar a intensidade de uma força nessa unidade."],
      ["velocidade", "Grandeza que relaciona deslocamento e intervalo de tempo.", "Um veículo percorre 100 quilômetros em duas horas."],
      ["massa", "Grandeza relacionada à quantidade de matéria de um corpo.", "Uma balança compara essa propriedade de diferentes objetos."],
      ["condução térmica", "Transferência de energia térmica através de interações entre partículas vizinhas.", "Uma colher metálica aquece quando fica em uma bebida quente."],
      ["corrente elétrica", "Movimento ordenado de cargas elétricas através de um material.", "Cargas se movimentam quando há um circuito fechado e condições adequadas."],
      ["tensão elétrica", "Diferença de potencial elétrico entre dois pontos.", "Uma bateria mantém uma diferença de potencial entre seus terminais."],
      ["reflexão", "Retorno de uma onda ao encontrar uma superfície ou fronteira.", "A luz retorna ao encontrar um espelho polido."],
      ["energia cinética", "Energia associada ao movimento de um corpo.", "Uma bola em movimento possui energia relacionada à sua velocidade."],
      ["circuito fechado", "Caminho condutor completo que permite a circulação de corrente.", "Uma lâmpada acende quando a chave completa o caminho elétrico."],
    ],
    saude: [
      ["higiene das mãos", "Limpeza adequada das mãos para reduzir a transmissão de microrganismos.", "Lavar as mãos com água e sabão antes de preparar alimentos."],
      ["hidratação", "Reposição de líquidos necessária ao funcionamento do organismo.", "Beber água ao longo do dia e considerar calor e atividade física."],
      ["sono regular", "Rotina de descanso com horários consistentes e duração adequada à idade.", "Manter horários previsíveis para dormir e acordar durante a semana."],
      ["alimentação variada", "Consumo equilibrado de diferentes grupos de alimentos.", "Incluir variedade de alimentos nas refeições, conforme orientação adequada."],
      ["atividade física", "Movimento corporal que envolve gasto de energia e pode apoiar a saúde.", "Caminhar, dançar ou praticar um esporte de forma apropriada à pessoa."],
      ["proteção solar", "Medidas para reduzir a exposição excessiva à radiação ultravioleta.", "Procurar sombra e usar proteção adequada em períodos de sol intenso."],
      ["prevenção", "Ações tomadas para reduzir riscos ou evitar problemas de saúde.", "Manter vacinas recomendadas e buscar orientações de profissionais."],
      ["primeiros socorros", "Cuidados iniciais e seguros prestados até a chegada de ajuda especializada.", "Chamar um adulto responsável e os serviços de emergência diante de uma situação grave."],
      ["saúde mental", "Bem-estar emocional, psicológico e social de uma pessoa.", "Pedir apoio de alguém de confiança quando sentimentos difíceis persistem."],
      ["higiene respiratória", "Hábitos que ajudam a reduzir a dispersão de gotículas respiratórias.", "Cobrir tosse ou espirro com o cotovelo e higienizar as mãos depois."],
    ],
  };

  function criarBancoPerguntas(materia) {
    const conceitos = CONCEITOS[materia];
    const termos = conceitos.map(([termo]) => termo);
    const definicoes = conceitos.map(([, definicao]) => definicao);
    const formatos = [
      (termo, definicao) => [`Qual conceito corresponde à definição: "${definicao}"?`, termo, termos],
      (termo, definicao) => [`O que significa "${termo}"?`, definicao, definicoes],
      (termo, _definicao, exemplo) => [`Na situação "${exemplo}", qual conceito está presente?`, termo, termos],
      (termo, definicao) => [`Qual descrição corresponde a "${termo}"?`, definicao, definicoes],
      (termo, _definicao, exemplo) => [`Complete: "${exemplo}" se relaciona a _____.`, termo, termos],
      (termo, definicao) => [`Qual termo corresponde a esta pista: "${definicao}"?`, termo, termos],
      (termo, _definicao, exemplo) => [`Ao observar "${exemplo}", qual conceito ajuda a explicar a situação?`, termo, termos],
      (termo, definicao) => [`Escolha a explicação correta para "${termo}".`, definicao, definicoes],
      (termo, _definicao, exemplo) => [`Que conceito aparece neste exemplo: "${exemplo}"?`, termo, termos],
      (termo, definicao) => [`Uma pessoa descreve "${definicao}". Qual conceito ela estudou?`, termo, termos],
    ];
    return conceitos.flatMap(([termo, definicao, exemplo]) => formatos.map((formato) => {
      const [pergunta, resposta, opcoes] = formato(termo, definicao, exemplo);
      const alternativas = shuffle([resposta, ...pick(opcoes.filter((opcao) => opcao !== resposta), 4)]);
      return [pergunta, alternativas, alternativas.indexOf(resposta), definicao];
    }));
  }

  const BANCOS_PERGUNTAS = Object.fromEntries(Object.keys(CONCEITOS).map((materia) => [materia, criarBancoPerguntas(materia)]));

  function sortearPerguntas(materia, quantidade = 5) {
    const banco = BANCOS_PERGUNTAS[materia];
    const chave = `gameshub-perguntas-${slug}`;
    const chaveOrdens = `gameshub-opcoes-${slug}`;
    let usadas = [], ordensAnteriores = {};
    try { usadas = JSON.parse(localStorage.getItem(chave) || "[]"); } catch { usadas = []; }
    try { ordensAnteriores = JSON.parse(localStorage.getItem(chaveOrdens) || "{}"); } catch { ordensAnteriores = {}; }
    if (!Array.isArray(usadas)) usadas = [];
    if (!ordensAnteriores || typeof ordensAnteriores !== "object" || Array.isArray(ordensAnteriores)) ordensAnteriores = {};
    let disponiveis = banco.map((_, indice) => indice).filter((indice) => !usadas.includes(indice));
    if (disponiveis.length < quantidade) { usadas = []; disponiveis = banco.map((_, indice) => indice); }
    const escolhidas = pick(disponiveis, quantidade);
    const perguntas = escolhidas.map((indice) => {
      const [texto, opcoes, resposta, explicacao] = banco[indice];
      const respostaCorreta = opcoes[resposta];
      let alternativas = shuffle(opcoes);
      const ordemAnterior = ordensAnteriores[indice];
      const podeComparar = Array.isArray(ordemAnterior) && ordemAnterior.length === opcoes.length;
      let tentativas = 0;
      while (podeComparar && alternativas.some((opcao, posicao) => opcao === ordemAnterior[posicao]) && tentativas < 50) {
        alternativas = shuffle(opcoes); tentativas++;
      }
      if (podeComparar && alternativas.some((opcao, posicao) => opcao === ordemAnterior[posicao])) {
        const deslocamento = 1 + Math.floor(Math.random() * (ordemAnterior.length - 1));
        alternativas = ordemAnterior.slice(deslocamento).concat(ordemAnterior.slice(0, deslocamento));
      }
      ordensAnteriores[indice] = alternativas;
      return [texto, alternativas, alternativas.indexOf(respostaCorreta), explicacao];
    });
    try {
      localStorage.setItem(chave, JSON.stringify([...usadas, ...escolhidas]));
      localStorage.setItem(chaveOrdens, JSON.stringify(ordensAnteriores));
    } catch { /* armazenamento local indisponível */ }
    return perguntas;
  }

  function questionario(perguntas, aoFinal, titulo = "Perguntas") {
    let indice = 0, acertos = 0, respondida = false, correta = false;
    function desenhar() {
      const [pergunta, opcoes, resposta, explicacao] = perguntas[indice];
      render(hud([[titulo, `${indice + 1}/${perguntas.length}`], ["Banco", "100"], ["Acertos", acertos], ["Pontos", acertos * 20, "bom"]]) +
        `<h2 class="h4 text-center mb-3">${esc(pergunta)}</h2>
        <div class="grade mx-auto" style="max-width:620px">${opcoes.map((opcao, i) => `<button class="peca fs-6 text-start ${respondida && i === resposta ? "ok" : ""}" data-opcao="${i}" ${respondida ? "disabled" : ""}>${esc(opcao)}</button>`).join("")}</div>
        ${respondida ? `<div class="alerta ${correta ? "alerta-sucesso" : "alerta-aviso"} mt-3">${correta ? "Resposta certa! " : "Boa tentativa. "}${esc(explicacao)}</div>
          <div class="text-center"><button class="btn btn-game" id="proxima">${indice + 1 === perguntas.length ? "Continuar" : "Próxima pergunta"}</button></div>` : ""}`);
      on("[data-opcao]", "click", (e) => {
        if (respondida) return;
        respondida = true; correta = +e.currentTarget.dataset.opcao === resposta;
        if (correta) { acertos++; ada("coracoes", "Resposta certa!"); }
        else ada("confusa", "Confira a explicação e tente a próxima!");
        desenhar();
      });
      const proxima = document.getElementById("proxima");
      if (proxima) proxima.onclick = () => {
        if (indice + 1 === perguntas.length) return aoFinal(acertos * 20);
        indice++; respondida = false; correta = false; desenhar();
      };
    }
    desenhar();
  }

  function quizNovo() {
    questionario(sortearPerguntas(MATERIA_QUIZ[slug]), (pontos) => terminar(pontos), "Questão");
  }

  const JOGOS = { "alvo-numerico": alvoNumerico, "forca-das-palavras": forca, "robo-programador": robo, "linha-do-tempo": linhaDoTempo,
    "memoria-celular": memoria, "liga-capitais": capitais, "codigo-binario": binario };
  Object.keys(MATERIA_QUIZ).forEach((novoSlug) => { JOGOS[novoSlug] = quizNovo; });
  const iniciarJogo = JOGOS[slug] || (() => render("<p>Jogo indisponível.</p>"));
  iniciarJogo();
})();
