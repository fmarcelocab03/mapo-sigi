-- =============================================
-- ESQUEMA PARA SIGI - MAPO S.A.C.
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- Extensión para UUID (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------
-- 1. TABLA DE EDIFICIOS
-- ---------------------------------------------------
CREATE TABLE public.edificios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT,
    pisos INTEGER NOT NULL CHECK (pisos > 0),
    total_departamentos INTEGER,
    creado_en TIMESTAMPTZ DEFAULT now(),
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.edificios IS 'Edificios de la inmobiliaria (Marcelo y Los Fresnos I)';

-- ---------------------------------------------------
-- 2. TABLA DE DEPARTAMENTOS
-- ---------------------------------------------------
CREATE TABLE public.departamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edificio_id UUID NOT NULL REFERENCES public.edificios(id) ON DELETE RESTRICT,
    numero VARCHAR(10) NOT NULL,               -- ej: 101, 202, etc.
    piso INTEGER NOT NULL,
    area_m2 NUMERIC(6,2),                      -- metros cuadrados
    dormitorios INTEGER DEFAULT 1,
    banos INTEGER DEFAULT 1,
    precio_venta NUMERIC(12,2),                -- precio de venta
    precio_alquiler_mensual NUMERIC(10,2),     -- alquiler mensual
    precio_airbnb_diario NUMERIC(8,2),         -- tarifa diaria tipo Airbnb
    estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'alquilado', 'vendido', 'reservado', 'mantenimiento')),
    descripcion TEXT,
    imagen_url TEXT,                           -- enlace a Supabase Storage
    creado_en TIMESTAMPTZ DEFAULT now(),
    actualizado_en TIMESTAMPTZ DEFAULT now(),
    UNIQUE (edificio_id, numero)               -- no se repite el número en el mismo edificio
);

COMMENT ON TABLE public.departamentos IS 'Departamentos de cada edificio';

-- ---------------------------------------------------
-- 3. TABLA DE PERFILES DE USUARIO (vinculada a auth.users)
-- ---------------------------------------------------
CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    rol VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('administrador', 'personal', 'cliente')),
    avatar_url TEXT,
    creado_en TIMESTAMPTZ DEFAULT now(),
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.perfiles IS 'Datos extendidos de los usuarios autenticados';

-- Función para crear automáticamente el perfil después del registro
CREATE OR REPLACE FUNCTION public.manejar_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre_completo, rol)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'cliente');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función cada vez que se crea un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.manejar_nuevo_usuario();

-- ---------------------------------------------------
-- 4. TABLA DE CLIENTES (no necesariamente usuarios del sistema)
-- ---------------------------------------------------
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL, -- puede estar vinculado a un usuario
    nombre_completo VARCHAR(150) NOT NULL,
    tipo_documento VARCHAR(20) DEFAULT 'DNI',
    numero_documento VARCHAR(20),
    email VARCHAR(100),
    telefono VARCHAR(20),
    direccion TEXT,
    notas TEXT,
    creado_en TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.clientes IS 'Clientes registrados para reservas, alquileres y ventas';

-- ---------------------------------------------------
-- 5. TABLA DE RESERVAS (Reservas tipo Airbnb / alquiler temporal)
-- ---------------------------------------------------
CREATE TABLE public.reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    huespedes INTEGER DEFAULT 1,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
    monto_total NUMERIC(10,2),
    notas TEXT,
    creado_por UUID REFERENCES auth.users(id),   -- quién registró la reserva
    creado_en TIMESTAMPTZ DEFAULT now(),
    actualizado_en TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT rango_fechas_valido CHECK (fecha_salida > fecha_entrada)
);

COMMENT ON TABLE public.reservas IS 'Reservas de hospedaje temporal (Airbnb)';

-- ---------------------------------------------------
-- 6. TABLA DE VENTAS Y PREVENTAS
-- ---------------------------------------------------
CREATE TABLE public.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    tipo_venta VARCHAR(20) DEFAULT 'venta' CHECK (tipo_venta IN ('preventa', 'venta_directa')),
    precio_total NUMERIC(12,2) NOT NULL,
    pago_inicial NUMERIC(12,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'negociacion' CHECK (estado IN ('negociacion', 'separado', 'vendido', 'cancelado')),
    contrato_firmado BOOLEAN DEFAULT false,
    notas TEXT,
    creado_por UUID REFERENCES auth.users(id),
    creado_en TIMESTAMPTZ DEFAULT now(),
    actualizado_en TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.ventas IS 'Registro de ventas y separaciones (preventas)';

-- ---------------------------------------------------
-- 7. TABLA DE CONTRATOS DIGITALES
-- ---------------------------------------------------
CREATE TABLE public.contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
    numero_contrato VARCHAR(50) UNIQUE NOT NULL,
    tipo_contrato VARCHAR(20) CHECK (tipo_contrato IN ('alquiler', 'venta')),
    contenido TEXT,                              -- texto del contrato o ruta al PDF
    archivo_url TEXT,                            -- enlace al archivo en Supabase Storage
    firmado_por_cliente BOOLEAN DEFAULT false,
    fecha_firma DATE,
    creado_en TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT contrato_un_solo_padre CHECK (
        (reserva_id IS NOT NULL AND venta_id IS NULL) OR
        (reserva_id IS NULL AND venta_id IS NOT NULL)
    ) -- Asegura que pertenezca a una reserva O a una venta, no a ambas
);

COMMENT ON TABLE public.contratos IS 'Contratos digitales de alquileres y ventas';

-- ---------------------------------------------------
-- 8. TABLA DE PAGOS
-- ---------------------------------------------------
CREATE TABLE public.pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    venta_id UUID REFERENCES public.ventas(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo VARCHAR(30) CHECK (metodo IN ('efectivo', 'transferencia', 'tarjeta', 'yape', 'plin')),
    estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('pendiente', 'completado', 'fallido')),
    comprobante_url TEXT,                        -- comprobante en Supabase Storage
    notas TEXT,
    creado_en TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.pagos IS 'Registro de pagos de reservas, alquileres y ventas';

-- =============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =============================================
CREATE INDEX idx_departamentos_edificio ON public.departamentos(edificio_id);
CREATE INDEX idx_reservas_departamento ON public.reservas(departamento_id);
CREATE INDEX idx_reservas_cliente ON public.reservas(cliente_id);
CREATE INDEX idx_reservas_fechas ON public.reservas(fecha_entrada, fecha_salida);
CREATE INDEX idx_ventas_departamento ON public.ventas(departamento_id);
CREATE INDEX idx_ventas_cliente ON public.ventas(cliente_id);
CREATE INDEX idx_pagos_reserva ON public.pagos(reserva_id);
CREATE INDEX idx_pagos_venta ON public.pagos(venta_id);
CREATE INDEX idx_contratos_reserva ON public.contratos(reserva_id);
CREATE INDEX idx_contratos_venta ON public.contratos(venta_id);

-- =============================================
-- POLÍTICAS DE SEGURIDAD (RLS) - BÁSICAS
-- =============================================
-- Habilitar RLS en todas las tablas
ALTER TABLE public.edificios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- Ejemplo de políticas (personalizar según necesidades):
-- Permitir lectura a todos los usuarios autenticados en edificios y departamentos
CREATE POLICY "Lectura pública de edificios" ON public.edificios
    FOR SELECT USING (true);

CREATE POLICY "Lectura pública de departamentos" ON public.departamentos
    FOR SELECT USING (true);

-- Para perfiles: cada usuario ve y edita solo su propio perfil
CREATE POLICY "Usuarios ven su propio perfil" ON public.perfiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuarios actualizan su propio perfil" ON public.perfiles
    FOR UPDATE USING (auth.uid() = id);

-- Las políticas de inserción/actualización en otras tablas dependerán de los roles (admin, staff) que definas más adelante.
UPDATE public.perfiles
SET rol = 'administrador'
WHERE id = (SELECT id FROM auth.users WHERE email = 'fmarcelocab03@gmail.com');
-- Solo admin y personal pueden modificar edificios
CREATE POLICY "Admin puede gestionar edificios" ON public.edificios
  FOR ALL USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('administrador', 'personal')));

-- Solo admin puede gestionar departamentos
CREATE POLICY "Admin gestiona departamentos" ON public.departamentos
  FOR ALL USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'administrador'));
  CREATE OR REPLACE FUNCTION public.manejar_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre_completo, rol)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'cliente');
    
    -- Insertar automáticamente en clientes si el rol es cliente
    INSERT INTO public.clientes (perfil_id, nombre_completo, email, telefono)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, NEW.raw_user_meta_data->>'phone');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
UPDATE public.perfiles
SET rol = 'administrador'
WHERE id = '0425294f-79b5-43f4-8e55-0ab32aa5408f';


-- Asegurar que el trigger esté actualizado
CREATE OR REPLACE FUNCTION public.manejar_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre_completo, rol)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'cliente');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.manejar_nuevo_usuario();


-- =============================================
-- INSERCIÓN DE CLIENTES - EDIFICIO MARCELO
-- =============================================

-- Piso 3: Luis Marcelo Caballero
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Luis Marcelo Caballero',
    'DNI',
    '12345678',
    'luis.caballero@example.com',
    '910764005',
    'Edificio Marcelo, Piso 3, Urb. La Merced, Huancayo',
    'Cliente del tercer piso, contacto directo.',
    now()
);

-- Piso 4: Mujer con su hija y su mamá (familia)
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'María Elena Huamán Rojas',
    'DNI',
    '23456789',
    'maria.huaman@example.com',
    '987654321',
    'Edificio Marcelo, Piso 4, Urb. La Merced, Huancayo',
    'Vive con su hija y su madre. Familia de tres personas.',
    now()
);

-- Piso 5: Abogado
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Carlos Alberto Torres Vera',
    'DNI',
    '34567890',
    'carlos.torres@example.com',
    '965432109',
    'Edificio Marcelo, Piso 5, Urb. La Merced, Huancayo',
    'Abogado de profesión, vive solo.',
    now()
);

-- Piso 6: Pool Espinoza Lazo
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Pool Espinoza Lazo',
    'DNI',
    '45678901',
    'pool.espinoza@example.com',
    '930966671',
    'Edificio Marcelo, Piso 6, Urb. La Merced, Huancayo',
    'Cliente del sexto piso, contacto telefónico principal.',
    now()
);

-- =============================================
-- INSERCIÓN DE CLIENTES - EDIFICIO LOS FRESNOS I
-- =============================================

-- Cliente 1: Pareja joven (piso 4)
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Andrea Carolina Quispe Sánchez',
    'DNI',
    '56789012',
    'andrea.quispe@example.com',
    '954321098',
    'Edificio Los Fresnos I, Piso 4, Urb. Alto La Merced, Huancayo',
    'Pareja joven, sin hijos.',
    now()
);

-- Cliente 2: Estudiante universitario (piso 5)
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'José Antonio Ríos Mendoza',
    'DNI',
    '67890123',
    'jose.rios@example.com',
    '945678901',
    'Edificio Los Fresnos I, Piso 5, Urb. Alto La Merced, Huancayo',
    'Estudiante universitario, alquila temporalmente.',
    now()
);

-- Cliente 3: Familia con dos hijos (piso 6)
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Familia Rodríguez Peña',
    'DNI',
    '78901234',
    'rodriguez.familia@example.com',
    '936789012',
    'Edificio Los Fresnos I, Piso 6, Urb. Alto La Merced, Huancayo',
    'Padres y dos hijos menores.',
    now()
);

-- Cliente 4: Comerciante independiente (piso 7)
INSERT INTO public.clientes (id, perfil_id, nombre_completo, tipo_documento, numero_documento, email, telefono, direccion, notas, creado_en)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Miguel Ángel Herrera López',
    'DNI',
    '89012345',
    'miguel.herrera@example.com',
    '927890123',
    'Edificio Los Fresnos I, Piso 7, Urb. Alto La Merced, Huancayo',
    'Comerciante independiente, dueño de una bodega.',
    now()
);



-- =============================================
-- RESERVAS (a partir del 26 de julio de 2026, edificio Los Fresnos I)
-- =============================================

-- Reserva 1: Luis Marcelo Caballero en Depto 401 (2 noches)
INSERT INTO public.reservas (departamento_id, cliente_id, fecha_entrada, fecha_salida, huespedes, estado, monto_total, notas, creado_por, creado_en)
SELECT 
    d.id,
    c.id,
    '2026-07-26',
    '2026-07-28',
    1,
    'confirmada',
    360.00,  -- 2 noches x 180
    'Reserva de corta estancia.',
    (SELECT id FROM auth.users WHERE email = 'fmarcelocab03@gmail.com'),
    now()
FROM public.departamentos d
JOIN public.edificios e ON d.edificio_id = e.id AND e.nombre = 'Los Fresnos I' AND d.numero = '401'
CROSS JOIN public.clientes c
WHERE c.nombre_completo = 'Luis Marcelo Caballero';

-- Reserva 2: María Elena Huamán Rojas en Depto 501 (3 noches)
INSERT INTO public.reservas (departamento_id, cliente_id, fecha_entrada, fecha_salida, huespedes, estado, monto_total, notas, creado_por, creado_en)
SELECT 
    d.id,
    c.id,
    '2026-07-28',
    '2026-07-31',
    2,
    'confirmada',
    540.00,  -- 3 noches x 180
    'Familia de vacaciones.',
    (SELECT id FROM auth.users WHERE email = 'fmarcelocab03@gmail.com'),
    now()
FROM public.departamentos d
JOIN public.edificios e ON d.edificio_id = e.id AND e.nombre = 'Los Fresnos I' AND d.numero = '501'
CROSS JOIN public.clientes c
WHERE c.nombre_completo = 'María Elena Huamán Rojas';

-- Reserva 3: Carlos Alberto Torres Vera en Depto 601 (1 noche)
INSERT INTO public.reservas (departamento_id, cliente_id, fecha_entrada, fecha_salida, huespedes, estado, monto_total, notas, creado_por, creado_en)
SELECT 
    d.id,
    c.id,
    '2026-07-27',
    '2026-07-28',
    1,
    'confirmada',
    180.00,
    'Viaje de negocios.',
    (SELECT id FROM auth.users WHERE email = 'fmarcelocab03@gmail.com'),
    now()
FROM public.departamentos d
JOIN public.edificios e ON d.edificio_id = e.id AND e.nombre = 'Los Fresnos I' AND d.numero = '601'
CROSS JOIN public.clientes c
WHERE c.nombre_completo = 'Carlos Alberto Torres Vera';

-- Reserva 4: Pool Espinoza Lazo en Depto 701 (2 noches)
INSERT INTO public.reservas (departamento_id, cliente_id, fecha_entrada, fecha_salida, huespedes, estado, monto_total, notas, creado_por, creado_en)
SELECT 
    d.id,
    c.id,
    '2026-07-26',
    '2026-07-28',
    1,
    'pendiente',  -- dejamos una pendiente para que el dashboard tenga datos
    360.00,
    'Solicitada por WhatsApp.',
    (SELECT id FROM auth.users WHERE email = 'fmarcelocab03@gmail.com'),
    now()
FROM public.departamentos d
JOIN public.edificios e ON d.edificio_id = e.id AND e.nombre = 'Los Fresnos I' AND d.numero = '701'
CROSS JOIN public.clientes c
WHERE c.nombre_completo = 'Pool Espinoza Lazo';

-- =============================================
-- CONTRATOS (uno por cada reserva)
-- =============================================

-- Contrato para la reserva 1
INSERT INTO public.contratos (reserva_id, numero_contrato, tipo_contrato, contenido, archivo_url, firmado_por_cliente, fecha_firma, creado_en)
SELECT 
    r.id,
    'CTR-2026-001',
    'alquiler',
    'Contrato de alquiler temporal por 2 noches en Los Fresnos I, Depto 401. Monto total S/.360.00.',
    NULL,
    true,
    '2026-07-25',
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id
WHERE d.numero = '401' AND r.fecha_entrada = '2026-07-26' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- Contrato para la reserva 2
INSERT INTO public.contratos (reserva_id, numero_contrato, tipo_contrato, contenido, archivo_url, firmado_por_cliente, fecha_firma, creado_en)
SELECT 
    r.id,
    'CTR-2026-002',
    'alquiler',
    'Contrato de alquiler temporal por 3 noches en Los Fresnos I, Depto 501. Monto total S/.540.00.',
    NULL,
    true,
    '2026-07-25',
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id
WHERE d.numero = '501' AND r.fecha_entrada = '2026-07-28' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- Contrato para la reserva 3
INSERT INTO public.contratos (reserva_id, numero_contrato, tipo_contrato, contenido, archivo_url, firmado_por_cliente, fecha_firma, creado_en)
SELECT 
    r.id,
    'CTR-2026-003',
    'alquiler',
    'Contrato de alquiler temporal por 1 noche en Los Fresnos I, Depto 601. Monto total S/.180.00.',
    NULL,
    true,
    '2026-07-26',
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id
WHERE d.numero = '601' AND r.fecha_entrada = '2026-07-27' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- Contrato para la reserva 4 (pendiente de firma)
INSERT INTO public.contratos (reserva_id, numero_contrato, tipo_contrato, contenido, archivo_url, firmado_por_cliente, fecha_firma, creado_en)
SELECT 
    r.id,
    'CTR-2026-004',
    'alquiler',
    'Contrato de alquiler temporal por 2 noches en Los Fresnos I, Depto 701. Monto total S/.360.00.',
    NULL,
    false,          -- pendiente de firma
    NULL,
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id
WHERE d.numero = '701' AND r.fecha_entrada = '2026-07-26' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- =============================================
-- PAGOS (asociados a las reservas confirmadas)
-- =============================================

-- Pago de la reserva 1 (completo, yape)
INSERT INTO public.pagos (reserva_id, cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT 
    r.id,
    c.id,
    r.monto_total,
    '2026-07-25',
    'yape',
    'completado',
    'Pago total por adelantado.',
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id AND d.numero = '401'
JOIN public.clientes c ON r.cliente_id = c.id
WHERE r.fecha_entrada = '2026-07-26' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- Pago de la reserva 2 (completo, transferencia)
INSERT INTO public.pagos (reserva_id, cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT 
    r.id,
    c.id,
    r.monto_total,
    '2026-07-26',
    'transferencia',
    'completado',
    'Transferencia bancaria.',
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id AND d.numero = '501'
JOIN public.clientes c ON r.cliente_id = c.id
WHERE r.fecha_entrada = '2026-07-28' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- Pago de la reserva 3 (completo, efectivo)
INSERT INTO public.pagos (reserva_id, cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT 
    r.id,
    c.id,
    r.monto_total,
    '2026-07-27',
    'efectivo',
    'completado',
    'Pago al momento del ingreso.',
    now()
FROM public.reservas r
JOIN public.departamentos d ON r.departamento_id = d.id AND d.numero = '601'
JOIN public.clientes c ON r.cliente_id = c.id
WHERE r.fecha_entrada = '2026-07-27' AND d.edificio_id = 'b2222222-2222-2222-2222-222222222222';

-- =============================================
-- PAGOS DE ALQUILER MENSUAL (julio 2026)
-- =============================================

-- Edificio Marcelo - Piso 3: Luis Marcelo Caballero (S/. 1,200)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1200.00, '2026-07-05', 'transferencia', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'Luis Marcelo Caballero';

-- Edificio Marcelo - Piso 4: María Elena Huamán Rojas (S/. 1,800)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1800.00, '2026-07-05', 'transferencia', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'María Elena Huamán Rojas';

-- Edificio Marcelo - Piso 5: Carlos Alberto Torres Vera (S/. 1,800)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1800.00, '2026-07-05', 'yape', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'Carlos Alberto Torres Vera';

-- Edificio Marcelo - Piso 6: Pool Espinoza Lazo (S/. 300)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 300.00, '2026-07-05', 'efectivo', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'Pool Espinoza Lazo';

-- Edificio Los Fresnos I - Piso 4: Andrea Carolina Quispe Sánchez (S/. 1,800)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1800.00, '2026-07-05', 'transferencia', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'Andrea Carolina Quispe Sánchez';

-- Edificio Los Fresnos I - Piso 5: José Antonio Ríos Mendoza (S/. 1,800)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1800.00, '2026-07-05', 'yape', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'José Antonio Ríos Mendoza';

-- Edificio Los Fresnos I - Piso 6: Familia Rodríguez Peña (S/. 1,800)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1800.00, '2026-07-05', 'transferencia', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'Familia Rodríguez Peña';

-- Edificio Los Fresnos I - Piso 7: Miguel Ángel Herrera López (S/. 1,800)
INSERT INTO public.pagos (cliente_id, monto, fecha_pago, metodo, estado, notas, creado_en)
SELECT c.id, 1800.00, '2026-07-05', 'efectivo', 'completado', 'Alquiler mensual julio 2026', now()
FROM public.clientes c
WHERE c.nombre_completo = 'Miguel Ángel Herrera López';


CREATE POLICY "Lectura autenticada pagos" ON public.pagos 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada reservas" ON public.reservas 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada clientes" ON public.clientes 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada contratos" ON public.contratos 
  FOR SELECT TO authenticated USING (true);

  UPDATE public.perfiles
SET avatar_url = 'https://kwgdaetnsefhoprakapa.supabase.co/storage/v1/object/public/avatars/mi-foto.png'
WHERE id = '0425294f-79b5-43f4-8e55-0ab32aa5408f';

-- Permitir insertar clientes a usuarios autenticados
CREATE POLICY "Autenticados insertan clientes" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir actualizar clientes a usuarios autenticados
CREATE POLICY "Autenticados actualizan clientes" ON public.clientes
  FOR UPDATE TO authenticated USING (true);