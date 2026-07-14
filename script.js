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

// ==================== ESTADO GLOBAL ====================
let currentUser = null;

// ==================== DOM ELEMENTS ====================
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

// ==================== UI SEGÚN SESIÓN ====================
function updateUIForLoggedInUser() {
    btnOpenLogin.style.display = 'none';
    btnOpenRegister.style.display = 'none';
    btnDashboard.style.display = 'inline-flex';
    btnLogout.style.display = 'inline-flex';
    if (currentUser) {
        dashboardUserName.textContent = currentUser.email;
    }
}

function updateUIForLoggedOutUser() {
    btnOpenLogin.style.display = 'inline-flex';
    btnOpenRegister.style.display = 'inline-flex';
    btnDashboard.style.display = 'none';
    btnLogout.style.display = 'none';
    currentUser = null;
    dashboardOverlay.style.display = 'none';
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
        updateUIForLoggedInUser();
    }
}
checkSession();

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
            case 'resumen': {
                const { count: totalDeptos } = await supabase
                    .from('departamentos')
                    .select('*', { count: 'exact', head: true });
                
                const { count: disponibles } = await supabase
                    .from('departamentos')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado', 'disponible');

                const { count: totalClientes } = await supabase
                    .from('clientes')
                    .select('*', { count: 'exact', head: true });

                const { count: reservasPendientes } = await supabase
                    .from('reservas')
                    .select('*', { count: 'exact', head: true })
                    .eq('estado', 'pendiente');

                html = `
                    <h2 style="color:#1a365d; margin-bottom:1.5rem;">📊 Resumen General</h2>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:1rem;">
                        <div style="background:#ebf8ff; padding:1.5rem; border-radius:12px;">
                            <h3>🏢 Departamentos Disponibles</h3>
                            <p style="font-size:2rem; font-weight:700;">${disponibles || 0} / ${totalDeptos || 0}</p>
                        </div>
                        <div style="background:#f0fff4; padding:1.5rem; border-radius:12px;">
                            <h3>💰 Ingresos (semana)</h3>
                            <p style="font-size:2rem; font-weight:700;">S/. --</p>
                            <small>(próximamente)</small>
                        </div>
                        <div style="background:#fffaf0; padding:1.5rem; border-radius:12px;">
                            <h3>📅 Reservas Pendientes</h3>
                            <p style="font-size:2rem; font-weight:700;">${reservasPendientes || 0}</p>
                        </div>
                        <div style="background:#faf5ff; padding:1.5rem; border-radius:12px;">
                            <h3>👥 Clientes Registrados</h3>
                            <p style="font-size:2rem; font-weight:700;">${totalClientes || 0}</p>
                        </div>
                    </div>`;
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

            case 'clientes': {
                const { data: clientes, error } = await supabase
                    .from('clientes')
                    .select('*')
                    .order('creado_en', { ascending: false });

                if (error) throw error;

                if (!clientes || clientes.length === 0) {
                    html = '<h2>👥 Clientes</h2><p>No hay clientes registrados.</p>';
                } else {
                    html = `
                        <h2>👥 Clientes Registrados</h2>
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse:collapse; margin-top:1rem;">
                                <thead>
                                    <tr style="background:#1a365d; color:white;">
                                        <th style="padding:0.7rem;">Nombre</th>
                                        <th>Documento</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th>Registrado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${clientes.map(c => `
                                        <tr style="border-bottom:1px solid #e2e8f0;">
                                            <td style="padding:0.5rem;">${c.nombre_completo}</td>
                                            <td>${c.tipo_documento || 'DNI'} ${c.numero_documento || ''}</td>
                                            <td>${c.email || '-'}</td>
                                            <td>${c.telefono || '-'}</td>
                                            <td>${new Date(c.creado_en).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>`;
                }
                break;
            }

            case 'reportes': {
                // Reportes semanales – puedes calcular ocupación o ingresos con consultas agregadas
                html = `
                    <h2>📈 Reportes Semanales</h2>
                    <p>Funcionalidad en desarrollo. Aquí se mostrarán ingresos semanales, ocupación promedio, etc.</p>
                    <div style="margin-top:2rem; background:#f7fafc; padding:1rem; border-radius:12px;">
                        <p>Ejemplo de datos agregados (próximamente):</p>
                        <ul>
                            <li>Ingresos por alquileres: S/. 0</li>
                            <li>Ingresos por Airbnb: S/. 0</li>
                            <li>Ocupación promedio: 0%</li>
                        </ul>
                    </div>`;
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