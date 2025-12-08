const meses = [
  "Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre"
];

let alumnoSeleccionado = { id: 1, nombre: "Alumno Demo" };
document.getElementById("nombreAlumno").textContent = "Alumno: " + alumnoSeleccionado.nombre;

function cargarPagos(id){
  return JSON.parse(localStorage.getItem("pagos_" + id)) || [];
}

function guardarPagos(id, pagos){
  localStorage.setItem("pagos_" + id, JSON.stringify(pagos));
}

function actualizarUI(){
  const pagos = cargarPagos(alumnoSeleccionado.id);
  const cont = document.getElementById("listaMeses");
  cont.innerHTML = "";

  meses.forEach(m=>{
    const d = document.createElement("div");
    d.textContent = m + (pagos.includes(m) ? " ✓" : "");
    cont.appendChild(d);
  });
}

function abrirModalPagos(){
  document.getElementById("modalAlumnoNombre").textContent =
    "Alumno: " + alumnoSeleccionado.nombre;

  const cont = document.getElementById("contenedorMeses");
  cont.innerHTML = "";

  const pagos = cargarPagos(alumnoSeleccionado.id);

  meses.forEach(m=>{
    const div = document.createElement("div");
    div.classList.add("mes-checkbox");
    div.innerHTML = `
      <input type="checkbox" class="chkMes" value="${m}" ${pagos.includes(m)?"checked":""}>
      <label>${m}</label>
    `;
    cont.appendChild(div);
  });

  document.getElementById("modalPagos").style.display = "flex";
}

document.getElementById("btnEditarPagos").onclick = abrirModalPagos;

document.getElementById("cerrarModal").onclick = ()=>{
  document.getElementById("modalPagos").style.display="none";
};

document.getElementById("guardarCambios").onclick = ()=>{
  const checks = document.querySelectorAll(".chkMes");
  const nuevos = [];
  checks.forEach(c=>{ if(c.checked) nuevos.push(c.value); });

  guardarPagos(alumnoSeleccionado.id, nuevos);
  actualizarUI();
  document.getElementById("modalPagos").style.display="none";
};

actualizarUI();
