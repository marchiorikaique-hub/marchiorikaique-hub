// Renderização do relatório de diagnóstico (usada no site e no painel).
window.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const NIVEIS = ['Inicial', 'Em desenvolvimento', 'Estruturado', 'Avançado'];
// Fases do plano em semanas (13 semanas = 90 dias); o índice casa com a ordem do plano.
const FASES = [[1, 4], [5, 9], [10, 13]];

window.renderResultado = function (r) {
  const fracas = new Set(r.prioridades.map((p) => p.dimensao));
  const trilho = '<i></i>'.repeat(13);
  return `
    <div class="placar">
      <div class="nota" aria-label="Nota ${r.score} de 100">${r.score}<small>/100</small></div>
      <div>
        <div class="nivel">${esc(r.nivel)}</div>
        <p>${esc(r.resumo)}</p>
      </div>
      <div class="escala-niveis" style="--p:${Math.min(99, Math.max(1, r.score))}" aria-hidden="true">
        ${NIVEIS.map((n) => `<span class="${n === r.nivel ? 'on' : ''}">${n}</span>`).join('')}
        <i class="marca-nota"></i>
      </div>
    </div>

    <h3>Leitura por área</h3>
    <div class="leitura">
      ${r.dimensoes.map((d, i) => `
        <div class="linha ${fracas.has(d.nome) ? 'fraca' : ''}">
          <span>${esc(d.nome)}</span>
          <span class="trilho"><span style="width:${d.score}%;animation-delay:${i * 90 + 200}ms"></span></span>
          <b>${d.score}</b>
        </div>`).join('')}
    </div>
    <p class="status">Em laranja, as duas áreas que puxam a nota para baixo e viram prioridade.</p>

    <div class="bloco">
      <h3>Prioridades recomendadas</h3>
      ${r.prioridades.map((p) => `
        <div class="prioridade">
          <strong>${esc(p.dimensao)}</strong>
          <ol>${p.acoes.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>
        </div>`).join('')}
    </div>

    <div class="bloco">
      <h3>Plano de 90 dias</h3>
      <div class="gantt plano">
        <div class="g-escala"><span class="g-rot">Período</span><div class="g-semanas" aria-hidden="true">${Array.from({ length: 13 }, (_, i) => `<span>${i + 1}</span>`).join('')}</div></div>
        ${r.plano.map((p, i) => {
          const [de, ate] = FASES[i] || FASES[FASES.length - 1];
          return `
          <div class="g-linha">
            <span class="g-rot">${esc(p.periodo)}</span>
            <div class="g-corpo">
              <span class="g-trilho">${trilho}<span class="g-barra ${i === 0 ? 'critica' : i === 2 ? 'base' : ''}" style="--de:${de};--ate:${ate};--i:${i}"></span></span>
              <p>${esc(p.foco)}</p>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
};
