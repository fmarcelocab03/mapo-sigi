// ==================== CONFIGURACIÓN SUPABASE ====================
const SUPABASE_URL = 'https://kwgdaetnsefhoprakapa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rBIInbq1ggdVz9SoNbhw3Q_ZoQb2x4o';

var supabase;   // ← única declaración

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase inicializado correctamente.');
} catch (error) {
    console.error('Error al inicializar Supabase:', error);
}
function closeAllPanels() {
    dashboardOverlay.style.display = 'none';
    clienteOverlay.style.display = 'none';
}
// ==================== ESTADO GLOBAL ====================
let currentUser = null;
let currentUserRole = null;
// ==================== DOM ELEMENTS ====================
const btnClientePanel = document.getElementById('btnClientePanel');
const clienteOverlay = document.getElementById('clienteOverlay');
const clienteContent = document.getElementById('clienteContent');
const formModalOverlay = document.getElementById('formModalOverlay');
const formModalTitle = document.getElementById('formModalTitle');
const formModalForm = document.getElementById('formModalForm');
const formModalMessage = document.getElementById('formModalMessage');
const mainNav = document.getElementById('mainNav');
const btnOpenLogin = document.getElementById('btnOpenLogin');
const btnOpenRegister = document.getElementById('btnOpenRegister');
const btnDashboard = document.getElementById('btnDashboard');
const btnLogout = document.getElementById('btnLogout');
const modalOverlay = document.getElementById('modalOverlay');
const btnCloseModal = document.getElementById('btnCloseModal');
const formLogin = document.getElementById('formLogin');
const formRegister = document.getElementById('formRegister');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const dashboardOverlay = document.getElementById('dashboardOverlay');
const btnCloseDashboard = document.getElementById('btnCloseDashboard');
const dashboardContent = document.getElementById('dashboardContent');
const dashboardUserName = document.getElementById('dashboardUserName');
const availabilitySection = document.getElementById('availabilitySection');
const availabilityGrid = document.getElementById('availabilityGrid');
const availabilityTitle = document.getElementById('availabilityTitle');
const btnCloseAvailability = document.getElementById('btnCloseAvailability');

// ==================== NAVEGACIÓN ENTRE SECCIONES ====================
document.querySelectorAll('.header__nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
        // Activar link
        document.querySelectorAll('.header__nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    });
});

// ==================== MODAL DE LOGIN/REGISTRO ====================
function openModal(tab = 'login') {
    modalOverlay.style.display = 'flex';
    document.querySelector('.modal__tab[data-tab="login"]').classList.toggle('active', tab === 'login');
    document.querySelector('.modal__tab[data-tab="register"]').classList.toggle('active', tab === 'register');
    formLogin.style.display = tab === 'login' ? 'flex' : 'none';
    formRegister.style.display = tab === 'register' ? 'flex' : 'none';
}

function closeModal() {
    modalOverlay.style.display = 'none';
}

btnOpenLogin.addEventListener('click', () => openModal('login'));
btnOpenRegister.addEventListener('click', () => openModal('register'));
document.getElementById('btnHeroLogin').addEventListener('click', () => openModal('login')); // <-- añade aquí
btnCloseModal.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Cambio de pestañas dentro del modal
document.querySelectorAll('.modal__tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        openModal(tabName);
    });
});

// ==================== AUTENTICACIÓN CON SUPABASE ====================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!supabase) {
        loginMessage.textContent = 'Error: Supabase no está configurado.';
        loginMessage.style.color = 'red';
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.color = 'red';
    } else {
        loginMessage.textContent = 'Inicio de sesión exitoso.';
        loginMessage.style.color = 'green';
        currentUser = data.user;
        updateUIForLoggedInUser();
        closeModal();
    }
});

formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        registerMessage.textContent = 'Las contraseñas no coinciden.';
        registerMessage.style.color = 'red';
        return;
    }

    if (!supabase) {
        registerMessage.textContent = 'Error: Supabase no está configurado.';
        registerMessage.style.color = 'red';
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                phone: phone
            }
        }
    });

    if (error) {
        registerMessage.textContent = error.message;
        registerMessage.style.color = 'red';
    } else {
        registerMessage.textContent = 'Cuenta creada exitosamente. Revisa tu correo para confirmar.';
        registerMessage.style.color = 'green';
        // Opcional: guardar datos adicionales en tabla 'profiles' usando supabase.from('profiles').insert(...)
        setTimeout(() => openModal('login'), 2000);
    }
});
async function fetchUserRole(userId) {
    const { data, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .single();
    if (error) {
        console.error('Error al obtener rol:', error);
        return null;
    }
    return data?.rol || null;
}
// ==================== UI SEGÚN SESIÓN ====================
async function updateUIForLoggedInUser() {
    btnOpenLogin.style.display = 'none';
    btnOpenRegister.style.display = 'none';
    btnLogout.style.display = 'inline-flex';

    if (currentUser) {
        if (!currentUserRole) currentUserRole = await fetchUserRole(currentUser.id);
        dashboardUserName.textContent = currentUser.email;

        if (currentUserRole === 'administrador' || currentUserRole === 'personal') {
            btnDashboard.style.display = 'inline-flex';
            btnClientePanel.style.display = 'none';
        } else {
            btnDashboard.style.display = 'none';
            btnClientePanel.style.display = 'inline-flex';
        }
    }
}

function updateUIForLoggedOutUser() {
    btnOpenLogin.style.display = 'inline-flex';
    btnOpenRegister.style.display = 'inline-flex';
    btnDashboard.style.display = 'none';
    btnClientePanel.style.display = 'none';    // <-- añade esta línea
    btnLogout.style.display = 'none';
    currentUser = null;
    dashboardOverlay.style.display = 'none';
    clienteOverlay.style.display = 'none';     // <-- añade esta línea
    currentUserRole = null;
}

btnLogout.addEventListener('click', async () => {
    if (supabase) await supabase.auth.signOut();
    updateUIForLoggedOutUser();
});

// Verificar sesión al cargar
async function checkSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        currentUserRole = await fetchUserRole(currentUser.id);
        updateUIForLoggedInUser();
    }
}
checkSession();
async function actualizarEstadoEdificios() {
    const edificios = [
        { id: 'a1111111-1111-1111-1111-111111111111', selector: '[data-building="edificio-marcelo"]' },
        { id: 'b2222222-2222-2222-2222-222222222222', selector: '[data-building="los-fresnos-i"]' }
    ];

    for (const ed of edificios) {
        const { count: disponibles, error } = await supabase
            .from('departamentos')
            .select('*', { count: 'exact', head: true })
            .eq('edificio_id', ed.id)
            .eq('estado', 'disponible');

        if (error) {
            console.error(`Error al consultar disponibilidad para ${ed.id}:`, error);
            continue;
        }

        const tarjeta = document.querySelector(ed.selector);
        if (!tarjeta) continue;

        const statusDiv = tarjeta.querySelector('.building-card__status');
        const indicator = statusDiv.querySelector('.status-indicator');
        const texto = statusDiv.querySelector('span:last-child');

        if (disponibles === 0) {
            indicator.style.background = '#e53e3e';  // rojo
            texto.textContent = 'Departamentos no disponibles';
        } else {
            indicator.style.background = '#16a34a';  // verde
            texto.textContent = 'Departamentos disponibles';
        }
    }
}

// Llamar a la función al cargar la página (después de verificar sesión, no requiere autenticación)
actualizarEstadoEdificios();
// ==================== DASHBOARD ====================
btnDashboard.addEventListener('click', () => {
    dashboardOverlay.style.display = 'flex';
    loadDashboardTab('resumen');
});

btnCloseDashboard.addEventListener('click', () => {
    dashboardOverlay.style.display = 'none';
});

// Navegación dentro del dashboard
document.querySelectorAll('.dashboard__nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.dashboard__nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const tab = item.getAttribute('data-dashboard-tab');
        loadDashboardTab(tab);
    });
});

async function loadDashboardTab(tab) {
    if (!dashboardContent) return;
    dashboardContent.innerHTML = '<p style="padding:2rem;">Cargando datos...</p>';

    let html = '';

    try {
        switch(tab) {
            

            case 'clientes': {
    const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .order('creado_en', { ascending: false });
    if (error) throw error;

    html = `<h2>👥 Clientes Registrados <button class="btn btn--primary" style="float:right;" onclick="agregarCliente()">+ Nuevo Cliente</button></h2>`;
    if (!clientes || clientes.length === 0) {
        html += '<p>No hay clientes registrados.</p>';
    } else {
        html += `<table class="data-table">
            <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Acciones</th></tr>
            ${clientes.map(c => `
                <tr>
                    <td>${c.nombre_completo}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.telefono || '-'}</td>
                    <td class="action-btns">
                        <button class="edit-btn" onclick="editarCliente('${c.id}')">Editar</button>
                        <button class="delete-btn" onclick="eliminarCliente('${c.id}')">Eliminar</button>
                    </td>
                </tr>`).join('')}
        </table>`;
    }
    break;
}
            case 'resumen': {
    const [
        deptosTotalRes,
        deptosDisponiblesRes,
        deptosOcupadosRes,
        pagosRes,
        reservasAirbnbRes,
        reservasPendientesRes,
        clientesRes,
        reservasConfirmadasRes
    ] = await Promise.all([
        supabase.from('departamentos').select('*', { count: 'exact', head: true }),
        supabase.from('departamentos').select('*', { count: 'exact', head: true }).eq('estado', 'disponible'),
        supabase.from('departamentos').select('*', { count: 'exact', head: true }).neq('estado', 'disponible'),
        supabase.from('pagos').select('monto').gte('fecha_pago', '2026-07-01').lte('fecha_pago', '2026-07-31'),
        supabase.from('reservas').select('monto_total').eq('estado', 'confirmada').gte('fecha_entrada', '2026-07-01').lte('fecha_entrada', '2026-07-31'),
        supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('estado', 'confirmada')
    ]);

    // Obtener perfil del administrador actual
    const perfilRes = await supabase.from('perfiles').select('*').eq('id', currentUser.id).single();
    const adminPerfil = perfilRes.data || {};

    const totalDeptos = deptosTotalRes.count || 0;
    const disponibles = deptosDisponiblesRes.count || 0;
    const ocupados = deptosOcupadosRes.count || 0;
    const ingresosAlquiler = pagosRes.data || [];
    const ingresosAirbnb = reservasAirbnbRes.data || [];
    const reservasPendientes = reservasPendientesRes.count || 0;
    const totalClientes = clientesRes.count || 0;
    const reservasConfirmadas = reservasConfirmadasRes.count || 0;

    const totalAlquiler = ingresosAlquiler.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalAirbnb = ingresosAirbnb.reduce((sum, r) => sum + parseFloat(r.monto_total), 0);
    const totalIngresos = totalAlquiler + totalAirbnb;
    const tasaOcupacion = totalDeptos ? ((ocupados / totalDeptos) * 100).toFixed(1) : 0;

    // Datos para la ojiva (simulación de meses anteriores)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
    const ingresosBase = [18000, 1800, 10000, 12000, 11000, 14000, 14460];
    const acumulado = [];
    ingresosBase.reduce((acc, val, i) => {
        acumulado[i] = acc + val;
        return acumulado[i];
    }, 0);

    html = `
        <!-- Perfil del administrador -->
        <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:1.5rem; margin-bottom:1.8rem; display:flex; align-items:center; gap:1.5rem;">
            <img src="${adminPerfil.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}" 
                 alt="Avatar" 
                 style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:3px solid var(--color-accent);">
            <div>
                <h3 style="color:#1a365d; margin-bottom:0.2rem;">👤 ${adminPerfil.nombre_completo || currentUser.email}</h3>
                <p style="color:#718096; font-size:0.9rem;">Administrador</p>
            </div>
        </div>

        <h2 style="color:#1a365d; margin-bottom:1.8rem;">📊 Resumen General – Julio 2026</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1.2rem; margin-bottom:2rem;">
            <div style="background:linear-gradient(135deg, #ebf8ff 0%, #cce5ff 100%); padding:1.5rem; border-radius:16px; border:1px solid #bee3f8;">
                <div style="font-size:0.9rem; color:#2c5282;">🏢 Total Deptos</div>
                <div style="font-size:2.5rem; font-weight:800; color:#1a365d;">${totalDeptos}</div>
                <div style="font-size:0.85rem; color:#2c5282;">${disponibles} disponibles</div>
            </div>
            <div style="background:linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%); padding:1.5rem; border-radius:16px; border:1px solid #9ae6b4;">
                <div style="font-size:0.9rem; color:#22543d;">📈 Ocupación</div>
                <div style="font-size:2.5rem; font-weight:800; color:#1a365d;">${tasaOcupacion}%</div>
                <div style="font-size:0.85rem; color:#22543d;">${ocupados} ocupados</div>
            </div>
            <div style="background:linear-gradient(135deg, #fffaf0 0%, #fefcbf 100%); padding:1.5rem; border-radius:16px; border:1px solid #f6e05e;">
                <div style="font-size:0.9rem; color:#744210;">💰 Ingresos Totales</div>
                <div style="font-size:2.5rem; font-weight:800; color:#1a365d;">S/. ${totalIngresos.toLocaleString()}</div>
                <div style="font-size:0.85rem; color:#744210;">Alquiler: S/. ${totalAlquiler.toLocaleString()}</div>
                <div style="font-size:0.85rem; color:#744210;">Airbnb: S/. ${totalAirbnb.toLocaleString()}</div>
            </div>
            <div style="background:linear-gradient(135deg, #faf5ff 0%, #e9d8fd 100%); padding:1.5rem; border-radius:16px; border:1px solid #d6bcfa;">
                <div style="font-size:0.9rem; color:#44337a;">👥 Clientes</div>
                <div style="font-size:2.5rem; font-weight:800; color:#1a365d;">${totalClientes}</div>
                <div style="font-size:0.85rem; color:#44337a;">Registrados</div>
            </div>
        </div>

        <!-- Tabla de ingresos mensuales -->
        <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:1.5rem; margin-bottom:2rem;">
            <h3 style="color:#1a365d; margin-bottom:1rem;">📋 Ingresos Mensuales (Acumulado)</h3>
            <div style="overflow-x:auto;">
                <table class="data-table" style="margin-top:0;">
                    <thead>
                        <tr><th>Mes</th><th>Ingreso (S/.)</th><th>Acumulado (S/.)</th></tr>
                    </thead>
                    <tbody>
                        ${meses.map((m, i) => `
                            <tr>
                                <td>${m}</td>
                                <td>S/. ${ingresosBase[i].toLocaleString()}</td>
                                <td><strong>S/. ${acumulado[i].toLocaleString()}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Gráficos -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:1.5rem;">
                <h3 style="color:#1a365d; margin-bottom:1rem;">📈 Ojiva de Ingresos Acumulados</h3>
                <canvas id="ojivaChart" width="400" height="250"></canvas>
            </div>
            <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:1.5rem;">
                <h3 style="color:#1a365d; margin-bottom:1rem;">🥧 Distribución de Ingresos (Julio)</h3>
                <canvas id="pieChart" width="400" height="250"></canvas>
            </div>
        </div>

        <!-- Estado de reservas -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:1.2rem; margin-top:2rem;">
            <div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:1.5rem;">
                <h3 style="font-size:1.1rem; color:#1a365d; margin-bottom:1rem;">📅 Estado de Reservas</h3>
                <div style="display:flex; justify-content:space-around; text-align:center;">
                    <div>
                        <div style="font-size:1.8rem; font-weight:700; color:#d69e2e;">${reservasPendientes}</div>
                        <div style="font-size:0.8rem; color:#718096;">Pendientes</div>
                    </div>
                    <div>
                        <div style="font-size:1.8rem; font-weight:700; color:#38a169;">${reservasConfirmadas}</div>
                        <div style="font-size:0.8rem; color:#718096;">Confirmadas</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    dashboardContent.innerHTML = html;

    // Gráficos (se inicializan después de pintar el DOM)
    setTimeout(() => {
        const ctxOjiva = document.getElementById('ojivaChart')?.getContext('2d');
        if (ctxOjiva) {
            new Chart(ctxOjiva, {
                type: 'line',
                data: {
                    labels: meses,
                    datasets: [{
                        label: 'Ingresos Acumulados (S/.)',
                        data: acumulado,
                        borderColor: '#2c5282',
                        backgroundColor: 'rgba(44, 82, 130, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#d69e2e',
                        pointBorderColor: '#1a365d',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Soles (S/.)' } }
                    }
                }
            });
        }

        const ctxPie = document.getElementById('pieChart')?.getContext('2d');
        if (ctxPie && totalIngresos > 0) {
            new Chart(ctxPie, {
                type: 'pie',
                data: {
                    labels: ['Alquiler', 'Airbnb'],
                    datasets: [{
                        data: [totalAlquiler, totalAirbnb],
                        backgroundColor: ['#2c5282', '#d69e2e'],
                        borderColor: 'white',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } else if (ctxPie) {
            ctxPie.font = '16px sans-serif';
            ctxPie.fillStyle = '#718096';
            ctxPie.textAlign = 'center';
            ctxPie.fillText('Sin datos de ingresos', 200, 125);
        }
    }, 100);
    break;
}

            case 'departamentos': {
                const { data: deptos, error } = await supabase
                    .from('departamentos')
                    .select('*, edificios(nombre)')
                    .order('edificio_id')
                    .order('piso');

                if (error) throw error;

                html = `
                    <h2>🏢 Lista de Departamentos</h2>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px,1fr)); gap:1rem; margin-top:1rem;">
                        ${deptos.map(d => `
                            <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:1rem;">
                                <strong>${d.edificios?.nombre || 'Edificio'}</strong>
                                <p>Depto ${d.numero} – Piso ${d.piso}</p>
                                <p>🛏️ ${d.dormitorios} | 🛁 ${d.banos}</p>
                                <p>Estado: <span style="color:${d.estado === 'disponible' ? 'green' : 'red'}">${d.estado}</span></p>
                                <p>Venta: ${d.precio_venta ? '$'+Number(d.precio_venta).toLocaleString() : 'N/A'}</p>
                                <p>Alquiler: ${d.precio_alquiler_mensual ? 'S/.'+d.precio_alquiler_mensual : 'N/A'}</p>
                                <p>Airbnb/día: ${d.precio_airbnb_diario ? 'S/.'+d.precio_airbnb_diario : 'N/A'}</p>
                            </div>
                        `).join('')}
                    </div>`;
                break;
            }

            case 'reservas': {
                const { data: reservas, error } = await supabase
                    .from('reservas')
                    .select('*, clientes(nombre_completo), departamentos(numero, edificios(nombre))')
                    .order('fecha_entrada', { ascending: false })
                    .limit(20);

                if (error) throw error;

                if (!reservas || reservas.length === 0) {
                    html = '<h2>📅 Reservas</h2><p>No hay reservas registradas.</p>';
                } else {
                    html = `
                        <h2>📅 Últimas Reservas</h2>
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse:collapse; margin-top:1rem;">
                                <thead>
                                    <tr style="background:#1a365d; color:white;">
                                        <th style="padding:0.7rem;">Cliente</th>
                                        <th>Departamento</th>
                                        <th>Entrada</th>
                                        <th>Salida</th>
                                        <th>Huéspedes</th>
                                        <th>Estado</th>
                                        <th>Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reservas.map(r => `
                                        <tr style="border-bottom:1px solid #e2e8f0;">
                                            <td style="padding:0.5rem;">${r.clientes?.nombre_completo || 'N/A'}</td>
                                            <td>${r.departamentos?.numero || 'N/A'} (${r.departamentos?.edificios?.nombre || ''})</td>
                                            <td>${r.fecha_entrada}</td>
                                            <td>${r.fecha_salida}</td>
                                            <td>${r.huespedes}</td>
                                            <td style="color:${r.estado === 'confirmada' ? 'green' : 'orange'}">${r.estado}</td>
                                            <td>${r.monto_total ? 'S/.'+r.monto_total : '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>`;
                }
                break;
            }

            case 'reportes': {
    // Obtener fecha de inicio y fin de la semana actual (lunes a domingo)
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0=dom, 1=lun,...
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    
    const inicioSemana = lunes.toISOString().split('T')[0];
    const finSemana = domingo.toISOString().split('T')[0];

    // Consultar pagos de la semana
    const { data: pagosSemana, error: errorPagos } = await supabase
        .from('pagos')
        .select('monto, fecha_pago, metodo')
        .gte('fecha_pago', inicioSemana)
        .lte('fecha_pago', finSemana);

    // Consultar reservas de la semana (airbnb)
    const { data: reservasSemana, error: errorReservas } = await supabase
        .from('reservas')
        .select('monto_total, fecha_entrada, estado')
        .gte('fecha_entrada', inicioSemana)
        .lte('fecha_entrada', finSemana)
        .eq('estado', 'confirmada');

    // Datos diarios simulados para la semana (si no hay datos reales suficientes)
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Inicializar ingresos por día
    const ingresosPorDia = new Array(7).fill(0);
    
    // Procesar pagos reales
    if (pagosSemana && pagosSemana.length > 0) {
        pagosSemana.forEach(p => {
            const fecha = new Date(p.fecha_pago);
            const diaIndex = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1; // ajustar a lunes=0
            if (diaIndex >= 0 && diaIndex < 7) {
                ingresosPorDia[diaIndex] += parseFloat(p.monto);
            }
        });
    }
    
    // Procesar reservas airbnb reales
    if (reservasSemana && reservasSemana.length > 0) {
        reservasSemana.forEach(r => {
            const fecha = new Date(r.fecha_entrada);
            const diaIndex = fecha.getDay() === 0 ? 6 : fecha.getDay() - 1;
            if (diaIndex >= 0 && diaIndex < 7) {
                ingresosPorDia[diaIndex] += parseFloat(r.monto_total);
            }
        });
    }

    // Si no hay datos reales, usar datos de ejemplo basados en los pagos de julio
    if (ingresosPorDia.every(v => v === 0)) {
        // Simulación con datos proporcionales
        const totalJulio = 12300 + 1080; // alquileres + airbnb de julio
        const diarioPromedio = Math.round(totalJulio / 30);
        ingresosPorDia[0] = diarioPromedio * 1.2; // lunes
        ingresosPorDia[1] = diarioPromedio * 0.8;
        ingresosPorDia[2] = diarioPromedio * 1.5;
        ingresosPorDia[3] = diarioPromedio * 1.1;
        ingresosPorDia[4] = diarioPromedio * 2.0;
        ingresosPorDia[5] = diarioPromedio * 0.6;
        ingresosPorDia[6] = diarioPromedio * 0.3;
    }

    const totalSemana = ingresosPorDia.reduce((a, b) => a + b, 0);
    const mejorDia = Math.max(...ingresosPorDia);
    const mejorDiaIndex = ingresosPorDia.indexOf(mejorDia);

    html = `
        <div style="max-width:1000px; margin:0 auto;">
            <!-- Encabezado de la semana -->
            <div style="background:linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius:16px; padding:1.5rem 2rem; margin-bottom:2rem; color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div>
                        <h2 style="font-size:1.8rem; margin-bottom:0.3rem;">📈 Reporte Semanal</h2>
                        <p style="opacity:0.9; font-size:0.95rem;">${diasSemana[0]} ${inicioSemana.split('-')[2]} - ${diasSemana[6]} ${finSemana.split('-')[2]} de ${hoy.toLocaleString('es', { month: 'long'})}</p>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:2.2rem; font-weight:800;">S/. ${totalSemana.toLocaleString('es-PE', {minimumFractionDigits: 0})}</div>
                        <div style="opacity:0.8;">Total de la semana</div>
                    </div>
                </div>
            </div>

            <!-- Tarjetas de métricas -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
                <div style="background:white; border-radius:14px; padding:1.3rem; border-left:4px solid #38a169; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="font-size:0.85rem; color:#718096; margin-bottom:0.3rem;">💰 Promedio Diario</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#1a365d;">S/. ${Math.round(totalSemana/7).toLocaleString()}</div>
                </div>
                <div style="background:white; border-radius:14px; padding:1.3rem; border-left:4px solid #d69e2e; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="font-size:0.85rem; color:#718096; margin-bottom:0.3rem;">⭐ Mejor Día</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#1a365d;">${diasSemana[mejorDiaIndex]}</div>
                    <div style="font-size:0.85rem; color:#38a169;">S/. ${mejorDia.toLocaleString()}</div>
                </div>
                <div style="background:white; border-radius:14px; padding:1.3rem; border-left:4px solid #3182ce; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="font-size:0.85rem; color:#718096; margin-bottom:0.3rem;">📊 Transacciones</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#1a365d;">${(pagosSemana?.length || 0) + (reservasSemana?.length || 0)}</div>
                </div>
                <div style="background:white; border-radius:14px; padding:1.3rem; border-left:4px solid #805ad5; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="font-size:0.85rem; color:#718096; margin-bottom:0.3rem;">🏠 Airbnb</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#1a365d;">${reservasSemana?.length || 0} reservas</div>
                </div>
            </div>

            <!-- Gráfico de barras semanal -->
            <div style="background:white; border-radius:16px; padding:1.8rem; margin-bottom:2rem; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <h3 style="color:#1a365d; margin-bottom:1.5rem;">📊 Ingresos Diarios</h3>
                <div style="height:250px;">
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>

            <!-- Tabla detallada -->
            <div style="background:white; border-radius:16px; padding:1.8rem; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                <h3 style="color:#1a365d; margin-bottom:1.5rem;">📋 Desglose por Día</h3>
                <div style="overflow-x:auto;">
                    <table class="data-table" style="margin-top:0;">
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Fecha</th>
                                <th>Ingresos</th>
                                <th>Progreso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${diasSemana.map((dia, i) => {
                                const fecha = new Date(lunes);
                                fecha.setDate(lunes.getDate() + i);
                                const fechaStr = fecha.toISOString().split('T')[0];
                                const porcentaje = totalSemana > 0 ? Math.round((ingresosPorDia[i] / totalSemana) * 100) : 0;
                                const barraColor = ingresosPorDia[i] === mejorDia ? '#d69e2e' : '#2c5282';
                                return `
                                    <tr>
                                        <td style="font-weight:600;">${dia}</td>
                                        <td>${fechaStr.split('-')[2]}/${fechaStr.split('-')[1]}</td>
                                        <td style="font-weight:700;">S/. ${ingresosPorDia[i].toLocaleString()}</td>
                                        <td style="width:40%;">
                                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                                <div style="flex:1; height:8px; background:#edf2f7; border-radius:4px; overflow:hidden;">
                                                    <div style="width:${porcentaje}%; height:100%; background:${barraColor}; border-radius:4px; transition:width 0.3s;"></div>
                                                </div>
                                                <span style="font-size:0.85rem; font-weight:600; min-width:35px;">${porcentaje}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    dashboardContent.innerHTML = html;

    // Inicializar gráfico de barras después de pintar el DOM
    setTimeout(() => {
        const ctx = document.getElementById('weeklyChart')?.getContext('2d');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: diasSemana,
                    datasets: [{
                        label: 'Ingresos (S/.)',
                        data: ingresosPorDia,
                        backgroundColor: [
                            'rgba(44, 82, 130, 0.7)',
                            'rgba(44, 82, 130, 0.7)',
                            'rgba(44, 82, 130, 0.7)',
                            'rgba(44, 82, 130, 0.7)',
                            'rgba(44, 82, 130, 0.7)',
                            'rgba(214, 158, 46, 0.7)',
                            'rgba(214, 158, 46, 0.7)'
                        ],
                        borderColor: [
                            '#2c5282', '#2c5282', '#2c5282', '#2c5282', '#2c5282',
                            '#d69e2e', '#d69e2e'
                        ],
                        borderWidth: 1,
                        borderRadius: 6,
                        hoverBackgroundColor: '#d69e2e'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { callback: (val) => 'S/. ' + val }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }, 150);
    break;
}

            default:
                html = '<p>Selecciona una opción del menú.</p>';
        }
    } catch (err) {
        console.error('Error en dashboard:', err);
        html = `<p style="color:red;">Error al cargar los datos: ${err.message}</p>`;
    }

    dashboardContent.innerHTML = html;
}
async function agregarCliente() {
    openFormModal('Nuevo Cliente', [
        { name: 'nombre_completo', label: 'Nombre completo', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'telefono', label: 'Teléfono' }
    ], async (data) => {
        console.log('Datos a insertar:', data);   // <-- añade esto
        const { error } = await supabase.from('clientes').insert(data);
        if (error) { alert(error.message); return; }
        loadDashboardTab('clientes');
    });
}

async function editarCliente(id) {
    // Obtener los datos actuales del cliente
    const { data: cliente, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Error al obtener cliente: ' + error.message);
        return;
    }

    openFormModal('Editar Cliente', [
        { name: 'nombre_completo', label: 'Nombre completo', required: true, value: cliente.nombre_completo },
        { name: 'email', label: 'Email', type: 'email', value: cliente.email || '' },
        { name: 'telefono', label: 'Teléfono', value: cliente.telefono || '' },
        { name: 'tipo_documento', label: 'Tipo documento', value: cliente.tipo_documento || 'DNI' },
        { name: 'numero_documento', label: 'Número documento', value: cliente.numero_documento || '' }
    ], async (data) => {
        const { error } = await supabase
            .from('clientes')
            .update({
                nombre_completo: data.nombre_completo,
                email: data.email,
                telefono: data.telefono,
                tipo_documento: data.tipo_documento,
                numero_documento: data.numero_documento
            })
            .eq('id', id);

        if (error) {
            alert('Error al actualizar: ' + error.message);
        } else {
            loadDashboardTab('clientes'); // recargar la tabla
        }
    });
}
async function eliminarCliente(id) {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadDashboardTab('clientes');
}
// ==================== PANEL DEL CLIENTE ====================
btnClientePanel.addEventListener('click', () => {
    closeAllPanels();
    clienteOverlay.style.display = 'flex';
    loadClienteTab('perfil');
});
document.getElementById('btnCloseCliente').addEventListener('click', () => {
    clienteOverlay.style.display = 'none';
});

document.querySelectorAll('.cliente-panel__nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.cliente-panel__nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        loadClienteTab(item.dataset.clienteTab);
    });
});

// Función para cargar pestañas del cliente
async function loadClienteTab(tab) {
    if (!clienteContent) return;
    clienteContent.innerHTML = '<p>Cargando...</p>';

    // Buscar el cliente asociado al perfil del usuario actual
    const { data: clienteData } = await supabase
        .from('clientes')
        .select('id')
        .eq('perfil_id', currentUser.id)
        .single();
    const clienteId = clienteData?.id;

    let html = '';
    if (!clienteId) {
        html = '<p>No tienes un perfil de cliente asociado. Contacta con un administrador.</p>';
        clienteContent.innerHTML = html;
        return;
    }

    switch(tab) {
        case 'perfil':
            const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', currentUser.id).single();
            html = `<h2>Mi Perfil</h2>
                <p><strong>Nombre:</strong> ${perfil.nombre_completo}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Teléfono:</strong> ${perfil.telefono || 'No registrado'}</p>`;
            break;
        case 'reservas':
            const { data: reservas } = await supabase.from('reservas').select('*, departamentos(numero, edificios(nombre))').eq('cliente_id', clienteId).order('fecha_entrada', { ascending: false });
            if (!reservas || reservas.length === 0) {
                html = '<h2>Mis Reservas</h2><p>No tienes reservas.</p>';
            } else {
                html = `<h2>Mis Reservas</h2>
                <table class="data-table">
                    <tr><th>Depto</th><th>Entrada</th><th>Salida</th><th>Estado</th></tr>
                    ${reservas.map(r => `
                        <tr>
                            <td>${r.departamentos?.numero || 'N/A'} (${r.departamentos?.edificios?.nombre || ''})</td>
                            <td>${r.fecha_entrada}</td>
                            <td>${r.fecha_salida}</td>
                            <td>${r.estado}</td>
                        </tr>`).join('')}
                </table>`;
            }
            break;
        case 'pagos':
            const { data: pagos } = await supabase.from('pagos').select('*').eq('cliente_id', clienteId).order('fecha_pago', { ascending: false });
            if (!pagos || pagos.length === 0) {
                html = '<h2>Mis Pagos</h2><p>No hay pagos registrados.</p>';
            } else {
                html = `<h2>Mis Pagos</h2>
                <table class="data-table">
                    <tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Estado</th></tr>
                    ${pagos.map(p => `
                        <tr>
                            <td>${p.fecha_pago}</td>
                            <td>S/. ${p.monto}</td>
                            <td>${p.metodo}</td>
                            <td>${p.estado}</td>
                        </tr>`).join('')}
                </table>`;
            }
            break;
    }
    clienteContent.innerHTML = html;
}
// ==================== MODAL GENÉRICO PARA FORMULARIOS ====================
function openFormModal(title, fields, onSubmit) {
    console.log('openFormModal llamada con título:', title);
    formModalTitle.textContent = title;
    formModalForm.innerHTML = fields.map(f => `
        <div class="form__group">
            <label>${f.label}</label>
            <input type="${f.type || 'text'}" id="${f.name}" placeholder="${f.placeholder || ''}" value="${f.value || ''}" ${f.required ? 'required' : ''}>
        </div>
    `).join('') + `
        <div class="form__actions">
            <button type="button" class="btn btn--danger" onclick="document.getElementById('formModalOverlay').style.display='none'">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
        </div>
    `;
    formModalForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = {};
        fields.forEach(f => { data[f.name] = document.getElementById(f.name).value; });
        await onSubmit(data);
        formModalOverlay.style.display = 'none';
    };
    formModalOverlay.style.display = 'flex';
}

document.getElementById('btnCloseFormModal').addEventListener('click', () => {
    formModalOverlay.style.display = 'none';
});
formModalOverlay.addEventListener('click', (e) => {
    if (e.target === formModalOverlay) formModalOverlay.style.display = 'none';
});
// ==================== DISPONIBILIDAD DE EDIFICIOS ====================
document.querySelectorAll('.building-card__btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const building = btn.getAttribute('data-building-btn');
        showAvailability(building);
    });
});

btnCloseAvailability.addEventListener('click', () => {
    availabilitySection.style.display = 'none';
});

async function showAvailability(building) {
    availabilitySection.style.display = 'block';
    
    const edificioId = building === 'edificio-marcelo' 
        ? 'a1111111-1111-1111-1111-111111111111'
        : 'b2222222-2222-2222-2222-222222222222';

    const buildingName = building === 'edificio-marcelo' ? 'Edificio Marcelo' : 'Los Fresnos I';
    availabilityTitle.textContent = `Disponibilidad - ${buildingName}`;

    const { data: departamentos, error } = await supabase
        .from('departamentos')
        .select('*')
        .eq('edificio_id', edificioId)
        .order('piso', { ascending: true });

    if (error) {
        availabilityGrid.innerHTML = `<p>Error al cargar los datos: ${error.message}</p>`;
        return;
    }

    if (!departamentos || departamentos.length === 0) {
        availabilityGrid.innerHTML = '<p>No hay departamentos registrados en este edificio.</p>';
        return;
    }

    availabilityGrid.innerHTML = departamentos.map(d => {
        const estadoColor = d.estado === 'disponible' ? '#38a169' : '#e53e3e';
        const precioVenta = d.precio_venta ? `$${Number(d.precio_venta).toLocaleString()}` : 'No disponible';
        const precioAlquiler = d.precio_alquiler_mensual ? `S/. ${d.precio_alquiler_mensual}` : 'No disponible';
        const precioAirbnb = d.precio_airbnb_diario ? `S/. ${d.precio_airbnb_diario}` : 'No disponible';
        
        return `
            <div class="availability-card">
                <h4>Depto ${d.numero} (Piso ${d.piso})</h4>
                <p>🛏️ ${d.dormitorios} dorm. | 🛁 ${d.banos} baños</p>
                <p><strong>Venta:</strong> ${precioVenta}</p>
                <p><strong>Alquiler mensual:</strong> ${precioAlquiler}</p>
                <p><strong>Airbnb/día:</strong> ${precioAirbnb}</p>
                <span style="display:inline-block; margin-top:8px; padding:4px 12px; border-radius:20px; background:${estadoColor}; color:white; font-weight:600;">
                    ${d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                </span>
            </div>
        `;
    }).join('');

    availabilitySection.scrollIntoView({ behavior: 'smooth' });
}

// ==================== WHATSAPP (ya funcional con el enlace) ====================
// El enlace en el HTML ya abre WhatsApp con el número y mensaje predefinidos.

// ==================== MENÚ MÓVIL (simplificado) ====================
document.getElementById('mobileMenuToggle').addEventListener('click', () => {
    mainNav.style.display = mainNav.style.display === 'flex' ? 'none' : 'flex';
});
// ==================== INTERACTIVIDAD EXTRA ====================

// --- Efecto de aparición al hacer scroll (Reveal on Scroll) ---
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // solo una vez
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});

// Aplica el efecto a las tarjetas de edificios, sección de disponibilidad, etc.
document.addEventListener('DOMContentLoaded', () => {
    // Selecciona elementos que quieres animar al aparecer
    const targets = document.querySelectorAll('.building-card, .availability-card, .buildings__header, .hero__content');
    targets.forEach(el => {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
    });
});

// --- Efecto de clic en los botones (onda) ---
document.querySelectorAll('.btn, .header__btn, .building-card__btn, .hero__btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        // Elimina cualquier onda anterior
        const ripple = this.querySelector('.ripple');
        if (ripple) ripple.remove();
        
        const circle = document.createElement('span');
        const diameter = Math.max(this.clientWidth, this.clientHeight);
        const radius = diameter / 2;
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - this.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${e.clientY - this.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');
        
        this.appendChild(circle);
        
        setTimeout(() => circle.remove(), 600);
    });
});