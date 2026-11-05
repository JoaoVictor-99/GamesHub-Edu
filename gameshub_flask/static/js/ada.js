// Ada: guia com IA. Muda de expressão conforme os acontecimentos dos jogos e do chat.
(function () {
  const raiz = document.getElementById("ada");
  if (!raiz) return;
  const $ = (id) => document.getElementById(id);
  const base = raiz.dataset.img, nome = raiz.dataset.nome;
  const IMG = { feliz: "feliz.png", coracoes: "coracoes.gif", confusa: "confusa.gif", decepcao: "decepcao.gif", choro: "choro.gif", raiva: "raiva.gif" };
  const src = (e) => base + (IMG[e] || IMG.feliz);
  Object.values(IMG).forEach((f) => { new Image().src = base + f; }); // pré-carrega
  const avatar = $("ada-avatar"), rosto = $("ada-rosto"), balao = $("ada-balao"), painel = $("ada-painel"), msgs = $("ada-msgs");
  let voltar, esconder, atual = "feliz";

  function expressar(emocao, texto, duracao = 3500) {
    atual = emocao;
    rosto.src = src(emocao);
    $("ada-rosto-chat").src = src(emocao);
    avatar.classList.remove("pulo"); void avatar.offsetWidth; avatar.classList.add("pulo");
    clearTimeout(voltar);
    if (emocao !== "feliz") voltar = setTimeout(() => expressar("feliz"), duracao);
    if (texto && painel.hidden) {
      balao.textContent = texto; balao.hidden = false;
      clearTimeout(esconder); esconder = setTimeout(() => (balao.hidden = true), duracao + 1500);
    }
  }
  expressar("feliz");

  // Eventos vindos dos jogos
  window.addEventListener("ada", (e) => expressar(e.detail.emocao, e.detail.texto));

  // Guia por página
  const oi = nome ? `Oi, ${nome}! ` : "Oi! Eu sou a Ada. ";
  const GUIA = {
    index: oi + "Quer começar? Clique em \"Jogar agora\" ou fale comigo!",
    jogos: "Escolha um jogo! Use o filtro para achar a matéria que você quer treinar.",
    jogo: "Leia o \"Como jogar\" e boa sorte! Vou torcer por você 💜",
    ranking: "Aqui estão os melhores! Seu melhor resultado em cada jogo vira pontos.",
    perfil: "Esse é seu perfil: histórico, anotações e conquistas.",
    login: "Entre na conta para salvar seus pontos!",
    cadastro: "Crie sua conta e escolha um avatar bem legal!",
  };
  const pag = raiz.dataset.pagina;
  if (GUIA[pag] && !sessionStorage.getItem("ada-guia-" + pag + location.pathname)) {
    sessionStorage.setItem("ada-guia-" + pag + location.pathname, "1");
    setTimeout(() => { if (atual === "feliz") expressar(pag === "index" ? "coracoes" : "feliz", GUIA[pag], 4500); }, 800);
  }

  // Chat (histórico guardado nesta aba)
  let historico = [];
  try { historico = JSON.parse(sessionStorage.getItem("ada-chat") || "[]"); } catch { historico = []; }
  const salvar = () => sessionStorage.setItem("ada-chat", JSON.stringify(historico.slice(-30)));

  function bolha(m) {
    const d = document.createElement("div");
    d.className = "ada-msg " + (m.role === "user" ? "user" : "bot") + (m.erro ? " erro" : "");
    if (m.role === "user") d.textContent = m.content;
    else { const img = document.createElement("img"); img.src = src(m.emocao); img.alt = "Ada"; const s = document.createElement("span"); s.innerHTML = String(m.content).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); d.append(img, s); }
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }
  function desenharChat() {
    msgs.innerHTML = "";
    if (!historico.length) bolha({ role: "assistant", emocao: "coracoes", content: oi + "Posso te guiar pelo site, explicar os jogos ou tirar dúvidas de estudo. O que você quer saber?" });
    historico.forEach(bolha);
    $("ada-sugestoes").hidden = historico.length > 0;
  }

  function abrir(sim) {
    painel.hidden = !sim; balao.hidden = true;
    if (sim) { desenharChat(); $("ada-input").focus(); }
  }
  avatar.onclick = () => abrir(painel.hidden);
  balao.onclick = () => abrir(true);
  $("ada-fechar").onclick = () => abrir(false);

  let enviando = false;
  async function enviar(texto) {
    texto = texto.trim(); if (!texto || enviando) return;
    enviando = true; $("ada-sugestoes").hidden = true;
    historico.push({ role: "user", content: texto }); bolha(historico[historico.length - 1]); salvar();
    expressar("confusa", null, 60000);
    const pensando = bolha({ role: "assistant", emocao: "confusa", content: "Pensando" }); pensando.classList.add("ada-digitando");
    pensando.querySelector("span").textContent = "Pensando";
    try {
      const r = await fetch("/api/ada", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagina: location.pathname, mensagens: historico.filter((m) => !m.erro).map(({ role, content }) => ({ role, content })) }) });
      const d = await r.json().catch(() => ({}));
      pensando.remove();
      const m = r.ok ? { role: "assistant", emocao: d.emocao, content: d.texto } : { role: "assistant", emocao: d.emocao || "choro", content: d.erro || "Algo deu errado.", erro: true };
      historico.push(m); bolha(m); salvar(); expressar(m.emocao || "feliz");
    } catch {
      pensando.remove(); const m = { role: "assistant", emocao: "choro", content: "Sem conexão... tente de novo.", erro: true };
      historico.push(m); bolha(m); expressar("choro");
    }
    enviando = false; $("ada-input").focus();
  }
  $("ada-form").onsubmit = (e) => { e.preventDefault(); const i = $("ada-input"); enviar(i.value); i.value = ""; };
  $("ada-sugestoes").querySelectorAll("button").forEach((b) => (b.onclick = () => enviar(b.textContent)));
})();
