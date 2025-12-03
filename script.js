function login(){
  const pass = document.getElementById("adminPass").value;
  if(pass === "1234"){ window.location = "admin.html"; }
  else alert("Contraseña incorrecta");
}

function registrarAlumno(){
  const n=document.getElementById("nombre").value;
  const f=document.getElementById("familiar").value;
  const g=document.getElementById("grado").value;
  const t=document.getElementById("telefono").value;

  const alumnos = JSON.parse(localStorage.getItem("alumnos") || "[]");

  alumnos.push({nombre:n,familiar:f,grado:g,telefono:t});
  localStorage.setItem("alumnos", JSON.stringify(alumnos));

  document.getElementById("nombre").value='';
  document.getElementById("familiar").value='';
  document.getElementById("grado").value='';
  document.getElementById("telefono").value='';

  cargarAlumnos();
}

function cargarAlumnos(){
  const alumnos = JSON.parse(localStorage.getItem("alumnos") || "[]");
  const lista = document.getElementById("listaAlumnos");
  if(!lista) return;
  lista.innerHTML = "";
  alumnos.forEach(a=>{
    const li = document.createElement("li");
    li.textContent = a.nombre + " - " + a.grado;
    const btn=document.createElement("button");
    btn.textContent="+ Pago";
    btn.style.marginLeft="10px";
    btn.onclick=()=>abrirPagos();
    li.appendChild(btn);
    lista.appendChild(li);
  });
}

function abrirPagos(){
  document.getElementById("modalPago").style.display="block";
}

function guardarPago(){
  const monto=document.getElementById("pagoMonto").value;
  const mes=document.getElementById("pagoMes").value;

  const pagos = JSON.parse(localStorage.getItem("pagos") || "[]");

  pagos.push({monto,mes,fecha:new Date().toLocaleDateString()});

  localStorage.setItem("pagos", JSON.stringify(pagos));

  alert("Pago registrado");
  document.getElementById("modalPago").style.display="none";
}

window.onload=cargarAlumnos;
