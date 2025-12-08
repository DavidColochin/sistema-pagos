import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// TU CONFIG DE FIREBASE (pega la tuya si cambiaste)
const firebaseConfig = {
  apiKey: "AIzaSyBIUDbk2CJwwtjdzTz0tMiz54_bTYli_U8",
  authDomain: "sistema-pagos-6a8e0.firebaseapp.com",
  projectId: "sistema-pagos-6a8e0",
  storageBucket: "sistema-pagos-6a8e0.firebasestorage.app",
  messagingSenderId: "425179430628",
  appId: "1:425179430628:web:aeb57476ae923a5229b6f1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const adminPassword = '1234';
let alumnoActual = null;
let mesSeleccionado = null;
let cacheAlumnos = [];

// Meses visibles (Enero y Diciembre removidos por pedido)
const MESES = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

/* -------------------------
   UTIL - obtener elemento
   ------------------------- */
const $ = (sel) => document.querySelector(sel);

/* -------------------------
   Inicialización de eventos
   ------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Enlaces Inicio (en cada header)
  const btnsInicio = document.querySelectorAll('#btnInicio, #btnInicioHeader, #btnInicioConsulta');
  btnsInicio.forEach(b => b && b.addEventListener('click', ()=> window.location.href = 'index.html'));

  // Botones admin (si existen en la página)
  const btnIngresar = $('#btnIngresar');
  if(btnIngresar) btnIngresar.addEventListener('click', login);

  const btnVolver = $('#btnVolver');
  if(btnVolver) btnVolver.addEventListener('click', ()=> window.location.href = 'index.html');

  const btnRegistrar = $('#btnRegistrar');
  if(btnRegistrar) btnRegistrar.addEventListener('click', registrarAlumno);

  const cerrarModalBtn = $('#cerrarModalBtn');
  if(cerrarModalBtn) cerrarModalBtn.addEventListener('click', cerrarModal);

  const guardarPagoBtn = $('#guardarPagoBtn');
  if(guardarPagoBtn) guardarPagoBtn.addEventListener('click', guardarPago);

  // filtros y tabla (si existen)
  const gradoSel = $('#filtroGrado');
  const maestroSel = $('#filtroMaestro');
  if(gradoSel || maestroSel) {
    cargarFiltros().then(()=> cargarTabla());
    if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
    if(maestroSel) maestroSel.addEventListener('change', cargarTabla);
  } else {
    // si no hay filtros, intenta cargar alumnos para admin
    mostrarAlumnos();
  }
});

/* ====== ADMIN ====== */
window.login = async function(){
  const passField = document.getElementById('adminPass');
  if(!passField) return;
  const pass = passField.value;
  if(pass === adminPassword){
    $('#adminPanel').style.display = 'block';
    $('#tituloAdmin').style.display = 'none';
    const loginBox = document.querySelector('.login-container');
    if(loginBox) loginBox.style.display = 'none';
    await mostrarAlumnos();
    await cargarTabla();
    await cargarFiltros();
  } else {
    alert('Código incorrecto');
  }
}

window.registrarAlumno = async function(){
  const nombre = (document.getElementById('nombre')||{}).value?.trim();
  const familiar = (document.getElementById('familiar')||{}).value?.trim();
  const grado = (document.getElementById('grado')||{}).value?.trim();
  const maestro = (document.getElementById('maestro')||{}).value?.trim();
  if(nombre && familiar && grado && maestro){
    await addDoc(collection(db, 'alumnos'), { nombre, familiar, grado, maestro, pagos: {} });
    (document.getElementById('nombre')||{}).value='';
    (document.getElementById('familiar')||{}).value='';
    (document.getElementById('grado')||{}).value='';
    (document.getElementById('maestro')||{}).value='';
    await mostrarAlumnos();
    await cargarTabla();
    await cargarFiltros();
  } else {
    alert('Complete todos los campos');
  }
}

async function mostrarAlumnos(){
  const lista = document.getElementById('listaAlumnos');
  const contador = document.getElementById('contador');
  if(!lista) return;
  lista.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];
  querySnapshot.forEach(docSnap => { cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() }); });
  cacheAlumnos.forEach((alumno) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1;text-align:left;">
        <strong>${alumno.nombre}</strong><br><small>${alumno.grado} - ${alumno.familiar}</small>
      </div>
      <div>
        <button class="btn-small" data-pago="${alumno.id}">+ Pago</button>
        <button class="btn-small" data-editar="${alumno.id}">Editar</button>
        <button class="btn-small btn-danger" data-eliminar="${alumno.id}">Eliminar</button>
      </div>`;
    lista.appendChild(li);
  });
  if(contador) contador.textContent = `Total alumnos: ${cacheAlumnos.length}`;

  // Delegación de eventos (evita problemas con botones dinámicos)
  lista.querySelectorAll('[data-pago]').forEach(b => b.addEventListener('click', (e)=> abrirModal(e.target.dataset.pago)));
  lista.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', (e)=> editarAlumno(e.target.dataset.editar)));
  lista.querySelectorAll('[data-eliminar]').forEach(b => b.addEventListener('click', (e)=> eliminarAlumno(e.target.dataset.eliminar)));
}

window.eliminarAlumno = async function(id){
  if(!confirm('¿Eliminar este alumno?')) return;
  await deleteDoc(doc(db, 'alumnos', id));
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();
}

window.editarAlumno = async function(id){
  const a = cacheAlumnos.find(x=>x.id===id) || await fetchAlumno(id);
  if(!a) return alert('Alumno no encontrado');
  const nuevoNombre = prompt('Nombre', a.nombre) || a.nombre;
  const nuevoFamiliar = prompt('Familiar', a.familiar) || a.familiar;
  const nuevoGrado = prompt('Grado', a.grado) || a.grado;
  const nuevoMaestro = prompt('Maestro/a', a.maestro) || a.maestro;
  await updateDoc(doc(db,'alumnos',id), { nombre: nuevoNombre, familiar: nuevoFamiliar, grado: nuevoGrado, maestro: nuevoMaestro });
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();
}

window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));
  if(!alumno) return alert('Alumno no encontrado');
  const seleccionado = document.getElementById('alumnoSeleccionado');
  if(seleccionado) seleccionado.textContent = alumno.nombre;
  mostrarPagos(alumno);
  generarBotonesMes(alumno);
  const modal = document.getElementById('modalPago');
  if(modal) modal.style.display = 'flex';
}

async function fetchAlumno(id){
  const qs = await getDocs(collection(db, 'alumnos'));
  let found = null;
  qs.forEach(d => { if(d.id === id) found = { id: d.id, ...d.data() }; });
  return found;
}

window.cerrarModal = function(){
  const modal = document.getElementById('modalPago');
  if(modal) modal.style.display = 'none';
}

/* Seleccionar mes (resalta visualmente) */
window.seleccionarMes = function(mes){
  mesSeleccionado = mes;
  // resaltar botones
  document.querySelectorAll('#mesesContainer button').forEach(btn=>{
    btn.classList.toggle('selected', btn.textContent.replace(' (Pago)','') === mes);
  });
}

/* Guardar pago (crea o actualiza) */
window.guardarPago = async function(){
  const montoField = document.getElementById('montoPago');
  const montoVal = montoField ? montoField.value.trim() : '';
  if(!mesSeleccionado || !montoVal){
    alert('Seleccione mes y monto');
    return;
  }
  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  alumno.pagos = alumno.pagos || {};
  alumno.pagos[mesSeleccionado] = montoVal;
  await updateDoc(alumnoRef, { pagos: alumno.pagos });
  await mostrarAlumnos();
  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  mostrarPagos(actualizado);
  generarBotonesMes(actualizado);
  if(montoField) montoField.value = '';
  mesSeleccionado = null;
  await cargarTabla();
}

/* Permite editar/eliminar pagos ya guardados */
window.editarPago = async function(mes){
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  if(!alumno) return;
  const actual = (alumno.pagos && alumno.pagos[mes]) || '';
  const nuevo = prompt(`Editar monto para ${mes} (deje vacío para eliminar)`, actual);
  if(nuevo === null) return; // canceló
  const alumnoRef = doc(db,'alumnos',alumnoActual);
  alumno.pagos = alumno.pagos || {};
  if(nuevo.trim() === ''){
    delete alumno.pagos[mes];
  } else {
    alumno.pagos[mes] = nuevo.trim();
  }
  await updateDoc(alumnoRef, { pagos: alumno.pagos });
  await mostrarAlumnos();
  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  mostrarPagos(actualizado);
  generateAndApplyButtonState(updatedAlumno=actualizado); // helper below
  await cargarTabla();
}

/* Mostrar pagos dentro del modal */
function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  if(!cont) return;
  cont.innerHTML = '';
  for(const mes in (alumno.pagos||{})){
    if(!MESES.includes(mes)) continue; // ignorar Ene/Dic por pedido
    const div = document.createElement('div');
    const monto = alumno.pagos[mes];
    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Editar';
    btnEdit.style.marginLeft = '8px';
    btnEdit.addEventListener('click', ()=> editarPago(mes));
    div.textContent = `${mes}: L.${monto}`;
    div.appendChild(btnEdit);
    cont.appendChild(div);
  }
}

/* Genera los botones de meses en el modal; permite editar si ya está pagado */
function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  if(!cont) return;
  cont.innerHTML = '';
  MESES.forEach(mes => {
    const btn = document.createElement('button');
    btn.textContent = mes;
    btn.classList.add('mes-btn');
    if(alumno.pagos && alumno.pagos[mes]){
      btn.classList.add('disabled');
      btn.textContent = mes + ' (Pago)';
      btn.addEventListener('click', ()=> editarPago(mes)); // permite editar tocando el botón
    } else {
      btn.addEventListener('click', ()=> {
        seleccionarMes(mes);
      });
    }
    cont.appendChild(btn);
  });
}

/* Helper solicitado por editarPago para reaplicar estado de botones (llamado internamente) */
function generateAndApplyButtonState(updatedAlumno){
  // simple relaunch of button UI
  mostrarPagos(updatedAlumno);
  const cont = document.getElementById('mesesContainer');
  if(cont) {
    cont.querySelectorAll('button').forEach(b => b.remove()); // limpiar
    MESES.forEach(mes => {
      const btn = document.createElement('button');
      btn.textContent = mes;
      if(updatedAlumno.pagos && updatedAlumno.pagos[mes]){
        btn.classList.add('disabled');
        btn.textContent = mes + ' (Pago)';
        btn.addEventListener('click', ()=> editarPago(mes));
      } else {
        btn.addEventListener('click', ()=> seleccionarMes(mes));
      }
      cont.appendChild(btn);
    });
  }
}

/* -------------------------
   CONSULTA / FILTROS / TABLA
   ------------------------- */
async function cargarTodos(){
  const qs = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];
  qs.forEach(docSnap => { cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() }); });
}

window.cargarFiltros = async function(){
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  if(!gradoSel || !maestroSel) return;
  await cargarTodos();
  const grados = Array.from(new Set(cacheAlumnos.map(a => (a.grado||'').trim()))).filter(g=>g);
  const maestros = Array.from(new Set(cacheAlumnos.map(a => (a.maestro||'').trim()))).filter(m=>m);
  gradoSel.innerHTML = '<option value="Todos">Todos</option>' + grados.map(g=>`<option>${g}</option>`).join('');
  maestroSel.innerHTML = '<option value="Todos">Todos</option>' + maestros.map(m=>`<option>${m}</option>`).join('');
}

window.cargarTabla = async function(){
  const tbody = document.querySelector('#tablaPagos tbody');
  if(!tbody) return;
  await cargarTodos();
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  const gradoFiltro = gradoSel ? gradoSel.value : 'Todos';
  const maestroFiltro = maestroSel ? maestroSel.value : 'Todos';
  const alumnosFiltrados = cacheAlumnos.filter(a =>
    (gradoFiltro==='Todos' || a.grado===gradoFiltro) &&
    (maestroFiltro==='Todos' || a.maestro===maestroFiltro)
  );
  tbody.innerHTML = '';
  alumnosFiltrados.forEach(alumno => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${alumno.nombre}</td><td>${alumno.familiar}</td><td>${alumno.grado}</td><td>${alumno.maestro}</td>`;
    MESES.forEach(mes => {
      if(alumno.pagos && alumno.pagos[mes]){
        tr.innerHTML += `<td><i class='fa-solid fa-check' aria-hidden="true"></i> L.${alumno.pagos[mes]}</td>`;
      } else {
        tr.innerHTML += `<td><i class='fa-solid fa-xmark' aria-hidden="true"></i></td>`;
      }
    });
    tbody.appendChild(tr);
  });
}
