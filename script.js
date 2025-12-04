import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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

window.login = function() {
    const pass = document.getElementById('adminPass').value;
    if(pass === adminPassword) {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('tituloAdmin').style.display = 'none';
        document.querySelector('.login-container').style.display = 'none';
        mostrarAlumnos();
    } else {
        alert('Código incorrecto');
    }
}

window.registrarAlumno = async function() {
    const nombre = document.getElementById('nombre').value;
    const familiar = document.getElementById('familiar').value;
    const grado = document.getElementById('grado').value;
    const maestro = document.getElementById('maestro').value;
    if(nombre && familiar && grado && maestro) {
        await addDoc(collection(db, 'alumnos'), { nombre, familiar, grado, maestro, pagos: {} });
        document.getElementById('nombre').value='';
        document.getElementById('familiar').value='';
        document.getElementById('grado').value='';
        document.getElementById('maestro').value='';
        mostrarAlumnos();
    } else {
        alert('Complete todos los campos');
    }
}

async function mostrarAlumnos() {
    const lista = document.getElementById('listaAlumnos');
    const contador = document.getElementById('contador');
    if(lista) {
        lista.innerHTML = '';
        const querySnapshot = await getDocs(collection(db, 'alumnos'));
        let alumnos = [];
        querySnapshot.forEach(docSnap => {
            alumnos.push({ id: docSnap.id, ...docSnap.data() });
        });
        alumnos.forEach((alumno, index) => {
            const li = document.createElement('li');
            li.innerHTML = `${alumno.nombre} - ${alumno.grado} <div><button onclick='abrirModal("${alumno.id}")'>+ Pago</button><button onclick='eliminarAlumno("${alumno.id}")' style='background:red;'>Eliminar</button></div>`;
            lista.appendChild(li);
        });
        contador.textContent = `Total alumnos: ${alumnos.length}`;
    }
}

window.eliminarAlumno = async function(id) {
    if(confirm('¿Eliminar este alumno?')) {
        await deleteDoc(doc(db, 'alumnos', id));
        mostrarAlumnos();
        cargarTabla();
    }
}

window.abrirModal = async function(id) {
    alumnoActual = id;
    const docSnap = await getDocs(collection(db, 'alumnos'));
    let alumno = null;
    docSnap.forEach(d => { if(d.id === id) alumno = d.data(); });
    document.getElementById('alumnoSeleccionado').textContent = alumno.nombre;
    mostrarPagos(alumno);
    generarBotonesMes(alumno);
    document.getElementById('modalPago').style.display = 'flex';
}

window.cerrarModal = function() {
    document.getElementById('modalPago').style.display = 'none';
}

window.seleccionarMes = function(mes) { mesSeleccionado = mes; }

window.guardarPago = async function() {
    if(mesSeleccionado && document.getElementById('montoPago').value) {
        const monto = document.getElementById('montoPago').value;
        const alumnoRef = doc(db, 'alumnos', alumnoActual);
        const docSnap = await getDocs(collection(db, 'alumnos'));
        let alumno = null;
        docSnap.forEach(d => { if(d.id === alumnoActual) alumno = d.data(); });
        alumno.pagos[mesSeleccionado] = monto;
        await updateDoc(alumnoRef, { pagos: alumno.pagos });
        mostrarPagos(alumno);
        generarBotonesMes(alumno);
        document.getElementById('montoPago').value='';
        mesSeleccionado=null;
        cargarTabla();
    } else {
        alert('Seleccione mes y monto');
    }
}

function mostrarPagos(alumno) {
    const cont = document.getElementById('pagosRegistrados');
    cont.innerHTML = '';
    for(let mes in alumno.pagos) {
        const div = document.createElement('div');
        div.textContent = `${mes}: L.${alumno.pagos[mes]}`;
        cont.appendChild(div);
    }
}

function generarBotonesMes(alumno) {
    const cont = document.getElementById('mesesContainer');
    cont.innerHTML = '';
    for(let mes of ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']) {
        const btn = document.createElement('button');
        btn.textContent = mes;
        if(alumno.pagos[mes]) {
            btn.classList.add('disabled');
            btn.textContent = mes+' (Pago)';
        } else {
            btn.onclick = () => seleccionarMes(mes);
        }
        cont.appendChild(btn);
    }
}

async function cargarTabla() {
    const tbody = document.querySelector('#tablaPagos tbody');
    if(tbody) {
        tbody.innerHTML = '';
        const querySnapshot = await getDocs(collection(db, 'alumnos'));
        querySnapshot.forEach(docSnap => {
            const alumno = docSnap.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${alumno.nombre}</td><td>${alumno.familiar}</td><td>${alumno.grado}</td><td>${alumno.maestro}</td>`;
            for(let mes of ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']) {
                if(alumno.pagos[mes]) {
                    tr.innerHTML += `<td><i class='fa-solid fa-check' style='color:green'></i> L.${alumno.pagos[mes]}</td>`;
                } else {
                    tr.innerHTML += `<td><i class='fa-solid fa-xmark' style='color:red'></i></td>`;
                }
            }
            tbody.appendChild(tr);
        });
    }
}

window.onload = () => { mostrarAlumnos(); cargarTabla(); };
