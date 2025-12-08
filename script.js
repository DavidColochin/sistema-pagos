import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// =======================
//  CONFIG DE FIREBASE
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyBIUDbk2CJwwtjdzTt0tMiz54_bTYli_U8",
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
const adminPassword = '1234';
let alumnoActual = null;
let mesSeleccionado = null;
let cacheAlumnos = [];

// MESES: Enero y Diciembre removidos
const MESES = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

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
};

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
//  MOSTRAR LISTA ALUMNOS
// =======================
async function mostrarAlumnos(){
  const lista = document.getElementById('listaAlumnos');
  const contador = document.getElementById('contador');
  if(!lista) return;

  lista.innerHTML = '';
  const qs = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];

  qs.forEach(docSnap => cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() }));

  cacheAlumnos.forEach(a => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1;text-align:left;">
        <strong>${a.nombre}</strong><br>
        <small>${a.grado} - ${a.familiar}</small>
      </div>
      <div>
        <button onclick='abrirModal("${a.id}")'>+ Pago</button>
        <button onclick='editarAlumno("${a.id}")'>Editar</button>
        <button onclick='eliminarAlumno("${a.id}")' style='background:red;'>Eliminar</button>
      </div>
    `;
    lista.appendChild(li);
  });

  if(contador) contador.textContent = `Total alumnos: ${cacheAlumnos.length}`;
}

// =======================
//  ELIMINAR ALUMNO
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
//  EDITAR ALUMNO
// =======================
window.editarAlumno = async function(id){
  const a = cacheAlumnos.find(x=>x.id===id);

  const nuevoNombre = prompt('Nombre', a.nombre) || a.nombre;
  const nuevoFamiliar = prompt('Familiar', a.familiar) || a.familiar;
  const nuevoGrado = prompt('Grado', a.grado) || a.grado;
  const nuevoMaestro = prompt('Maestro/a', a.maestro) || a.maestro;

  await updateDoc(doc(db,'alumnos',id), {
    nombre: nuevoNombre,
    familiar: nuevoFamiliar,
    grado: nuevoGrado,
    maestro: nuevoMaestro
  });

  mostrarAlumnos();
  cargarTabla();
  cargarFiltros();
};

// =======================
//  ABRIR MODAL PAGO
// =======================
window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id);

  document.getElementById('alumnoSeleccionado').textContent = alumno.nombre;
  mostrarPagos(alumno);
  generarBotonesMes(alumno);

  document.getElementById('modalPago').style.display = 'flex';
};

window.cerrarModal = function(){
  document.getElementById('modalPago').style.display = 'none';
};

// =======================
//  GUARDAR PAGO
// =======================
window.seleccionarMes = function(mes){ mesSeleccionado = mes; };

window.guardarPago = async function(){
  if(!mesSeleccionado) return alert('Seleccione un mes');
  const monto = document.getElementById('montoPago').value;
  if(!monto) return alert('Ingrese un monto');

  const alumno = cacheAlumnos.find(a => a.id === alumnoActual);
  alumno.pagos = alumno.pagos || {};
  alumno.pagos[mesSeleccionado] = monto;

  await updateDoc(doc(db,'alumnos',alumnoActual), { pagos: alumno.pagos });

  mostrarAlumnos();
  mostrarPagos(alumno);
  generarBotonesMes(alumno);

  mesSeleccionado = null;
  document.getElementById('montoPago').value = '';

  cargarTabla();
};

// =======================
//  EDITAR O ELIMINAR PAGO
// =======================
window.editarPago = async function(mes){
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual);
  const actual = alumno.pagos[mes] || '';

  const nuevo = prompt(`Editar monto de ${mes} (vacío = eliminar)`, actual);
  if(nuevo === null) return;

  if(nuevo.trim() === ''){
    delete alumno.pagos[mes];
  } else {
    alumno.pagos[mes] = nuevo;
  }

  await updateDoc(doc(db,'alumnos',alumnoActual), { pagos: alumno.pagos });

  mostrarPagos(alumno);
  generarBotonesMes(alumno);
  cargarTabla();
};

// =======================
//  MOSTRAR PAGOS EN MODAL
// =======================
function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  cont.innerHTML = '';

  for(const mes in alumno.pagos){
    const div = document.createElement('div');
    div.innerHTML = `${mes}: L.${alumno.pagos[mes]}
      <button onclick='editarPago("${mes}")'>Editar</button>`;
    cont.appendChild(div);
  }
}

// =======================
//  BOTONES DE MESES
// =======================
function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  cont.innerHTML = '';

  MESES.forEach(mes => {
    const btn = document.createElement('button');
    if(alumno.pagos[mes]){
      btn.textContent = `${mes} (Pago)`;
      btn.classList.add('disabled');
      btn.onclick = () => editarPago(mes);
    } else {
      btn.textContent = mes;
      btn.onclick = () => seleccionarMes(mes);
    }
    cont.appendChild(btn);
  });
}

// =======================
//   CONSULTA + FILTROS
// =======================
async function cargarTodos(){
  const qs = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];
  qs.forEach(docSnap => cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() }));
}

window.cargarFiltros = async function(){
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  if(!gradoSel || !maestroSel) return;

  await cargarTodos();

  const grados = [...new Set(cacheAlumnos.map(a => a.grado))].filter(x=>x);
  const maestros = [...new Set(cacheAlumnos.map(a => a.maestro))].filter(x=>x);

  gradoSel.innerHTML = `<option>Todos</option>` + grados.map(g=>`<option>${g}</option>`).join('');
  maestroSel.innerHTML = `<option>Todos</option>` + maestros.map(m=>`<option>${m}</option>`).join('');
};

window.cargarTabla = async function(){
  const tbody = document.querySelector('#tablaPagos tbody');
  if(!tbody) return;

  await cargarTodos();

  const gradoFiltro = document.getElementById('filtroGrado').value;
  const maestroFiltro = document.getElementById('filtroMaestro').value;

  const alumnosFiltrados = cacheAlumnos.filter(a =>
    (gradoFiltro==='Todos' || a.grado===gradoFiltro) &&
    (maestroFiltro==='Todos' || a.maestro===maestroFiltro)
  );

  tbody.innerHTML = '';

  alumnosFiltrados.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.nombre}</td>
      <td>${a.familiar}</td>
      <td>${a.grado}</td>
      <td>${a.maestro}</td>
    `;

    MESES.forEach(mes => {
      if(a.pagos && a.pagos[mes]){
        tr.innerHTML += `<td><i class='fa-solid fa-check' style='color:green'></i> L.${a.pagos[mes]}</td>`;
      } else {
        tr.innerHTML += `<td><i class='fa-solid fa-xmark' style='color:red'></i></td>`;
      }
    });

    tbody.appendChild(tr);
  });
};

// =======================
//  EVENTOS DE INICIO
// =======================
window.addEventListener('DOMContentLoaded', async ()=>{
  await cargarFiltros();
  await cargarTabla();

  document.getElementById('filtroGrado').addEventListener('change', cargarTabla);
  document.getElementById('filtroMaestro').addEventListener('change', cargarTabla);
});
