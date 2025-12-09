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

// SOLO MESES VÁLIDOS
const MESES_VALIDOS = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

// =======================
//  LOGIN ADMIN
// =======================
window.login = function(){
  const pass = document.getElementById('adminPass').value;
  if(pass === adminPassword){
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('tituloAdmin').style.display = 'none';
    document.querySelector('.login-container').style.display = 'none';
    mostrarAlumnos();
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

    mostrarAlumnos();
    cargarTabla();
    cargarFiltros();

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
    mostrarAlumnos();
    cargarTabla();
    cargarFiltros();
  }
};

// =======================
//  MODAL DE PAGOS
// =======================
window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));

  document.getElementById('alumnoSeleccionado').textContent = alumno.nombre;

  mostrarPagos(alumno);
  generarBotonesMes(alumno);

  document.getElementById('modalPago').style.display = 'flex';
};

async function fetchAlumno(id){
  const qs = await getDocs(collection(db, 'alumnos'));
  let found = null;
  qs.forEach(d => { if(d.id === id) found = { id: d.id, ...d.data() }; });
  return found;
}

window.cerrarModal = function(){
  document.getElementById('modalPago').style.display = 'none';
  mesSeleccionado = null;
};

// =======================
//  SELECCIONAR MES
// =======================
window.seleccionarMes = function(mes){ 
  mesSeleccionado = mes;

  // Marcar visualmente
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected'));
  document.getElementById(`mes_${mes}`).classList.add('selected');
};

// =======================
//  GUARDAR / EDITAR PAGO
// =======================
window.guardarPago = async function(){
  if(mesSeleccionado && document.getElementById('montoPago').value){
    const monto = document.getElementById('montoPago').value;

    const alumnoRef = doc(db, 'alumnos', alumnoActual);
    const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));

    alumno.pagos = alumno.pagos || {}; 
    alumno.pagos[mesSeleccionado] = monto; // EDITA O CREA

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
};

// =======================
//  MOSTRAR PAGOS EXISTENTES
// =======================
function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  if(!cont) return;

  cont.innerHTML = '';

  for(const mes in (alumno.pagos||{})){
    const div = document.createElement('div');
    div.textContent = `${mes}: L.${alumno.pagos[mes]}`;
    cont.appendChild(div);
  }
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

    if(alumno.pagos && alumno.pagos[mes]){
      btn.textContent = `${mes} (Editar)`;
      btn.onclick = () => window.seleccionarMes(mes);
    } else {
      btn.onclick = () => window.seleccionarMes(mes);
    }

    cont.appendChild(btn);
  });
}

// =======================
//  CONSULTA / FILTROS
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
  await cargarFiltros();
  await cargarTabla();

  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');

  if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
  if(maestroSel) maestroSel.addEventListener('change', cargarTabla);
});
