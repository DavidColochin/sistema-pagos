// === script.js COMPLETO CON SISTEMA DE PAGOS ORDENADO, EDITABLE Y MESES FEB–NOV ===

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// === CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyC-1yiboZcNWgAiW0qkupNGUfb1jIw6gBE",
  authDomain: "estadocuenta-976a4.firebaseapp.com",
  projectId: "estadocuenta-976a4",
  storageBucket: "estadocuenta-976a4.appspot.com",
  messagingSenderId: "350403428952",
  appId: "1:350403428952:web:ebe3eddf594c258f571949",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==============================
//    VARIABLES GLOBALES
// ==============================
let alumnos = [];
let alumnoActualID = null;
let alumnoActualData = null;
let mesSeleccionado = null;

// ORDEN CORRECTO FEB → NOV
const ordenMeses = [
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
];

const nombresMes = {
  feb: "Febrero",
  mar: "Marzo",
  abr: "Abril",
  may: "Mayo",
  jun: "Junio",
  jul: "Julio",
  ago: "Agosto",
  sep: "Septiembre",
  oct: "Octubre",
  nov: "Noviembre",
};

// ==============================
//    LOGIN SUPER SIMPLE
// ==============================
window.login = function () {
  const pass = document.getElementById("adminPass").value.trim();
  if (pass === "1234") {
    document.getElementById("adminPanel").style.display = "block";
    document.getElementById("tituloAdmin").innerHTML =
      '<i class="fa-solid fa-gear"></i> Panel Administrador';
    cargarAlumnos();
  } else {
    alert("Código incorrecto");
  }
};

// ==============================
//    REGISTRAR ALUMNO
// ==============================
window.registrarAlumno = async function () {
  const nombre = document.getElementById("nombre").value.trim();
  const familiar = document.getElementById("familiar").value.trim();
  const grado = document.getElementById("grado").value.trim();
  const maestro = document.getElementById("maestro").value.trim();

  if (!nombre || !familiar || !grado || !maestro) {
    alert("Complete todos los campos");
    return;
  }

  await addDoc(collection(db, "alumnos"), {
    nombre,
    familiar,
    grado,
    maestro,
    pagos: {}, // vacío
  });

  alert("Alumno registrado");
  cargarAlumnos();
};

// ==============================
//    CARGAR LISTA DE ALUMNOS
// ==============================
async function cargarAlumnos() {
  alumnos = [];
  const lista = document.getElementById("listaAlumnos");
  lista.innerHTML = "Cargando...";

  const query = await getDocs(collection(db, "alumnos"));
  lista.innerHTML = "";

  query.forEach((d) => {
    alumnos.push({ id: d.id, ...d.data() });
  });

  alumnos.forEach((al) => {
    const li = document.createElement("li");
    li.textContent = al.nombre + " (" + al.grado + ")";
    li.onclick = () => abrirModalPago(al.id);
    lista.appendChild(li);
  });
}

// ==============================
//    ABRIR MODAL PAGO
// ==============================
async function abrirModalPago(id) {
  alumnoActualID = id;

  // traer datos del alumno
  const datos = alumnos.find((a) => a.id === id);
  alumnoActualData = datos;

  document.getElementById("alumnoSeleccionado").textContent = datos.nombre;
  mostrarPagosRegistrados(datos.pagos || {});
  cargarBotonesMeses(datos.pagos || {});

  mesSeleccionado = null;
  document.getElementById("montoPago").value = "";

  document.getElementById("modalPago").style.display = "block";
}

window.cerrarModal = function () {
  document.getElementById("modalPago").style.display = "none";
};

// ==============================
//    MOSTRAR PAGOS ORDENADOS
// ==============================
function mostrarPagosRegistrados(pagos) {
  const cont = document.getElementById("pagosRegistrados");
  cont.innerHTML = "";

  const keys = Object.keys(pagos).sort(
    (a, b) => ordenMeses.indexOf(a) - ordenMeses.indexOf(b)
  );

  keys.forEach((m) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.fontFamily = "monospace";

    div.innerHTML = `
      <span>${nombresMes[m].padEnd(10, " ")}</span>
      <span>L.${pagos[m]}</span>
    `;
    cont.appendChild(div);
  });
}

// ==============================
//  CREAR BOTONES ORDENADOS FEB → NOV
// ==============================
function cargarBotonesMeses(pagos) {
  const cont = document.getElementById("mesesContainer");
  cont.innerHTML = "";

  ordenMeses.forEach((mes) => {
    const btn = document.createElement("button");
    btn.textContent = pagos[mes] ? `${nombresMes[mes]} (Pago)` : nombresMes[mes];
    btn.dataset.mes = mes;

    // si ya pagó → deshabilitado pero editable
    if (pagos[mes]) {
      btn.classList.add("pagado");
      btn.disabled = false; // ← IMPORTANTE: se puede editar
    }

    btn.onclick = () => seleccionarMes(btn, mes, pagos[mes]);
    cont.appendChild(btn);
  });
}

// ==============================
//    SELECCIONAR MES
// ==============================
function seleccionarMes(boton, mes, montoExistente) {
  mesSeleccionado = mes;

  document.querySelectorAll("#mesesContainer button").forEach((b) =>
    b.classList.remove("activo")
  );

  boton.classList.add("activo");

  // si existe un valor → lo coloca para editarlo
  document.getElementById("montoPago").value = montoExistente || "";
}

// ==============================
//    GUARDAR / EDITAR PAGO
// ==============================
window.guardarPago = async function () {
  if (!mesSeleccionado) {
    alert("Seleccione un mes");
    return;
  }

  const monto = document.getElementById("montoPago").value.trim();
  if (!monto || isNaN(monto) || monto <= 0) {
    alert("Ingrese un monto válido");
    return;
  }

  const docRef = doc(db, "alumnos", alumnoActualID);
  const pagos = alumnoActualData.pagos || {};

  pagos[mesSeleccionado] = Number(monto);

  await updateDoc(docRef, { pagos: pagos });

  alert("Pago guardado correctamente");

  alumnoActualData.pagos = pagos;
  mostrarPagosRegistrados(pagos);
  cargarBotonesMeses(pagos);
  document.getElementById("montoPago").value = "";
};