
// === PARCHE MINIMO: Reset de filtros robusto ===
function _resetSelectToTodos(selectEl) {
  if (!selectEl) return;
  let foundTodos = Array.from(selectEl.options).find(opt => opt.value === 'Todos')
                || Array.from(selectEl.options).find(opt => (opt.text || '').trim().toLowerCase() === 'todos');
  if (foundTodos) {
    selectEl.value = foundTodos.value;
  } else if (selectEl.options.length > 0) {
    selectEl.selectedIndex = 0;
  }
}

function aplicarResetFiltros() {
  const gradoSel   = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  _resetSelectToTodos(gradoSel);
  _resetSelectToTodos(maestroSel);
  if (typeof window.cargarTabla === 'function') {
    window.cargarTabla();
  }
}

// Exponer para onclick="resetFiltros()" en HTML
window.resetFiltros = aplicarResetFiltros;

// Hook alternativo por ID, por si onclick no ejecuta
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnResetFiltros');
  if (btn && !btn._resetHooked) {
    btn.addEventListener('click', aplicarResetFiltros);
    btn._resetHooked = true;
  }
});
// === FIN PARCHE ===
