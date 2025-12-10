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
let alumnoActual = null;          // id del alumno abierto en modal
let mesSeleccionado = null;       // mes seleccionado dentro del modal
let cacheAlumnos = [];            // cache local de alumnos

// SOLO MESES VÁLIDOS (Feb → Nov)
const MESES_VALIDOS = ['Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov'];

// =======================
//  LOGIN ADMIN
// =======================
window.login = function(){
  const pass = document.getElementById('adminPass').value;
  if(pass === adminPassword){
    document.getElementById('adminPanel').style.display = 'block';
    const titulo = document.getElementById('tituloAdmin');
    if(titulo) titulo.style.display = 'none';
    const loginContainer = document.querySelector('.login-container');
    if(loginContainer) loginContainer.style.display = 'none';
    // mostrar y sincronizar datos
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

    // refrescar
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

  lista.innerHTML = 'Cargando...';

  const querySnapshot = await getDocs(collection(db, 'alumnos'));
  cacheAlumnos = [];
  querySnapshot.forEach(docSnap => { cacheAlumnos.push({ id: docSnap.id, ...docSnap.data() }); });

  lista.innerHTML = '';
  cacheAlumnos.forEach((alumno) => {
    const li = document.createElement('li');

    // botones: Pago, Editar, Eliminar alumno
    li.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;">
        <strong>${alumno.nombre}</strong>
        <span style="opacity:0.7;margin-left:6px;">(${alumno.grado || ''})</span>
      </div>
      <div>
        <button onclick='abrirModal("${alumno.id}")'>Pago</button>
        <button onclick='abrirEditar("${alumno.id}")' title="Editar alumno" style="background:#ffc107;color:#000;">Editar</button>
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
  if(!confirm('¿Eliminar este alumno?')) return;
  await deleteDoc(doc(db, 'alumnos', id));
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();
};

// =======================
//  MODAL DE PAGOS
// =======================
window.abrirModal = async function(id){
  alumnoActual = id;
  // intentar encontrar en cache; si no existe, recargar
  let alumno = cacheAlumnos.find(a => a.id === id);
  if(!alumno) {
    await cargarTodos();
    alumno = cacheAlumnos.find(a => a.id === id);
  }

  document.getElementById('alumnoSeleccionado').textContent = alumno?.nombre || '';
  mostrarPagos(alumno || { pagos: {} });
  generarBotonesMes(alumno || { pagos: {} });

  mesSeleccionado = null;
  const montoInput = document.getElementById('montoPago');
  if(montoInput) montoInput.value = '';

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
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected','selected-paid'));
};

// =======================
//  SELECCIONAR MES
// =======================
window.seleccionarMes = function(mes){
  mesSeleccionado = mes;

  // quitar marcas previas
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected','selected-paid'));

  const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || {};
  const boton = document.getElementById(`mes_${mes}`);
  if(!boton) return;

  // si ya hay pago → marcar selected-paid; si no, selected
  if(alumno.pagos && alumno.pagos[mes]){
    boton.classList.add('selected-paid');
  } else {
    boton.classList.add('selected');
  }

  // cargar monto existente para editar (si existe)
  const montoInput = document.getElementById('montoPago');
  if(montoInput) montoInput.value = alumno?.pagos?.[mes] ?? '';
};

// =======================
//  GUARDAR / EDITAR PAGO
// =======================
window.guardarPago = async function(){
  const montoInput = document.getElementById('montoPago');
  const montoVal = montoInput ? String(montoInput.value).trim() : '';

  if(!mesSeleccionado || !montoVal){
    alert('Seleccione mes y monto');
    return;
  }

  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  let alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  alumno.pagos = alumno.pagos || {};
  alumno.pagos[mesSeleccionado] = montoVal; // crea o edita

  await updateDoc(alumnoRef, { pagos: alumno.pagos });

  // refrescar todo
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();

  // recargar datos del alumno actual y refrescar modal
  alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  mostrarPagos(alumno);
  generarBotonesMes(alumno);

  // dejar input limpio (mantengo selección visual desactivada)
  if(montoInput) montoInput.value = '';
  mesSeleccionado = null;
  document.querySelectorAll('#mesesContainer button').forEach(b => b.classList.remove('selected','selected-paid'));
};

// =======================
//  ELIMINAR PAGO DE MES
// =======================
window.eliminarPago = async function(mes){
  if(!confirm(`¿Eliminar el pago del mes ${mes}?`)) return;

  const alumno = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  if(!alumno || !alumno.pagos) return;

  delete alumno.pagos[mes];

  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  await updateDoc(alumnoRef, { pagos: alumno.pagos });

  // refrescar
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();

  const actualizado = cacheAlumnos.find(a => a.id === alumnoActual) || (await fetchAlumno(alumnoActual));
  mostrarPagos(actualizado);
  generarBotonesMes(actualizado);

  mesSeleccionado = null;
  const montoInput = document.getElementById('montoPago');
  if(montoInput) montoInput.value = '';
};

// =======================
//  MOSTRAR PAGOS EXISTENTES (en modal) - ordenados y tabulados
// =======================
function mostrarPagos(alumno){
  const cont = document.getElementById('pagosRegistrados');
  if(!cont) return;
  cont.innerHTML = '';

  // Mostrar en orden
  MESES_VALIDOS.forEach(mes => {
    if(alumno.pagos && alumno.pagos[mes]){
      const div = document.createElement('div');
      div.className = 'pago-row';
      // estructura: nombre mes | monto | boton eliminar
      div.innerHTML = `
        <span class="mes-label">${mes}</span>
        <span class="mes-amount">L.${alumno.pagos[mes]}</span>
        <button class="btn small danger" onclick="eliminarPago('${mes}')">Eliminar</button>
      `;
      cont.appendChild(div);
    }
  });
}

// =======================
//  GENERAR BOTONES DE MESES (FEB → NOV)
// =======================
function generarBotonesMes(alumno){
  const cont = document.getElementById('mesesContainer');
  if(!cont) return;
  cont.innerHTML = '';

  MESES_VALIDOS.forEach(mes => {
    const btn = document.createElement('button');
    btn.id = `mes_${mes}`;
    btn.type = 'button';

    // texto: si tiene pago → “Mes (pagado)”
    btn.textContent = alumno?.pagos?.[mes] ? `${mes} (pagado)` : mes;

    if(alumno?.pagos?.[mes]){
      btn.classList.add('paid'); // estado pagado (color suave)
    }

    btn.onclick = () => {
      // seleccionar mes (visual) y cargar monto
      window.seleccionarMes(mes);
    };
    cont.appendChild(btn);
  });
}

// =======================
//  EDITAR ALUMNO - modal
// =======================
window.abrirEditar = async function(id){
  const alumno = cacheAlumnos.find(a => a.id === id) || (await fetchAlumno(id));
  if(!alumno) return;

  // rellenar campos
  document.getElementById('editNombre').value = alumno.nombre || '';
  document.getElementById('editFamiliar').value = alumno.familiar || '';
  document.getElementById('editGrado').value = alumno.grado || '';
  document.getElementById('editMaestro').value = alumno.maestro || '';

  // guardar referencia del alumno a editar
  alumnoActual = id;

  document.getElementById('modalEditar').style.display = 'flex';
};

window.cerrarModalEditar = function(){
  document.getElementById('modalEditar').style.display = 'none';
};

window.guardarEdicion = async function(){
  const nombre = document.getElementById('editNombre').value.trim();
  const familiar = document.getElementById('editFamiliar').value.trim();
  const grado = document.getElementById('editGrado').value.trim();
  const maestro = document.getElementById('editMaestro').value.trim();

  if(!nombre || !familiar || !grado || !maestro){
    alert('Complete todos los campos para guardar');
    return;
  }

  const alumnoRef = doc(db, 'alumnos', alumnoActual);
  await updateDoc(alumnoRef, { nombre, familiar, grado, maestro });

  // refrescar vistas
  await mostrarAlumnos();
  await cargarTabla();
  await cargarFiltros();

  cerrarModalEditar();
};

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

// =======================
//  INIT
// =======================
window.addEventListener('DOMContentLoaded', async ()=>{
  await cargarFiltros();
  await cargarTabla();

  // cerrar modal si se hace click fuera del contenido
  document.addEventListener('click', (e)=>{
    const modal = document.getElementById('modalPago');
    if(e.target === modal) cerrarModal();
    const modalE = document.getElementById('modalEditar');
    if(e.target === modalE) cerrarModalEditar();
  });
});
