(async function () {
  const app = document.getElementById('app');
  const perfil = await fetch('/api/perfil').then((r) => r.json()).catch(() => ({ nome: 'Eduardo Tibana' }));
  const primeiro = (perfil.nome || '').split(' ')[0];
  document.getElementById('marca').textContent = perfil.nome;

  const m = location.pathname.match(/^\/resultado\/([\w-]+)/);
  if (m) return mostrarResultado(m[1]);

  const { dimensoes, perguntas } = await fetch('/api/perguntas').then((r) => r.json());
  const nomeDim = Object.fromEntries(dimensoes.map((d) => [d.id, d.nome]));
  const total = perguntas.length;
  const CAMPOS = ['nome', 'email', 'empresa', 'cargo', 'whatsapp', 'setor', 'porte'];

  // Progresso guardado na aba: recarregar a página não perde as respostas.
  let estado = { passo: 0, respostas: {}, contato: {} };
  try { estado = { ...estado, ...JSON.parse(sessionStorage.getItem('diag') || '{}') }; } catch {}
  const salvar = () => { try { sessionStorage.setItem('diag', JSON.stringify(estado)); } catch {} };
  const { respostas, contato } = estado;

  const seta = '<svg class="seta" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  function telaIntro() {
    app.innerHTML = `
      <div class="intro-diag">
        <div>
          <h1>Maturidade em IA e governança</h1>
          <p class="lead">12 perguntas, cerca de 3 minutos. No final você recebe uma nota de 0 a 100, a leitura por área e um plano de 90 dias com as prioridades da sua empresa.</p>
        </div>
        <div class="intro-areas">
          ${dimensoes.map((d) => `<div><span>${esc(d.nome)}</span><span class="status">${perguntas.filter((p) => p.dim === d.id).length} perguntas</span></div>`).join('')}
        </div>
        <div>
          <button class="btn btn-cobre" id="comecar">${Object.keys(respostas).length ? 'Continuar de onde parei' : 'Começar o diagnóstico'} ${seta}</button>
          <p class="status" style="margin-top:14px">Sem cadastro para começar. Os seus dados só são pedidos no final, para enviar o relatório.</p>
        </div>
      </div>`;
    document.getElementById('comecar').onclick = () => {
      const feitas = perguntas.findIndex((p) => respostas[p.id] === undefined);
      ir(feitas === -1 ? total + 1 : feitas + 1);
    };
  }

  function telaPergunta() {
    const n = estado.passo;
    const p = perguntas[n - 1];
    app.innerHTML = `
      <div class="pergunta">
        <div class="passos" aria-hidden="true">${perguntas.map((q, i) => `<span class="${i === n - 1 ? 'agora' : respostas[q.id] !== undefined ? 'feito' : ''}"></span>`).join('')}</div>
        <div class="passo-info status"><span>Pergunta <b>${n}</b> de ${total}</span><span>${Object.keys(respostas).length} respondidas</span></div>
        <span class="area status">${esc(nomeDim[p.dim])}</span>
        <h2 id="enunciado">${esc(p.texto)}</h2>
        <div class="opcoes" role="radiogroup" aria-labelledby="enunciado">
          ${p.opcoes.map((o, i) => `
            <button type="button" role="radio" aria-checked="${respostas[p.id] === i}" class="opcao ${respostas[p.id] === i ? 'sel' : ''}" data-v="${i}">
              <span class="k">${i + 1}</span>
              <span>${esc(o)}</span>
              <span class="nivel-op" aria-hidden="true">${[0, 1, 2, 3].map((j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span>
            </button>`).join('')}
        </div>
        <div class="nav-passos">
          <button class="btn btn-texto" id="voltar">← Voltar</button>
          <span class="status">Atalho: teclas 1 a 4</span>
        </div>
      </div>`;
    let escolhida = false;
    const escolher = (v) => {
      if (escolhida) return;
      escolhida = true;
      respostas[p.id] = v;
      app.querySelectorAll('.opcao').forEach((b) => b.classList.toggle('sel', Number(b.dataset.v) === v));
      salvar();
      // Um instante para o laranja da escolha ser visto antes de avançar.
      setTimeout(() => ir(n + 1), 220);
    };
    app.querySelectorAll('.opcao').forEach((b) => (b.onclick = () => escolher(Number(b.dataset.v))));
    document.getElementById('voltar').onclick = () => ir(n - 1);
    teclado = (e) => {
      if (e.target.closest('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key)) escolher(Number(e.key) - 1);
    };
    (app.querySelector('.opcao.sel') || app.querySelector('.opcao')).focus({ preventScroll: true });
  }

  function telaContato(erro) {
    app.innerHTML = `
      <div class="passos" aria-hidden="true">${perguntas.map(() => '<span class="feito"></span>').join('')}</div>
      <div class="passo-info status"><span><b>${total}</b> de ${total} respondidas</span><span>falta só isto</span></div>
      <h1 style="font-size:clamp(2.2rem,6vw,3.6rem)">Para onde vai o seu relatório?</h1>
      <p class="lead">O resultado aparece na hora nesta tela, com um link para guardar e compartilhar com a liderança.</p>
      <form class="cartao" id="form" novalidate>
        ${erro ? `<div class="aviso" role="alert">${esc(erro)}</div>` : ''}
        <div class="grade-2">
          <div class="campo"><label for="nome">Seu nome</label><input id="nome" required autocomplete="name"></div>
          <div class="campo"><label for="email">E-mail</label><input id="email" type="email" required autocomplete="email" inputmode="email"></div>
          <div class="campo"><label for="empresa">Empresa</label><input id="empresa" required autocomplete="organization"></div>
          <div class="campo"><label for="cargo">Cargo <span class="opc">(opcional)</span></label><input id="cargo" autocomplete="organization-title"></div>
          <div class="campo"><label for="whatsapp">WhatsApp <span class="opc">(opcional)</span></label><input id="whatsapp" type="tel" autocomplete="tel" inputmode="tel" placeholder="(11) 99999-9999"></div>
          <div class="campo"><label for="setor">Setor <span class="opc">(opcional)</span></label>
            <select id="setor"><option value="">Selecione</option>
              ${['Telecomunicações', 'Engenharia e construção', 'Energia e utilities', 'Indústria', 'Serviços', 'Varejo', 'Saúde', 'Setor público', 'Outro'].map((s) => `<option>${s}</option>`).join('')}
            </select></div>
          <div class="campo"><label for="porte">Nº de funcionários <span class="opc">(opcional)</span></label>
            <select id="porte"><option value="">Selecione</option>
              ${['Até 50', '51 a 200', '201 a 1.000', 'Mais de 1.000'].map((s) => `<option>${s}</option>`).join('')}
            </select></div>
        </div>
        <p class="dica">Seus dados ficam visíveis apenas para ${esc(perfil.nome)} e não são compartilhados.</p>
        <div class="nav-passos">
          <button class="btn btn-texto" type="button" id="voltar">← Revisar respostas</button>
          <button class="btn btn-cobre" type="submit" id="enviar">Ver meu resultado ${seta}</button>
        </div>
      </form>`;
    for (const k of CAMPOS) if (contato[k]) document.getElementById(k).value = contato[k];
    document.getElementById('voltar').onclick = () => ir(total);
    document.getElementById('form').onsubmit = (e) => {
      e.preventDefault();
      for (const k of CAMPOS) contato[k] = document.getElementById(k).value.trim();
      salvar();
      const faltando = [];
      if (!contato.nome) faltando.push('nome');
      if (!/^\S+@\S+\.\S+$/.test(contato.email)) faltando.push('um e-mail válido');
      if (!contato.empresa) faltando.push('empresa');
      if (faltando.length) return telaContato(`Preencha ${faltando.length > 1 ? faltando.slice(0, -1).join(', ') + ' e ' + faltando.at(-1) : faltando[0]} para ver o resultado.`);
      enviar();
    };
  }

  async function enviar() {
    const botao = document.getElementById('enviar');
    botao.disabled = true;
    botao.textContent = 'Calculando…';
    try {
      const r = await fetch('/api/diagnosticos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contato, respostas }),
      });
      const j = await r.json();
      if (!r.ok) return telaContato(j.erro || 'Não foi possível enviar. Tente novamente.');
      try { sessionStorage.removeItem('diag'); } catch {}
      history.replaceState(null, '', `/resultado/${j.id}`);
      mostrarResultado(j.id);
    } catch {
      telaContato('Sem conexão com o servidor. Confira a internet e tente de novo; suas respostas estão guardadas.');
    }
  }

  let teclado = null;
  document.addEventListener('keydown', (e) => teclado && teclado(e));

  function ir(passo) {
    estado.passo = Math.max(0, Math.min(total + 1, passo));
    salvar();
    teclado = null;
    window.scrollTo(0, 0);
    if (estado.passo === 0) telaIntro();
    else if (estado.passo <= total) telaPergunta();
    else telaContato();
  }

  async function mostrarResultado(id) {
    const r = await fetch(`/api/diagnosticos/${encodeURIComponent(id)}/publico`).catch(() => null);
    if (!r || !r.ok) {
      app.innerHTML = '<h1 style="font-size:clamp(2rem,6vw,3rem)">Diagnóstico não encontrado.</h1><p>O link pode estar incompleto.</p><a class="btn btn-cobre" href="/diagnostico">Fazer um novo diagnóstico</a>';
      return;
    }
    const d = await r.json();
    document.title = `Diagnóstico · ${d.empresa}`;
    const primeiroNome = (d.nome || '').split(' ')[0];
    const data = new Date(d.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const texto = `Olá ${primeiro}, fiz o diagnóstico de maturidade em IA (${d.empresa}, nota ${d.resultado.score}) e gostaria de conversar. ${location.href}`;
    const ctas = [
      perfil.whatsapp && `<a class="btn btn-cobre" href="https://wa.me/${perfil.whatsapp}?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">Conversar com ${esc(primeiro)} no WhatsApp</a>`,
      perfil.email && `<a class="btn ${perfil.whatsapp ? 'btn-claro' : 'btn-cobre'}" href="mailto:${esc(perfil.email)}?subject=${encodeURIComponent('Diagnóstico de maturidade em IA · ' + d.empresa)}&body=${encodeURIComponent(texto)}">Escrever para ${esc(primeiro)}</a>`,
      !perfil.whatsapp && !perfil.email && perfil.linkedin && `<a class="btn btn-cobre" href="${esc(perfil.linkedin)}" target="_blank" rel="noopener">Falar com ${esc(primeiro)} no LinkedIn</a>`,
    ].filter(Boolean).join('');
    app.innerHTML = `
      <div class="rel-cabeca">
        <h1>${esc(d.empresa)}</h1>
        <span class="status">Diagnóstico de maturidade em IA · ${esc(data)}${primeiroNome ? ' · ' + esc(primeiroNome) : ''}</span>
      </div>
      ${renderResultado(d.resultado)}
      <div class="bloco">
        <h3>Próximo passo</h3>
        <p>Uma conversa de 30 minutos com ${esc(primeiro)} para aprofundar estes pontos e definir por onde começar.</p>
        <div class="rel-acoes">
          ${ctas}
          <button class="btn btn-claro" id="copiar">Copiar link do relatório</button>
          <button class="btn btn-texto" id="imprimir">Salvar em PDF</button>
        </div>
      </div>`;
    document.getElementById('copiar').onclick = async (e) => {
      try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copiado'; }
      catch { e.target.textContent = location.href; }
    };
    document.getElementById('imprimir').onclick = () => window.print();
  }

  ir(estado.passo);
})();
