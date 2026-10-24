// Renderização do relatório de diagnóstico (usada no site e no painel).
window.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

window.renderResultado = function (r) {
  return `
    <div class="placar">
      <div class="anel" style="--p:${r.score}"><span>${r.score}</span></div>
      <div>
        <div class="nivel">Nível ${esc(r.nivel)}</div>
        <p style="margin:6px 0 0;font-size:1.05rem;color:var(--tinta-2)">${esc(r.resumo)}</p>
      </div>
    </div>
    <h3>Leitura por área</h3>
    <div class="barras">
      ${r.dimensoes.map((d) => `
        <div>
          <div class="barra-topo"><span>${esc(d.nome)}</span><span>${d.score}</span></div>
          <div class="barra"><span style="width:${d.score}%"></span></div>
        </div>`).join('')}
    </div>
    <div class="bloco">
      <h3>Prioridades recomendadas</h3>
      ${r.prioridades.map((p) => `
        <strong style="color:var(--tinta)">${esc(p.dimensao)}</strong>
        <ul>${p.acoes.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`).join('')}
    </div>
    <div class="bloco">
      <h3>Plano de 90 dias</h3>
      <div class="plano">
        ${r.plano.map((p) => `<div><strong>${esc(p.periodo)}</strong><span>${esc(p.foco)}</span></div>`).join('')}
      </div>
    </div>`;
};
