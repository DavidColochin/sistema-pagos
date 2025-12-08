import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// === CONFIG FIREBASE ===
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

// Meses visibles (Ene y Dic fuera)
const MESES = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

// ===============================================================
// ========================== LOGIN ===============================
// ===============================================================
window.login = function(){
  const pass = document.getElementById('adminPass').value;
  if(pass === adminPassword){
    document.getElementById('adminPanel').style.display = 'block';
    document.querySelector('.login-container').style.display = 'none';
    mostrarAlumnos();
  } else {
    alert('Código incorrecto');
  }
};

// ===============================================================
// ===================== REGISTRO ALUMNO ==========================
// ===============================================================
window.registrarAlumno = async function(){
  const nombre = document.getElementById('nombre').value.trim();
  const familiar = document.getElementById('familiar').value.trim();
  const grado = document.getElementById('grado').value.trim();
  const maestro = document.getElementById('maestro').value.trim();

  if(nombre && familiar && grado && maestro){
    await addDoc(collection(db, 'alumnos'), { 
      nombre, familiar, grado, maestro, pagos: {}
    });

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

// ===============================================================
// ====================== MOSTRAR ALUMNOS ==========================
// ===============================================================
async function mostrarAlumnos(){
  const lista = document.getElementById('listaAlumnos');
  const contador = document.getElementById('contador');
  if(!lista) return;

  lista.innerHTML = '';
  cacheAlumnos = [];

  const querySnapshot = await getDocs(collection(db, 'alumnos'));
  querySnapshot.forEach(docSnap => { 
    cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() }); 
  });

  cacheAlumnos.forEach((alumno) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1;text-align:left;">
        <strong>${alumno.nombre}</strong><br>
        <small>${alumno.grado} - ${alumno.familiar}</small>
      </div>
      <div>
        <button onclick='abrirModal("${alumno.id}")'>+ Pago</button>
        <button onclick='editarAlumno("${alumno.id}")'>Editar</button>
        <button onclick='eliminarAlumno("${alumno.id}")' style='background:red;'>Eliminar</button>
      </div>`;
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
};

window.editarAlumno = async function(id){
  const a = cacheAlumnos.find(x=>x.id===id) || await fetchAlumno(id);
  if(!a) return alert('Alumno no encontrado');

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

  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();
};

async function fetchAlumno(id){
  const qs = await getDocs(collection(db, 'alumnos'));
  let found = null;
  qs.forEach(d => { if(d.id === id) found = { id: d.id, ...d.data() }; });
  return found;
}

// ===============================================================
// ===================== PAGOS / MODAL ============================
// ===============================================================
window.abrirModal = async function(id){
  alumnoActual = id;
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));

  document.getElementById('alumnoSeleccionado').textContent = alumno.nombre;
  mostrarPagos(alumno);
  generarBotonesMes(alumno);
  document.getElementById('modalPago').style.display = 'flex';
};

window.cerrarModal = function(){
  document.getElementById('modalPago').style.display = 'none';
};

window.seleccionarMes = function(mes){ 
  mesSeleccionado = mes; 
};

window.guardarPago = async function(){
  if(mesSeleccionado && document.getElementById('montoPago').value){
    const monto = document.getElementById('montoPago').value;
    const alumnoRef = doc(db, 'alumnos', alumnoActual);

    const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
    alumno.pagos = alumno.pagos || {};
    alumno.pagos[mesSeleccionado] = monto;

    await updateDoc(alumnoRef, { pagos: alumno.pagos });

    await mostrarAlumnos();
    const actualizado = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));

    mostrarPagos(actualizado);
    generarBotonesMes(actualizado);

    document.getElementById('montoPago').value='';
    mesSeleccionado=null;

    cargarTabla();
  } else {
    alert('Seleccione mes y monto');
  }
};

window.editarPago = async function(mes){
  const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  if(!alumno) return;

  const actual = (alumno.pagos && alumno.pagos[mes]) || '';
  const nuevo = prompt(`Editar monto para ${mes} (deje vacío para eliminar)`, actual);

  if(nuevo === null) return;

  const alumnoRef = doc(db,'alumnos',alumnoActual);
  alumno.pagos = alumno.pagos || {};

  if(nuevo.trim() === ''){
    delete alumno.pagos[mes];
  } else {
    alumno.pagos[mes] = nuevo;
  }

  await updateDoc(alumnoRef, { pagos: alumno.pagos });

  await mostrarAlumnos();
  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));

  mostrarPagos(actualizado);
  generarBotonesMes(actualizado);
  cargarTabla();
};

function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  if(!cont) return;

  cont.innerHTML = '';
  for(const mes in (alumno.pagos||{})){
    const div = document.createElement('div');
    div.innerHTML = `${mes}: L.${alumno.pagos[mes]} 
      <button onclick='editarPago("${mes}")'>Editar</button>`;
    cont.appendChild(div);
  }
}

function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  if(!cont) return;

  cont.innerHTML = '';

  MESES.forEach(mes => {
    const btn = document.createElement('button');
    btn.textContent = mes;

    if(alumno.pagos && alumno.pagos[mes]){
      btn.classList.add('disabled');
      btn.textContent = mes + ' (Pago)';
      btn.onclick = () => editarPago(mes);
    } else {
      btn.onclick = () => window.seleccionarMes(mes);
    }

    cont.appendChild(btn);
  });
}

// ===============================================================
// ========= CONSULTA PÚBLICA / TABLA CON COLORES =================
// ===============================================================
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

  const grados = [...new Set(cacheAlumnos.map(a => (a.grado||'').trim()))].filter(g => g);
  const maestros = [...new Set(cacheAlumnos.map(a => (a.maestro||'').trim()))].filter(m => m);

  gradoSel.innerHTML = '<option value="Todos">Todos</option>' 
                      + grados.map(g=>`<option>${g}</option>`).join('');

  maestroSel.innerHTML = '<option value="Todos">Todos</option>' 
                        + maestros.map(m=>`<option>${m}</option>`).join('');
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

    MESES.forEach(mes => {
      if(alumno.pagos && alumno.pagos[mes]){
        tr.innerHTML += `<td><i class='fa-solid fa-check icon-ok'></i> L.${alumno.pagos[mes]}</td>`;
      } else {
        tr.innerHTML += `<td><i class='fa-solid fa-xmark icon-x'></i></td>`;
      }
    });

    tbody.appendChild(tr);
  });
};

// ===============================================================
// ========================= EVENTOS ==============================
// ===============================================================
window.addEventListener('DOMContentLoaded', async ()=>{
  await cargarFiltros();
  await cargarTabla();

  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');

  if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
  if(maestroSel) maestroSel.addEventListener('change', cargarTabla);
});
