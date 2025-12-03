const adminPassword = '1234';

function login(){
    const pass = document.getElementById('adminPass').value;
    if(pass === adminPassword){
        document.getElementById('adminPanel').style.display = 'block';
    } else {
        alert('Código incorrecto');
    }
}

function registrarAlumno(){
    const nombre = document.getElementById('nombre').value;
    const familiar = document.getElementById('familiar').value;
    const grado = document.getElementById('grado').value;
    const maestro = document.getElementById('maestro').value;

    if(nombre && familiar && grado && maestro){
        let alumnos = JSON.parse(localStorage.getItem('alumnos')) || [];
        alumnos.push({nombre, familiar, grado, maestro, pagos:{}});
        localStorage.setItem('alumnos', JSON.stringify(alumnos));
        mostrarAlumnos();
    } else {
        alert('Complete todos los campos');
    }
}

function mostrarAlumnos(){
    let alumnos = JSON.parse(localStorage.getItem('alumnos')) || [];
    const lista = document.getElementById('listaAlumnos');
    if(lista){
        lista.innerHTML = '';
        alumnos.forEach((alumno, index)=>{
            const li = document.createElement('li');
            li.textContent = alumno.nombre + ' - ' + alumno.grado;
            lista.appendChild(li);
        });
    }
}

function cargarTabla(){
    let alumnos = JSON.parse(localStorage.getItem('alumnos')) || [];
    const tbody = document.querySelector('#tablaPagos tbody');
    if(tbody){
        tbody.innerHTML = '';
        alumnos.forEach(alumno=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${alumno.nombre}</td><td>${alumno.familiar}</td><td>${alumno.grado}</td><td>${alumno.maestro}</td>`;
            for(let mes of ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']){
                tr.innerHTML += `<td>${alumno.pagos[mes] ? '✔ L.'+alumno.pagos[mes] : '✖'}</td>`;
            }
            tbody.appendChild(tr);
        });
    }
}

window.onload = ()=>{
    mostrarAlumnos();
    cargarTabla();
};
