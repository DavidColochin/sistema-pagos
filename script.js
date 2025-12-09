import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// =======================
//  CONFIG FIREBASE
// =======================
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

// =======================
//  VARIABLES GLOBALES
// =======================
const adminPassword = '901218';
let alumnoActual = null;
let mesSeleccionado = null;
let cacheAlumnos = [];

// SOLO MESES VÁLIDOS (Feb → Nov)
const MESES_VALIDOS = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

// =======================
//  LOGIN ADMIN
// =======================
window.login = function(){
  const pass = document.getElementById('adminPass').value;
  if(pass === adminPassword){
    document.getElementById('adminPanel').style.display = 'block';
    // si existe un titulo de acceso (en otras versiones), ocultarlo
    const titulo = document.getElementById('tituloAdmin');
    if(titulo) titulo.style.display = 'none';
    // ocultar la parte de login
    const loginContainer = document.querySelector('.login-container');
    if(loginContainer) loginContainer.style.display = 'none';
    // mostrar lista/controles
    mostrarAlumnos();
    cargarFiltros();
    cargarTabla();
  } else {
    alert('Código incorrecto');
  }
}

// =======================
//  REGISTRAR ALUMNO
// =======================
window.registrarAlumno = async function(){
  const nombre = document.getElementById('nombre').value.trim();
  const familiar = document.getElementById('familiar').value.trim();
  const grado = document.getElementById('grado').value.trim();
  const maestro = document.getElementById('maestro').value.trim();

  if(nombre && familiar && grado && maestro){
    await addDoc(collection(db, 'alumnos'), { nombre, familiar, grado, maestro, pagos: {} });

    document.getElementById('nombre').value='';
    document.getElementById('familiar').value='';
    document.getElementById('grado').value='';
    document.getElementById('maestro').value='';

    await mostrarAlumnos();
    await cargarTabla();
    await cargarFiltros();

  } else {
    alert('Complete todos los campos');
  }
};

// =======================
//  LISTAR ALUMNOS
// =======================
async function mostrarAlumnos(){
  const lista = document.getElementById('listaAlumnos');
  const contador = document.getElementById('contador');
  if(!lista) return;

  lista.innerHTML = '';

  const querySnapshot = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];

  querySnapshot.forEach(docSnap => { 
    cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() });
  });

  cacheAlumnos.forEach((alumno) => {
    const li = document.createElement('li');
    li.innerHTML = `${alumno.nombre} - ${alumno.grado} 
        <div>
            <button onclick='abrirModal("${alumno.id}")'>Pago</button>
            <button onclick='eliminarAlumno("${alumno.id}")' style='background:red;'>Eliminar</button>
        </div>`;
    lista.appendChild(li);
  });

  if(contador) contador.textContent = `Total alumnos: ${cacheAlumnos.length}`;
}

// =======================
//  ELIMINAR
// =======================
window.eliminarAlumno = async function(id){
  if(confirm('¿Eliminar este alumno?')){
    await deleteDoc(doc(db, 'alumnos', id));
    await mostrarAlumnos();
    await cargarTabla();
    await cargarFiltros();
  }
};

// =======================
//  MODAL DE PAGOS
// =======================
window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));

  // mostrar nombre
  const nombreElem = document.getElementById('alumnoSeleccionado');
  if(nombreElem) nombreElem.textContent = alumno.nombre || '';

  // mostrar pagos existentes
  mostrarPagos(alumno);

  // generar botones de meses (Feb->Nov)
  generarBotonesMes(alumno);

  // limpiar selección previa
  mesSeleccionado = null;
  const montoInput = document.getElementById('montoPago');
  if(montoInput) montoInput.value = '';

  // abrir modal
  const modal = document.getElementById('modalPago');
  if(modal) modal.style.display = 'flex';
};

// helper para traer un alumno individual (por si no está en cache)
async function fetchAlumno(id){
  const qs = await getDocs(collection(db, 'alumnos'));
  let found = null;
  qs.forEach(d => { if(d.id === id) found = { id: d.id, ...d.data() }; });
  return found;
}

window.cerrarModal = function(){
  const modal = document.getElementById('modalPago');
  if(modal) modal.style.display = 'none';
  mesSeleccionado = null;
  // quitar selección visual
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected'));
};

// =======================
//  SELECCIONAR MES
// =======================
window.seleccionarMes = function(mes){
  mesSeleccionado = mes;

  // Marcar visualmente: quitar selected a todos y poner en el elegido
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected'));
  const boton = document.getElementById(`mes_${mes}`);
  if(boton) boton.classList.add('selected');

  // Si ya existe pago para ese mes, cargar el monto para editar
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual);
  const montoInput = document.getElementById('montoPago');
  if(alumno && alumno.pagos && alumno.pagos[mes]){
    if(montoInput) montoInput.value = alumno.pagos[mes];
  } else {
    if(montoInput) montoInput.value = '';
  }
};

// =======================
//  GUARDAR / EDITAR PAGO
// =======================
window.guardarPago = async function(){
  const montoInput = document.getElementById('montoPago');
  const montoVal = montoInput ? montoInput.value.trim() : '';

  if(!mesSeleccionado || !montoVal){
    alert('Seleccione mes y monto');
    return;
  }

  const monto = montoVal;
  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));

  alumno.pagos = alumno.pagos || {};
  alumno.pagos[mesSeleccionado] = monto; // crea o edita

  await updateDoc(alumnoRef, { pagos: alumno.pagos });

  // actualizar cache local: re-cargar lista y tabla
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();

  // recargar datos del alumno actual y refrescar modal
  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  mostrarPagos(actualizado);
  generarBotonesMes(actualizado);

  // dejar input limpio y mantener la selección visual (puedes cambiar si quieres limpiar)
  if(montoInput) montoInput.value = '';
  mesSeleccionado = null;
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected'));
};

// =======================
//  MOSTRAR PAGOS EXISTENTES (en modal)
// =======================
function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  if(!cont) return;

  cont.innerHTML = '';
  // Mostrar en orden de MESES_VALIDOS solo
  MESES_VALIDOS.forEach(mes => {
    if(alumno.pagos && alumno.pagos[mes]){
      const div = document.createElement('div');
      div.textContent = `${mes}: L.${alumno.pagos[mes]}`;
      cont.appendChild(div);
    }
  });
}

// =======================
//  GENERAR BOTONES DE MESES
// =======================
function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  if(!cont) return;

  cont.innerHTML = '';

  MESES_VALIDOS.forEach(mes => {
    const btn = document.createElement('button');
    btn.id = `mes_${mes}`;
    btn.textContent = mes;

    // si ya tiene pago, dejamos la posibilidad de "Editar": marcado con texto (pero no bloqueado)
    if(alumno.pagos && alumno.pagos[mes]){
      btn.textContent = `${mes} (Editar)`;
    }

    // siempre se puede seleccionar para editar o registrar
    btn.onclick = () => window.seleccionarMes(mes);

    cont.appendChild(btn);
  });
}

// =======================
//  CONSULTA / FILTROS / TABLA
// =======================
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
};

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
      <td>${alumno.nombre}</td>
      <td>${alumno.familiar}</td>
      <td>${alumno.grado}</td>
      <td>${alumno.maestro}</td>
    `;

    MESES_VALIDOS.forEach(mes => {
      if(alumno.pagos && alumno.pagos[mes]){
        tr.innerHTML += `<td><i class='fa-solid fa-check' style='color:green'></i> L.${alumno.pagos[mes]}</td>`;
      } else {
        tr.innerHTML += `<td><i class='fa-solid fa-xmark' style='color:red'></i></td>`;
      }
    });

    tbody.appendChild(tr);
  });
};

window.addEventListener('DOMContentLoaded', async ()=>{
  // cargar filtros y tabla si se abre desde consulta.html o admin (si se ha logueado)
  await cargarFiltros();
  await cargarTabla();

  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');

  if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
  if(maestroSel) maestroSel.addEventListener('change', cargarTabla);

  // cerrar modal al hacer click fuera del contenido
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalPago');
    if(!modal) return;
    if(modal.style.display === 'flex' && e.target === modal){
      cerrarModal();
    }
  });
});
