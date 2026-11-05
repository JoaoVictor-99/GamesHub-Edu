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
  const hud = (itens) => `<div class="hud">${itens.map(([l, v, t]) => `<div class="${t || ""}"><small>${l}</small><strong>${v}</strong></div>`).join("")}</div>`;
  const render = (html) => { palco.innerHTML = html; };
  const ada = (emocao, texto) => window.dispatchEvent(new CustomEvent("ada", { detail: { emocao, texto } }));
  const on = (sel, ev, fn) => palco.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));

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
        if (d.novas_conquistas && d.novas_conquistas.length)
          extra = `<div class="alerta alerta-sucesso mt-3">Conquista desbloqueada: ${d.novas_conquistas.map((c) => c.icone + " " + esc(c.nome)).join(", ")}</div>`;
      } catch { msg = "Sem conexão — pontuação não salva."; }
    }
    render(`<div class="fim anim-pop"><p class="texto-suave mb-0">Sua pontuação</p><div class="alvo">${pontos}</div>
      <p>${pontos >= 90 ? "Incrível! 🏆" : pontos >= 60 ? "Mandou bem! 🎉" : "Continue praticando! 💪"}</p>
      <p class="texto-suave">${msg} (${duracao}s)</p>${extra}
      <div class="d-flex gap-2 justify-content-center mt-3"><button class="btn btn-game" id="denovo">Jogar de novo</button>
      <a class="btn btn-outline-neon" href="/jogos">Outros jogos</a></div></div>`);
    document.getElementById("denovo").onclick = () => location.reload();
  }

  // ---------- Alvo Numérico ----------
  function alvoNumerico() {
    let tempo = 60, pontos = 0, acertos = 0, nums = [], sel = [], alvo = 0;
    function novo() {
      nums = Array.from({ length: 12 }, () => 1 + Math.floor(Math.random() * 9));
      const k = 2 + Math.floor(Math.random() * 2);
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
    ];
    const norm = (c) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const rodadas = pick(PALAVRAS, 5); let r = 0, chutes = [], pontos = 0, estado = "jogando", ultimoChute = 0;
    function desenhar() {
      const [palavra, dica] = rodadas[r]; const letras = palavra.split("");
      const erros = chutes.filter((c) => !letras.some((l) => norm(l) === c)).length;
      if (estado === "jogando") {
        if (letras.every((l) => chutes.includes(norm(l)))) { estado = "ganhou"; pontos += Math.max(8, 20 - erros * 2); ada("coracoes", "Descobriu a palavra!"); }
        else if (erros >= 6) { estado = "perdeu"; ada("choro", "Ah não, acabaram as vidas..."); }
        else if (chutes.length && chutes.length !== ultimoChute) { const k = chutes[chutes.length - 1]; const ok = letras.some((l) => norm(l) === k); ada(ok ? "coracoes" : erros >= 4 ? "raiva" : "decepcao", ok ? "Boa letra!" : erros >= 4 ? "Cuidado, poucas vidas!" : "Essa letra não tem..."); }
        ultimoChute = chutes.length;
      }
      render(hud([["Palavra", `${r + 1}/5`], ["Vidas", "❤".repeat(Math.max(0, 6 - erros)) || "0", erros >= 4 ? "ruim" : ""], ["Pontos", pontos, "bom"]]) +
        `<div class="cartao text-center mb-3" style="background:var(--acento)"><small class="text-primary-neon fw-bold">DICA</small><div class="fs-5">${dica}</div></div>
        <div class="d-flex flex-wrap justify-content-center gap-2 my-4">${letras.map((l) => { const v = chutes.includes(norm(l)) || estado === "perdeu"; return `<span class="letra ${v ? "vis" : ""}">${v ? l : ""}</span>`; }).join("")}</div>` +
        (estado === "jogando"
          ? `<div class="grade mx-auto" style="grid-template-columns:repeat(9,1fr);max-width:560px">${LETRAS.map((k) => { const u = chutes.includes(k); const b = u && letras.some((l) => norm(l) === k); return `<button class="peca p-1 fs-6 ${b ? "ok" : ""}" data-k="${k}" ${u ? "disabled" : ""}>${k}</button>`; }).join("")}</div>`
          : `<div class="text-center anim-pop"><p class="fs-4 fw-bold ${estado === "ganhou" ? "text-sucesso" : "text-perigo"}">${estado === "ganhou" ? "Acertou!" : "A palavra era " + palavra}</p><button class="btn btn-game" id="prox">${r + 1 >= 5 ? "Ver resultado" : "Próxima palavra"}</button></div>`));
      on(".peca", "click", (e) => { chutes.push(e.currentTarget.dataset.k); desenhar(); });
      const p = document.getElementById("prox");
      if (p) p.onclick = () => { if (r + 1 >= 5) return terminar(pontos); r++; chutes = []; estado = "jogando"; desenhar(); };
    }
    document.addEventListener("keydown", (e) => { const k = e.key.toUpperCase(); if (estado === "jogando" && LETRAS.includes(k) && !chutes.includes(k)) { chutes.push(k); desenhar(); } });
    desenhar();
  }

  // ---------- Robô Programador ----------
  function robo() {
    const FASES = [["S...", "##.#", "...G"], ["S.#..", "..#..", "#....", "..#.G"], ["S#...", ".#.#.", ".#.#.", "...#G"]];
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
      render(hud([["Fase", `${fase + 1}/3`], ["Batidas", batidas, batidas ? "ruim" : ""], ["Mínimo", otimo(f) + " cmds"], ["Pontos", pontos, "bom"]]) +
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
          pontos += Math.max(10, 33 - batidas * 5 - Math.max(0, prog.length - otimo(f)) * 2);
          await new Promise((r) => setTimeout(r, 600));
          if (fase === 2) return terminar(Math.min(100, pontos + 1));
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
      ["História do Brasil", [["Chegada dos portugueses ao Brasil", 1500, "1500"], ["Independência do Brasil", 1822, "1822"], ["Abolição da escravatura (Lei Áurea)", 1888, "1888"], ["Proclamação da República", 1889, "1889"], ["Inauguração de Brasília", 1960, "1960"]]],
      ["Mundo antigo ao moderno", [["Construção das pirâmides de Gizé", -2560, "c. 2560 a.C."], ["Fundação de Roma", -753, "753 a.C."], ["Queda do Império Romano do Ocidente", 476, "476"], ["Colombo chega à América", 1492, "1492"], ["Revolução Francesa", 1789, "1789"]]],
      ["Séculos XVIII a XX", [["Início da Revolução Industrial", 1760, "c. 1760"], ["Começa a Primeira Guerra Mundial", 1914, "1914"], ["Fim da Segunda Guerra Mundial", 1945, "1945"], ["Ser humano pisa na Lua", 1969, "1969"], ["Queda do Muro de Berlim", 1989, "1989"]]],
    ];
    let r = 0, ordem = shuffle(CONJ[0][1]), conferido = false, pontos = 0;
    function desenhar() {
      const certa = CONJ[r][1].slice().sort((a, b) => a[1] - b[1]);
      render(hud([["Rodada", `${r + 1}/3`], ["Tema", CONJ[r][0]], ["Pontos", pontos, "bom"]]) +
        `<p class="texto-suave">Do mais antigo (topo) ao mais recente:</p>` +
        ordem.map((ev, i) => { const ok = conferido && ev === certa[i];
          return `<div class="evento"><div class="cartao ${conferido ? (ok ? "border-success" : "border-danger") : ""}">${ev[0]}${conferido ? ` <strong class="${ok ? "text-sucesso" : "text-perigo"}">(${ev[2]})</strong>` : ""}</div>
          ${conferido ? "" : `<button class="btn btn-outline-neon btn-sm" data-up="${i}" ${i === 0 ? "disabled" : ""}>▲</button><button class="btn btn-outline-neon btn-sm" data-dn="${i}" ${i === ordem.length - 1 ? "disabled" : ""}>▼</button>`}</div>`; }).join("") +
        `<div class="text-center mt-3"><button class="btn btn-game" id="acao">${conferido ? (r === 2 ? "Ver resultado" : "Próxima rodada") : "Conferir"}</button></div>`);
      on("[data-up]", "click", (e) => { const i = +e.currentTarget.dataset.up; [ordem[i - 1], ordem[i]] = [ordem[i], ordem[i - 1]]; desenhar(); });
      on("[data-dn]", "click", (e) => { const i = +e.currentTarget.dataset.dn; [ordem[i + 1], ordem[i]] = [ordem[i], ordem[i + 1]]; desenhar(); });
      document.getElementById("acao").onclick = () => {
        if (!conferido) { conferido = true; const nc = ordem.filter((ev, i) => ev === certa[i]).length; pontos += Math.round(nc * 6.67); ada(nc === 5 ? "coracoes" : nc >= 3 ? "confusa" : "decepcao", nc === 5 ? "Ordem perfeita!" : `${nc} de 5 no lugar certo.`); return desenhar(); }
        if (r === 2) return terminar(pontos);
        r++; ordem = shuffle(CONJ[r][1]); conferido = false; desenhar();
      };
    }
    desenhar();
  }

  // ---------- Memória ----------
  function memoria() {
    const PARES = [["Fotossíntese", "Planta produz alimento com luz"], ["Célula", "Menor unidade da vida"], ["Gravidade", "Força que puxa para baixo"],
      ["Evaporação", "Água vira vapor"], ["Coração", "Bombeia o sangue"], ["Oxigênio", "Gás que respiramos"], ["Sol", "Estrela do sistema solar"], ["Raiz", "Absorve água do solo"]];
    const cartas = shuffle(pick(PARES, 6).flatMap(([a, b], i) => [{ t: a, p: i }, { t: b, p: i }]));
    let abertas = [], achadas = new Set(), jogadas = 0, travado = false;
    function desenhar() {
      render(hud([["Jogadas", jogadas], ["Pares", `${achadas.size}/6`, "bom"]]) +
        `<div class="grade" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${cartas.map((c, i) => { const v = abertas.includes(i) || achadas.has(c.p);
          return `<button class="peca carta ${achadas.has(c.p) ? "ok" : v ? "sel" : "virada"}" data-i="${i}" ${v ? "disabled" : ""}>${v ? c.t : "❓"}</button>`; }).join("")}</div>`);
      on(".carta", "click", (e) => {
        if (travado) return; abertas.push(+e.currentTarget.dataset.i);
        if (abertas.length === 2) {
          jogadas++; const [a, b] = abertas;
          if (cartas[a].p === cartas[b].p) { ada("coracoes", "Achou um par!"); achadas.add(cartas[a].p); abertas = []; if (achadas.size === 6) { desenhar(); return setTimeout(() => terminar(100 - Math.max(0, jogadas - 6) * 5), 500); } }
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
      ["Egito", "Cairo"], ["Itália", "Roma"], ["Portugal", "Lisboa"], ["México", "Cidade do México"], ["Chile", "Santiago"], ["Alemanha", "Berlim"], ["Peru", "Lima"], ["Espanha", "Madri"], ["China", "Pequim"]];
    const rodadas = [0, 1, 2].map(() => []); shuffle(TODOS).forEach((p, i) => rodadas[i % 3].push(p));
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
          if (r === 2) return terminar(100 - errosTotal * 7);
          r++; feitos = new Set(); caps = shuffle(rodadas[r]);
        }
        desenhar();
      });
    }
    desenhar();
  }

  // ---------- Código Binário ----------
  function binario() {
    const VAL = [128, 64, 32, 16, 8, 4, 2, 1];
    const alvos = [5, 12, 1 + Math.floor(Math.random() * 30), 32 + Math.floor(Math.random() * 64), 100 + Math.floor(Math.random() * 100), 200 + Math.floor(Math.random() * 56)];
    let r = 0, bits = Array(8).fill(false), erros = 0, pontos = 0;
    function desenhar() {
      const soma = VAL.reduce((s, v, i) => s + (bits[i] ? v : 0), 0);
      render(hud([["Número", `${r + 1}/6`], ["Erros", erros, erros ? "ruim" : ""], ["Pontos", pontos, "bom"]]) +
        `<div class="text-center"><small class="texto-suave">FORME O NÚMERO</small><div class="alvo">${alvos[r]}</div><p>Valor atual: <strong>${soma}</strong> · binário <code>${bits.map((b) => (b ? 1 : 0)).join("")}</code></p></div>
        <div class="grade mx-auto" style="grid-template-columns:repeat(8,1fr);max-width:560px">${VAL.map((v, i) => `<div class="text-center"><button class="peca bit ${bits[i] ? "on" : ""}" data-i="${i}">💡</button><small class="texto-suave">${v}</small></div>`).join("")}</div>
        <div class="text-center mt-3"><button class="btn btn-game" id="conf">Confirmar</button></div>`);
      on(".bit", "click", (e) => { const i = +e.currentTarget.dataset.i; bits[i] = !bits[i]; desenhar(); });
      document.getElementById("conf").onclick = () => {
        if (soma === alvos[r]) { ada("coracoes", "Número formado!"); pontos += Math.max(8, 17 - erros * 3); erros = 0; if (r === 5) return terminar(Math.min(100, pontos - 2)); r++; bits = Array(8).fill(false); }
        else { erros++; ada(erros >= 3 ? "raiva" : "decepcao", erros >= 3 ? "Grr, confere os valores!" : "Ainda não é esse número."); }
        desenhar();
      };
    }
    desenhar();
  }

  const JOGOS = { "alvo-numerico": alvoNumerico, "forca-das-palavras": forca, "robo-programador": robo, "linha-do-tempo": linhaDoTempo,
    "memoria-celular": memoria, "liga-capitais": capitais, "codigo-binario": binario };
  (JOGOS[slug] || (() => render("<p>Jogo indisponível.</p>")))();
})();
