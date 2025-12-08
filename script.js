
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// CONFIG FIREBASE
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

// Meses activos: Febrero a Noviembre
const MESES_ACTIVOS = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

// ====== ADMIN ======
window.login = function(){
  const pass = document.getElementById('adminPass')?.value;
  if(pass === adminPassword){
    document.getElementById('adminPanel')?.setAttribute('style','display:block');
    document.getElementById('tituloAdmin')?.setAttribute('style','display:none');
    const loginCont = document.querySelector('.login-container');
    if(loginCont) loginCont.style.display = 'none';
    mostrarAlumnos();
  } else {
    alert('Código incorrecto');
  }
}

window.registrarAlumno = async function(){
  const nombre = document.getElementById('nombre')?.value.trim();
  const familiar = document.getElementById('familiar')?.value.trim();
  const grado = document.getElementById('grado')?.value.trim();
  const maestro = document.getElementById('maestro')?.value.trim();
  if(nombre && familiar && grado && maestro){
    await addDoc(collection(db, 'alumnos'), { nombre, familiar, grado, maestro, pagos: {} });
    document.getElementById('nombre').value='';
    document.getElementById('familiar').value='';
    document.getElementById('grado').value='';
    document.getElementById('maestro').value='';
    mostrarAlumnos();
    cargarTabla();
    cargarFiltros();
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
    li.innerHTML = `${alumno.nombre} - ${alumno.grado}
      <span>
        <button type="button" onclick="abrirModal('${alumno.id}')">+ Pago</button>
        <button type="button" onclick="eliminarAlumno('${alumno.id}')" style="background:#dc3545">Eliminar</button>
      </span>`;
    lista.appendChild(li);
  });
  if(contador) contador.textContent = `Total alumnos: ${cacheAlumnos.length}`;
}

window.eliminarAlumno = async function(id){
  if(confirm('¿Eliminar este alumno?')){
    await deleteDoc(doc(db, 'alumnos', id));
    mostrarAlumnos();
    cargarTabla();
    cargarFiltros();
  }
}

window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));
  const nameEl = document.getElementById('alumnoSeleccionado');
  if(nameEl) nameEl.textContent = alumno.nombre || '';
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

window.seleccionarMes = function(mes){
  mesSeleccionado = mes;
  marcarSeleccionMes(mes);
}

window.guardarPago = async function(){
  const montoEl = document.getElementById('montoPago');
  const montoVal = montoEl?.value;
  if(mesSeleccionado && montoVal !== undefined && montoVal !== ''){
    const monto = montoVal;
    const alumnoRef = doc(db, 'alumnos', alumnoActual);
    const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
    alumno.pagos = alumno.pagos || {};
    alumno.pagos[mesSeleccionado] = monto; // permite editar si ya existía
    await updateDoc(alumnoRef, { pagos: alumno.pagos });
    await mostrarAlumnos();
    const actualizado = cacheAlumnos.find(a => a.id === alumnoActual);
    mostrarPagos(actualizado);
    generarBotonesMes(actualizado);
    if(montoEl) montoEl.value='';
    mesSeleccionado=null;
    cargarTabla();
  } else {
    alert('Seleccione mes y monto');
  }
}

function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  if(!cont || !alumno) return;
  cont.innerHTML = '';
  const pagos = alumno.pagos || {};
  // Muestra solo meses activos (por orden)
  MESES_ACTIVOS.forEach(mes => {
    if (pagos[mes]){
      const div = document.createElement('div');
      div.textContent = `${mes}: L.${pagos[mes]}`;
      cont.appendChild(div);
    }
  });
}

function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  if(!cont || !alumno) return;
  cont.innerHTML = '';

  mesSeleccionado = null; // limpia cualquier selección previa

  MESES_ACTIVOS.forEach(mes => {
    const btn = document.createElement('button');
    btn.textContent = mes;
    if(alumno.pagos && alumno.pagos[mes]){
      btn.classList.add('hasPago');
      btn.textContent = `${mes} (Pago)`;
      btn.onclick = () => {
        window.seleccionarMes(mes);
        const montoInput = document.getElementById('montoPago');
        if(montoInput) montoInput.value = alumno.pagos[mes];
      };
    } else {
      btn.onclick = () => window.seleccionarMes(mes);
    }
    cont.appendChild(btn);
  });
}

function marcarSeleccionMes(mes){
  const cont = document.getElementById('mesesContainer');
  if(!cont) return;
  cont.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
  const btns = Array.from(cont.querySelectorAll('button')).filter(b => b.textContent.startsWith(mes));
  if(btns.length > 0){ btns[0].classList.add('selected'); }
}

// ====== CONSULTA PÚBLICA + FILTROS ======
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
  const grados = Array.from(new Set(cacheAlumnos.map(a => (a.grado || '').trim()))).filter(g=>g);
  const maestros = Array.from(new Set(cacheAlumnos.map(a => (a.maestro || '').trim()))).filter(m=>m);
  gradoSel.innerHTML = ''; maestroSel.innerHTML = '';
  const optTodosGrado = document.createElement('option'); optTodosGrado.value = 'Todos'; optTodosGrado.textContent = 'Todos'; gradoSel.appendChild(optTodosGrado);
  const optTodosMaestro = document.createElement('option'); optTodosMaestro.value = 'Todos'; optTodosMaestro.textContent = 'Todos'; maestroSel.appendChild(optTodosMaestro);
  grados.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.textContent = g; gradoSel.appendChild(opt); });
  maestros.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; maestroSel.appendChild(opt); });
  gradoSel.value = 'Todos'; maestroSel.value = 'Todos';
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
    tr.innerHTML = `
      <td>${alumno.nombre || ''}</td>
      <td>${alumno.familiar || ''}</td>
      <td>${alumno.grado || ''}</td>
      <td>${alumno.maestro || ''}</td>
    `;

    // Mostrar solo Feb–Nov
    MESES_ACTIVOS.forEach(mes => {
      const td = document.createElement('td');
      if(alumno.pagos && alumno.pagos[mes]){ td.textContent = `L.${alumno.pagos[mes]}`; } else { td.textContent = ''; }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// Reset filtros (robusto)
function _resetSelectToTodos(selectEl){
  if(!selectEl) return;
  let foundTodos = Array.from(selectEl.options).find(opt => opt.value === 'Todos')
    || Array.from(selectEl.options).find(opt => (opt.text || '').trim().toLowerCase() === 'todos');
  if(foundTodos){ selectEl.value = foundTodos.value; }
  else if(selectEl.options.length>0){ selectEl.selectedIndex = 0; }
}
function aplicarResetFiltros(){
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  _resetSelectToTodos(gradoSel); _resetSelectToTodos(maestroSel);
  cargarTabla();
}
window.resetFiltros = aplicarResetFiltros;

window.addEventListener('DOMContentLoaded', async () => {
  await cargarFiltros();
  await cargarTabla();
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
  if(maestroSel) maestroSel.addEventListener('change', cargarTabla);
  const btn = document.getElementById('btnResetFiltros');
  if(btn && !btn._resetHooked){ btn.addEventListener('click', aplicarResetFiltros); btn._resetHooked = true; }
});
