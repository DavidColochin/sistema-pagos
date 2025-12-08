
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// CONFIG DE FIREBASE (usa tu propio proyecto si lo cambias)
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

// ====== ADMIN ======
window.login = function(){
  const pass = document.getElementById('adminPass')?.value;
  if(pass === adminPassword){
    const panel = document.getElementById('adminPanel');
    if(panel) panel.style.display = 'block';
    const titulo = document.getElementById('tituloAdmin');
    if(titulo) titulo.style.display = 'none';
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
        <button onclick="abrirModal('${alumno.id}')">Pago</button>
        <button onclick="eliminarAlumno('${alumno.id}')">Eliminar</button>
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
  document.getElementById('alumnoSeleccionado')?.setAttribute('data-name', alumno?.nombre || '');
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

window.seleccionarMes = function(mes){ mesSeleccionado = mes; }

window.guardarPago = async function(){
  if(mesSeleccionado && document.getElementById('montoPago')?.value){
    const monto = document.getElementById('montoPago').value;
    const alumnoRef = doc(db, 'alumnos', alumnoActual);
    const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
    alumno.pagos = alumno.pagos || {};
    alumno.pagos[mesSeleccionado] = monto;
    await updateDoc(alumnoRef, { pagos: alumno.pagos });
    await mostrarAlumnos();
    const actualizado = cacheAlumnos.find(a => a.id === alumnoActual);
    mostrarPagos(actualizado);
    generarBotonesMes(actualizado);
    document.getElementById('montoPago').value='';
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
  for(const mes of Object.keys(pagos)){
    const div = document.createElement('div');
    div.textContent = `${mes}: L.${pagos[mes]}`;
    cont.appendChild(div);
  }
}

function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  if(!cont || !alumno) return;
  cont.innerHTML = '';
  for(const mes of ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']){
    const btn = document.createElement('button');
    btn.textContent = mes;
    if(alumno.pagos && alumno.pagos[mes]){
      btn.classList.add('disabled');
      btn.textContent = mes + ' (Pago)';
    } else {
      btn.onclick = () => window.seleccionarMes(mes);
    }
    cont.appendChild(btn);
  }
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

  gradoSel.innerHTML = '';
  maestroSel.innerHTML = '';

  const optTodosGrado = document.createElement('option');
  optTodosGrado.value = 'Todos';
  optTodosGrado.textContent = 'Todos';
  gradoSel.appendChild(optTodosGrado);

  const optTodosMaestro = document.createElement('option');
  optTodosMaestro.value = 'Todos';
  optTodosMaestro.textContent = 'Todos';
  maestroSel.appendChild(optTodosMaestro);

  grados.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.textContent = g; gradoSel.appendChild(opt); });
  maestros.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; maestroSel.appendChild(opt); });

  gradoSel.value = 'Todos';
  maestroSel.value = 'Todos';
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

    for(const mes of ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']){
      const td = document.createElement('td');
      if(alumno.pagos && alumno.pagos[mes]){ td.textContent = `L.${alumno.pagos[mes]}`; } else { td.textContent = ''; }
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

// Botón Deshacer filtros
window.resetFiltros = function(){
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  if(gradoSel) gradoSel.value = 'Todos';
  if(maestroSel) maestroSel.value = 'Todos';
  cargarTabla();
}

// Eventos de filtros
window.addEventListener('DOMContentLoaded', async () => {
  await cargarFiltros();
  await cargarTabla();
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
  if(maestroSel) maestroSel.addEventListener('change', cargarTabla);
});
