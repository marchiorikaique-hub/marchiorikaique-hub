(async function () {
  const app = document.getElementById('app');
  const perfil = await fetch('/api/perfil').then((r) => r.json());
  document.getElementById('marca').textContent = perfil.nome;

  const m = location.pathname.match(/^\/resultado\/([\w-]+)/);
  if (m) return mostrarResultado(m[1]);

  const { perguntas } = await fetch('/api/perguntas').then((r) => r.json());
  const contato = {};
  const respostas = {};
  let passo = 0; // 0 = dados de contato, 1..N = perguntas

  function telaContato() {
    app.innerHTML = `
      <span class="rotulo">Diagnóstico gratuito</span>
      <h1>Maturidade em IA<br>e governança.</h1>
      <p class="intro">12 perguntas, cerca de 3 minutos. No final você recebe uma nota de 0 a 100, a leitura por área e um plano de 90 dias.</p>
      <form class="cartao" id="form">
        <div class="grade-2">
          <div class="campo"><label for="nome">Seu nome *</label><input id="nome" required autocomplete="name"></div>
          <div class="campo"><label for="email">E-mail *</label><input id="email" type="email" required autocomplete="email"></div>
          <div class="campo"><label for="empresa">Empresa *</label><input id="empresa" required autocomplete="organization"></div>
          <div class="campo"><label for="cargo">Cargo</label><input id="cargo" autocomplete="organization-title"></div>
          <div class="campo"><label for="whatsapp">WhatsApp</label><input id="whatsapp" type="tel" autocomplete="tel" placeholder="(11) 99999-9999"></div>
          <div class="campo"><label for="setor">Setor</label>
            <select id="setor"><option value="">Selecione</option>
              ${['Telecomunicações', 'Engenharia e construção', 'Energia e utilities', 'Indústria', 'Serviços', 'Varejo', 'Saúde', 'Setor público', 'Outro'].map((s) => `<option>${s}</option>`).join('')}
            </select></div>
          <div class="campo"><label for="porte">Nº de funcionários</label>
            <select id="porte"><option value="">Selecione</option>
              ${['Até 50', '51 a 200', '201 a 1.000', 'Mais de 1.000'].map((s) => `<option>${s}</option>`).join('')}
            </select></div>
        </div>
        <p class="dica">Seus dados ficam visíveis apenas para ${esc(perfil.nome)} e não são compartilhados.</p>
        <button class="btn btn-primario seta" type="submit" style="width:100%;margin-top:16px">Começar o diagnóstico</button>
      </form>`;
    for (const k of ['nome', 'email', 'empresa', 'cargo', 'whatsapp', 'setor', 'porte']) {
      if (contato[k]) document.getElementById(k).value = contato[k];
    }
    document.getElementById('form').onsubmit = (e) => {
      e.preventDefault();
      for (const k of ['nome', 'email', 'empresa', 'cargo', 'whatsapp', 'setor', 'porte']) contato[k] = document.getElementById(k).value.trim();
      passo = 1;
      render();
    };
  }

  function telaPergunta() {
    const p = perguntas[passo - 1];
    const total = perguntas.length;
    app.innerHTML = `
      <div class="cartao pergunta">
        <div class="passo-info">Pergunta ${passo} de ${total}</div>
        <div class="progresso"><span style="width:${((passo - 1) / total) * 100}%"></span></div>
        <h3>${esc(p.texto)}</h3>
        <div class="opcoes">
          ${p.opcoes.map((o, i) => `<button type="button" class="opcao ${respostas[p.id] === i ? 'sel' : ''}" data-v="${i}" data-letra="${'abcd'[i]}">${esc(o)}</button>`).join('')}
        </div>
        <div class="nav-passos">
          <button class="btn btn-texto" id="voltar">← Voltar</button>
          <span class="erro" id="erro"></span>
        </div>
      </div>`;
    app.querySelectorAll('.opcao').forEach((b) => {
      b.onclick = () => {
        respostas[p.id] = Number(b.dataset.v);
        if (passo < total) { passo++; render(); } else enviar();
      };
    });
    document.getElementById('voltar').onclick = () => { passo--; render(); };
  }

  async function enviar() {
    app.innerHTML = '<div class="cartao"><p>Calculando seu diagnóstico…</p></div>';
    const r = await fetch('/api/diagnosticos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contato, respostas }),
    });
    const j = await r.json();
    if (!r.ok) {
      passo = 0;
      render();
      alert(j.erro || 'Não foi possível enviar. Tente novamente.');
      return;
    }
    history.replaceState(null, '', `/resultado/${j.id}`);
    mostrarResultado(j.id);
  }

  function render() {
    window.scrollTo(0, 0);
    passo === 0 ? telaContato() : telaPergunta();
  }

  async function mostrarResultado(id) {
    const r = await fetch(`/api/diagnosticos/${id}/publico`);
    if (!r.ok) { app.innerHTML = '<div class="cartao"><p>Diagnóstico não encontrado.</p><a class="btn btn-claro" href="/diagnostico">Fazer um novo</a></div>'; return; }
    const d = await r.json();
    const primeiroNome = (d.nome || '').split(' ')[0];
    const msg = encodeURIComponent(`Olá ${perfil.nome.split(' ')[0]}, fiz o diagnóstico de maturidade em IA (${d.empresa}, nota ${d.resultado.score}) e gostaria de conversar.`);
    const cta = perfil.whatsapp
      ? `<a class="btn btn-primario seta" href="https://wa.me/${perfil.whatsapp}?text=${msg}" target="_blank" rel="noopener">Conversar com ${esc(perfil.nome.split(' ')[0])}</a>`
      : '';
    app.innerHTML = `
      <span class="rotulo">Resultado · ${esc(d.empresa)}</span>
      <h1>${primeiroNome ? esc(primeiroNome) + ', aqui' : 'Aqui'} está<br>o seu diagnóstico.</h1>
      <div class="cartao" style="margin-top:32px">
        ${renderResultado(d.resultado)}
        <div class="bloco">
          <h3>Próximo passo</h3>
          <p>Uma conversa de 30 minutos para aprofundar os pontos acima e definir por onde começar.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            ${cta}
            <button class="btn btn-claro" onclick="navigator.clipboard.writeText(location.href);this.textContent='Link copiado'">Copiar link do relatório</button>
          </div>
        </div>
      </div>`;
  }

  render();
})();
