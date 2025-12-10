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
//  VARIABLES
// =======================
const adminPassword = '901218';
let alumnoActual = null;
let mesSeleccionado = null;
let cacheAlumnos = [];

const MESES_VALIDOS = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

// =======================
//  LOGIN
// =======================
window.login = function(){
  const pass = document.getElementById('adminPass').value;
  if(pass === adminPassword){
    document.getElementById('adminPanel').style.display = 'block';
    const titulo = document.getElementById('tituloAdmin');
    if(titulo) titulo.style.display = 'none';

    const loginContainer = document.querySelector('.login-container');
    if(loginContainer) loginContainer.style.display = 'none';

    mostrarAlumnos();
    cargarFiltros();
    cargarTabla();
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
//  MODAL DE PAGOS
// =======================
window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));

  document.getElementById('alumnoSeleccionado').textContent = alumno.nombre || '';

  mostrarPagos(alumno);
  generarBotonesMes(alumno);

  mesSeleccionado = null;
  document.getElementById('montoPago').value = '';

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

  document.querySelectorAll('#mesesContainer button').forEach(b => {
    b.classList.remove('selected');
    b.classList.remove('selected-paid');
  });

  const alumno = cacheAlumnos.find(a => a.id === alumnoActual);
  const boton = document.getElementById(`mes_${mes}`);

  if (alumno.pagos?.[mes]) {
    boton.classList.add('selected-paid'); // naranja fuerte
  } else {
    boton.classList.add('selected'); // azul normal
  }

  const montoInput = document.getElementById('montoPago');
  montoInput.value = alumno.pagos?.[mes] || '';
};

// =======================
//  GUARDAR PAGO
// =======================
window.guardarPago = async function(){
  const montoVal = document.getElementById('montoPago').value.trim();

  if(!mesSeleccionado || !montoVal){
    alert('Seleccione mes y monto');
    return;
  }

  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual);

  alumno.pagos = alumno.pagos || {};
  alumno.pagos[mesSeleccionado] = montoVal;

  await updateDoc(alumnoRef, { pagos: alumno.pagos });

  mostrarAlumnos();
  cargarTabla();
  cargarFiltros();

  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual);
  mostrarPagos(actualizado);
  generarBotonesMes(actualizado);

  document.getElementById('montoPago').value = '';
  mesSeleccionado = null;
};

// =======================
//  ELIMINAR PAGO DE MES
// =======================
window.eliminarPago = async function(mes){
  if(!confirm(`¿Eliminar el pago del mes ${mes}?`)) return;

  const alumno = cacheAlumnos.find(a => a.id === alumnoActual);
  delete alumno.pagos[mes];

  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  await updateDoc(alumnoRef, { pagos: alumno.pagos });

  mostrarAlumnos();
  cargarTabla();
  cargarFiltros();

  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual);
  mostrarPagos(actualizado);
  generarBotonesMes(actualizado);

  mesSeleccionado = null;
  document.getElementById('montoPago').value = '';
};

// =======================
//  MOSTRAR PAGOS EN MODAL
// =======================
function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  cont.innerHTML = '';

  MESES_VALIDOS.forEach(mes => {
    if(alumno.pagos?.[mes]){
      const div = document.createElement('div');
      div.innerHTML = `
        ${mes}: L.${alumno.pagos[mes]}
        <button onclick="eliminarPago('${mes}')" style="background:red;color:white;border:none;padding:3px 6px;border-radius:4px;margin-left:10px;">
          Eliminar
        </button>`;
      cont.appendChild(div);
    }
  });
}

// =======================
//  BOTONES DE MESES
// =======================
function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  cont.innerHTML = '';

  MESES_VALIDOS.forEach(mes => {
    const btn = document.createElement('button');
    btn.id = `mes_${mes}`;

    // texto: si tiene pago → “Mes (pagado)”
    btn.textContent = alumno.pagos?.[mes] ? `${mes} (pagado)` : mes;

    if(alumno.pagos?.[mes]){
      btn.classList.add('paid'); // naranja suave
    }

    btn.onclick = () => window.seleccionarMes(mes);
    cont.appendChild(btn);
  });
}

// =======================
//  FILTROS Y TABLA
// =======================
async function cargarTodos(){
  const qs = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];
  qs.forEach(docSnap => {
    cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() });
  });
}

window.cargarFiltros = async function(){
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  if(!gradoSel || !maestroSel) return;

  await cargarTodos();

  const grados = [...new Set(cacheAlumnos.map(a => a.grado.trim()))];
  const maestros = [...new Set(cacheAlumnos.map(a => a.maestro.trim()))];

  gradoSel.innerHTML = '<option value="Todos">Todos</option>' + grados.map(g=>`<option>${g}</option>`).join('');
  maestroSel.innerHTML = '<option value="Todos">Todos</option>' + maestros.map(m=>`<option>${m}</option>`).join('');
};

window.cargarTabla = async function(){
  const tbody = document.querySelector('#tablaPagos tbody');
  if(!tbody) return;

  await cargarTodos();

  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');

  const gradoFiltro = gradoSel.value;
  const maestroFiltro = maestroSel.value;

  const alumnosFiltrados = cacheAlumnos.filter(a =>
    (gradoFiltro === 'Todos' || a.grado === gradoFiltro) &&
    (maestroFiltro === 'Todos' || a.maestro === maestroFiltro)
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
      if(alumno.pagos?.[mes]){
        tr.innerHTML += `<td><i class='fa-solid fa-check' style='color:green'></i> L.${alumno.pagos[mes]}</td>`;
      } else {
        tr.innerHTML += `<td><i class='fa-solid fa-xmark' style='color:red'></i></td>`;
      }
    });

    tbody.appendChild(tr);
  });
};

// =======================
//  INIT
// =======================
window.addEventListener('DOMContentLoaded', ()=>{
  cargarFiltros();
  cargarTabla();

  document.addEventListener('click', (e)=>{
    const modal = document.getElementById('modalPago');
    if(e.target === modal){
      cerrarModal();
    }
  });
});
