
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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
let cacheAlumnos = [];

async function cargarTodos(){
  const qs = await getDocs(collection(db,'alumnos'));
  cacheAlumnos = []; qs.forEach(docSnap=>cacheAlumnos.push({ id:docSnap.id, ...docSnap.data() }));
}

export async function cargarFiltros(){
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  await cargarTodos();
  if(gradoSel){
    const grados = Array.from(new Set(cacheAlumnos.map(a=> (a.grado||'').trim()))).filter(Boolean);
    gradoSel.innerHTML = '<option value="Todos">Todos</option>' + grados.map(g=>`<option>${g}</option>`).join('');
  }
  if(maestroSel){
    const maestros = Array.from(new Set(cacheAlumnos.map(a=> (a.maestro||'').trim()))).filter(Boolean);
    maestroSel.innerHTML = '<option value="Todos">Todos</option>' + maestros.map(m=>`<option>${m}</option>`).join('');
  }
}

export async function cargarTabla(){
  const tbody = document.querySelector('#tablaPagos tbody'); if(!tbody) return;
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  await cargarTodos();
  const gradoFiltro = gradoSel ? gradoSel.value : 'Todos';
  const maestroFiltro = maestroSel ? maestroSel.value : 'Todos';
  const alumnosFiltrados = cacheAlumnos.filter(a=> (gradoFiltro==='Todos'||a.grado===gradoFiltro) && (maestroFiltro==='Todos'||a.maestro===maestroFiltro));
  tbody.innerHTML='';
  alumnosFiltrados.forEach(alumno=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${alumno.nombre}</td><td>${alumno.familiar}</td><td>${alumno.grado}</td><td>${alumno.maestro}</td>`;
    for(const mes of ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']){
      tr.innerHTML += alumno.pagos && alumno.pagos[mes]
        ? `<td><i class='fa-solid fa-check' style='color:green'></i> L.${alumno.pagos[mes]}</td>`
        : `<td><i class='fa-solid fa-xmark' style='color:red'></i></td>`;
    }
    tbody.appendChild(tr);
  });
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await cargarFiltros();
  await cargarTabla();
  const gradoSel = document.getElementById('filtroGrado');
  const maestroSel = document.getElementById('filtroMaestro');
  const btnReset = document.getElementById('btnResetFiltros');
  if(gradoSel) gradoSel.addEventListener('change', cargarTabla);
  if(maestroSel) maestroSel.addEventListener('change', cargarTabla);
  if(btnReset){
    btnReset.addEventListener('click', async ()=>{
      if(gradoSel) gradoSel.value = 'Todos';
      if(maestroSel) maestroSel.value = 'Todos';
      await cargarTabla();
    });
  }
});
