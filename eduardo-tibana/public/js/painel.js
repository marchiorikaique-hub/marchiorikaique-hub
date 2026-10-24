(function () {
  const app = document.getElementById('app');
  const api = async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    const j = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
    if (r.status === 401 && !url.startsWith('/api/auth')) { iniciar(); throw new Error('sessão'); }
    if (!r.ok) throw new Error(j?.erro || 'Erro inesperado');
    return j;
  };
  const data = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const STATUS = ['Novo', 'Em contato', 'Proposta', 'Cliente', 'Arquivado'];
  let aba = 'diagnosticos';
  let lista = [];

  async function iniciar() {
    const e = await api('/api/auth/estado');
    if (e.logado) return shell();
    e.configurado ? telaLogin() : telaPrimeiroAcesso();
  }

  // ---------- Acesso ----------
  function telaPrimeiroAcesso() {
    app.innerHTML = `
      <div class="login">
        <span class="rotulo">Primeiro acesso</span>
        <h2>Crie sua senha</h2>
        <p>Use o código de acesso que você recebeu e defina uma senha pessoal. Depois disso, o código deixa de valer.</p>
        <form class="cartao" id="f">
          <div class="campo"><label for="codigo">Código de acesso</label><input id="codigo" required autocomplete="one-time-code" style="text-transform:uppercase"></div>
          <div class="campo"><label for="senha">Nova senha (mín. 8 caracteres)</label><input id="senha" type="password" minlength="8" required autocomplete="new-password"></div>
          <div class="campo"><label for="senha2">Repita a senha</label><input id="senha2" type="password" minlength="8" required autocomplete="new-password"></div>
          <div class="erro" id="erro"></div>
          <button class="btn btn-primario" style="width:100%">Criar senha e entrar</button>
        </form>
      </div>`;
    document.getElementById('f').onsubmit = async (ev) => {
      ev.preventDefault();
      const erro = document.getElementById('erro');
      const senha = document.getElementById('senha').value;
      if (senha !== document.getElementById('senha2').value) { erro.textContent = 'As senhas não conferem.'; return; }
      try {
        await api('/api/auth/primeiro-acesso', { method: 'POST', body: JSON.stringify({ codigo: document.getElementById('codigo').value, senha }) });
        shell();
      } catch (e) { erro.textContent = e.message; }
    };
  }

  function telaLogin() {
    app.innerHTML = `
      <div class="login">
        <span class="rotulo">Área restrita</span>
        <h2>Entrar no painel</h2>
        <form class="cartao" id="f">
          <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" required autocomplete="current-password" autofocus></div>
          <div class="erro" id="erro"></div>
          <button class="btn btn-primario" style="width:100%">Entrar</button>
        </form>
        <p class="dica" style="margin-top:16px"><a href="/">← Voltar ao site</a></p>
      </div>`;
    document.getElementById('f').onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ senha: document.getElementById('senha').value }) });
        shell();
      } catch (e) { document.getElementById('erro').textContent = e.message; }
    };
  }

  // ---------- Estrutura ----------
  function shell() {
    aba = 'diagnosticos';
    app.innerHTML = `
      <header class="painel-topo"><div class="wrap">
        <a class="marca" href="/" target="_blank">Meu painel ↗</a>
        <nav class="abas">
          <button data-aba="diagnosticos">Diagnósticos</button>
          <button data-aba="site">Meu site</button>
          <button data-aba="conta">Conta</button>
        </nav>
      </div></header>
      <main class="painel"><div class="wrap" id="conteudo"></div></main>`;
    app.querySelectorAll('.abas button').forEach((b) => (b.onclick = () => { aba = b.dataset.aba; trocar(); }));
    trocar();
  }
  function trocar() {
    app.querySelectorAll('.abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === aba));
    ({ diagnosticos: abaDiagnosticos, site: abaSite, conta: abaConta })[aba]();
  }
  const conteudo = () => document.getElementById('conteudo');

  // ---------- Diagnósticos ----------
  async function abaDiagnosticos() {
    const [resumo, itens] = await Promise.all([api('/api/admin/resumo'), api('/api/admin/diagnosticos')]);
    lista = itens;
    const linkDiag = `${location.origin}/diagnostico`;
    conteudo().innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${resumo.total}</b><small>Diagnósticos recebidos</small></div>
        <div class="kpi"><b>${resumo.novos}</b><small>Aguardando contato</small></div>
        <div class="kpi"><b>${resumo.ultimos30}</b><small>Últimos 30 dias</small></div>
        <div class="kpi"><b>${resumo.media}</b><small>Nota média</small></div>
      </div>
      <div class="barra-acoes">
        <input id="busca" placeholder="Buscar por nome ou empresa">
        <select id="filtro" style="max-width:180px"><option value="">Todos os status</option>${STATUS.map((s) => `<option>${s}</option>`).join('')}</select>
        <span style="flex:1"></span>
        <button class="btn btn-claro" id="copiar">Copiar link do diagnóstico</button>
        <a class="btn btn-claro" href="/api/admin/exportar.csv">Exportar planilha</a>
      </div>
      <div id="tabela"></div>`;
    const desenhar = () => {
      const q = document.getElementById('busca').value.toLowerCase();
      const f = document.getElementById('filtro').value;
      const itensF = lista.filter((d) => (!f || d.status === f) && (`${d.nome} ${d.empresa}`.toLowerCase().includes(q)));
      document.getElementById('tabela').innerHTML = itensF.length ? `
        <table class="tabela">
          <thead><tr><th>Contato</th><th class="esconde-mob">Setor</th><th>Nota</th><th class="esconde-mob">Data</th><th>Status</th></tr></thead>
          <tbody>${itensF.map((d) => `
            <tr data-id="${d.id}">
              <td><strong>${esc(d.nome)}</strong><div class="sub">${esc(d.empresa)}${d.cargo ? ' · ' + esc(d.cargo) : ''}</div></td>
              <td class="esconde-mob">${esc(d.setor || '—')}</td>
              <td><strong>${d.score}</strong> <span class="sub">${esc(d.nivel)}</span></td>
              <td class="esconde-mob">${data(d.criado_em)}</td>
              <td><span class="selo ${esc(d.status).replace(/\s/g, '')}">${esc(d.status)}</span></td>
            </tr>`).join('')}</tbody>
        </table>` : `
        <div class="vazio">
          <p><strong>${lista.length ? 'Nenhum resultado para o filtro.' : 'Nenhum diagnóstico ainda.'}</strong></p>
          ${lista.length ? '' : `<p>Compartilhe o link abaixo com sua rede. Cada pessoa que responder aparece aqui com o relatório completo.</p><p><code>${esc(linkDiag)}</code></p>`}
        </div>`;
      document.querySelectorAll('tr[data-id]').forEach((tr) => (tr.onclick = () => detalhe(tr.dataset.id)));
    };
    document.getElementById('busca').oninput = desenhar;
    document.getElementById('filtro').onchange = desenhar;
    document.getElementById('copiar').onclick = (e) => { navigator.clipboard.writeText(linkDiag); e.target.textContent = 'Link copiado'; };
    desenhar();
  }

  async function detalhe(id) {
    const d = await api(`/api/admin/diagnosticos/${id}`);
    const wa = (d.whatsapp || '').replace(/\D/g, '');
    const waNum = wa && wa.length <= 11 ? '55' + wa : wa;
    const msg = encodeURIComponent(`Olá ${d.nome.split(' ')[0]}, tudo bem? Recebi o diagnóstico de maturidade em IA da ${d.empresa}. Podemos conversar sobre o resultado?`);
    conteudo().innerHTML = `
      <button class="btn btn-texto" id="voltar">← Todos os diagnósticos</button>
      <h2 style="margin-top:8px">${esc(d.nome)} <span style="color:var(--suave);font-size:.6em">· ${esc(d.empresa)}</span></h2>
      <div class="detalhe">
        <div class="cartao">${renderResultado(d.resultado)}
          <div class="bloco"><h3>Respostas</h3><div class="respostas">
            ${d.perguntas.map((p) => `<div><small>${esc(p.texto)}</small>${esc(p.opcoes[d.respostas[p.id]])}</div>`).join('')}
          </div></div>
        </div>
        <aside class="cartao">
          <h3>Contato</h3>
          <p class="respostas" style="margin-bottom:16px">
            ${d.cargo ? esc(d.cargo) + '<br>' : ''}
            <a href="mailto:${esc(d.email)}">${esc(d.email)}</a><br>
            ${d.whatsapp ? esc(d.whatsapp) + '<br>' : ''}
            ${d.setor ? esc(d.setor) : ''}${d.porte ? ' · ' + esc(d.porte) + ' funcionários' : ''}<br>
            <small>Recebido em ${data(d.criado_em)}</small>
          </p>
          ${waNum ? `<a class="btn btn-cobre" style="width:100%;margin-bottom:8px" target="_blank" rel="noopener" href="https://wa.me/${waNum}?text=${msg}">Chamar no WhatsApp</a>` : ''}
          <a class="btn btn-claro" style="width:100%;margin-bottom:20px" target="_blank" href="/resultado/${d.id}">Abrir relatório do cliente</a>
          <div class="campo"><label for="status">Status</label>
            <select id="status">${STATUS.map((s) => `<option ${s === d.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="campo"><label for="notas">Anotações</label><textarea id="notas" placeholder="Ex.: ligar na terça, interesse em governança de IA">${esc(d.notas)}</textarea></div>
          <button class="btn btn-primario" id="salvar" style="width:100%">Salvar</button>
          <div class="ok" id="ok"></div>
          <button class="btn btn-texto" id="excluir" style="margin-top:12px;color:#a33">Excluir diagnóstico</button>
        </aside>
      </div>`;
    window.scrollTo(0, 0);
    document.getElementById('voltar').onclick = abaDiagnosticos;
    document.getElementById('salvar').onclick = async () => {
      await api(`/api/admin/diagnosticos/${id}`, { method: 'PATCH', body: JSON.stringify({ status: document.getElementById('status').value, notas: document.getElementById('notas').value }) });
      document.getElementById('ok').textContent = 'Salvo.';
    };
    document.getElementById('excluir').onclick = async () => {
      if (!confirm('Excluir este diagnóstico? Essa ação não pode ser desfeita.')) return;
      await api(`/api/admin/diagnosticos/${id}`, { method: 'DELETE' });
      abaDiagnosticos();
    };
  }

  // ---------- Meu site ----------
  async function abaSite() {
    const p = await api('/api/admin/perfil');
    const campos = [
      ['nome', 'Nome'], ['titulo', 'Título (aparece acima do nome)'], ['empresa', 'Empresa (opcional, aparece no topo)'],
      ['whatsapp', 'WhatsApp (com DDD e código do país, ex.: 5511999999999)'], ['linkedin', 'Link do LinkedIn'], ['email', 'E-mail de contato'],
    ];
    conteudo().innerHTML = `
      <div class="cartao" style="max-width:760px">
        <h3>Foto</h3>
        <div class="foto-edit">
          ${p.foto ? `<img class="previa" id="previa" src="${esc(p.foto)}" alt="">` : '<div class="previa" id="previa"></div>'}
          <div>
            <input type="file" id="arquivo" accept="image/*" style="display:none">
            <button class="btn btn-claro" id="trocarFoto">${p.foto ? 'Trocar foto' : 'Enviar foto'}</button>
            <p class="dica" style="margin-top:8px">Use uma foto profissional, de preferência vertical e com fundo neutro.<br>O enquadramento e o ajuste de luz são feitos automaticamente.</p>
            <div class="ok" id="okFoto"></div>
          </div>
        </div>
        <form id="f">
          <div class="grade-2">${campos.map(([k, l]) => `<div class="campo"><label for="${k}">${l}</label><input id="${k}" value="${esc(p[k])}"></div>`).join('')}</div>
          <div class="campo"><label for="chamada">Frase de apresentação</label><input id="chamada" value="${esc(p.chamada)}"></div>
          <div class="campo"><label for="bio">Minha história (separe parágrafos com uma linha em branco)</label><textarea id="bio" style="min-height:220px">${esc(p.bio)}</textarea></div>
          <button class="btn btn-primario">Salvar alterações</button>
          <a class="btn btn-texto" href="/" target="_blank">Ver site ↗</a>
          <span class="ok" id="ok"></span>
        </form>
      </div>`;
    document.getElementById('f').onsubmit = async (ev) => {
      ev.preventDefault();
      const body = {};
      for (const k of ['nome', 'titulo', 'empresa', 'whatsapp', 'linkedin', 'email', 'chamada', 'bio']) body[k] = document.getElementById(k).value;
      await api('/api/admin/perfil', { method: 'PUT', body: JSON.stringify(body) });
      document.getElementById('ok').textContent = 'Salvo. O site já está atualizado.';
    };
    document.getElementById('trocarFoto').onclick = () => document.getElementById('arquivo').click();
    document.getElementById('arquivo').onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const ok = document.getElementById('okFoto');
      ok.textContent = 'Tratando a foto…';
      try {
        const imagem = await tratarFoto(file);
        const r = await api('/api/admin/foto', { method: 'POST', body: JSON.stringify({ imagem }) });
        const prev = document.getElementById('previa');
        prev.outerHTML = `<img class="previa" id="previa" src="${r.foto}" alt="">`;
        ok.textContent = 'Foto atualizada no site.';
      } catch (e) { ok.textContent = e.message; }
    };
  }

  // Recorta em 4:5 (priorizando a parte de cima, onde fica o rosto), redimensiona e dá um leve ajuste de luz e contraste.
  function tratarFoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const W = 900, H = 1125, alvo = W / H;
        let sw = img.width, sh = img.height, sx = 0, sy = 0;
        if (sw / sh > alvo) { sw = sh * alvo; sx = (img.width - sw) / 2; } else { sh = sw / alvo; sy = (img.height - sh) * 0.25; }
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.filter = 'brightness(1.03) contrast(1.06) saturate(1.04)';
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
        resolve(c.toDataURL('image/jpeg', 0.88));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- Conta ----------
  function abaConta() {
    conteudo().innerHTML = `
      <div class="cartao" style="max-width:480px">
        <h3>Trocar senha</h3>
        <form id="f">
          <div class="campo"><label for="atual">Senha atual</label><input id="atual" type="password" required autocomplete="current-password"></div>
          <div class="campo"><label for="nova">Nova senha (mín. 8 caracteres)</label><input id="nova" type="password" minlength="8" required autocomplete="new-password"></div>
          <div class="erro" id="erro"></div>
          <button class="btn btn-primario">Salvar nova senha</button>
        </form>
        <div class="bloco"><button class="btn btn-claro" id="sair">Sair do painel</button></div>
      </div>`;
    document.getElementById('f').onsubmit = async (ev) => {
      ev.preventDefault();
      const erro = document.getElementById('erro');
      try {
        await api('/api/auth/senha', { method: 'POST', body: JSON.stringify({ atual: document.getElementById('atual').value, nova: document.getElementById('nova').value }) });
        erro.className = 'ok'; erro.textContent = 'Senha alterada.';
        ev.target.reset();
      } catch (e) { erro.className = 'erro'; erro.textContent = e.message; }
    };
    document.getElementById('sair').onclick = async () => { await api('/api/auth/sair', { method: 'POST' }); iniciar(); };
  }

  iniciar();
})();
