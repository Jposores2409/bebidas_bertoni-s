-- =============================================
-- ESQUEMA DE BASE DE DATOS PARA SUPABASE
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- Tabla de productos
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  costo DECIMAL(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  categoria TEXT DEFAULT 'General',
  codigo TEXT UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de ventas (facturas)
CREATE TABLE ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_factura TEXT UNIQUE NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  subtotal DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) DEFAULT 0,
  descuento_tipo TEXT DEFAULT 'monto', -- 'monto' o 'porcentaje'
  total DECIMAL(10,2) NOT NULL,
  metodo_pago TEXT NOT NULL, -- 'efectivo', 'transferencia', 'credito', 'debito'
  estado TEXT DEFAULT 'completada', -- 'completada', 'anulada'
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items de venta
CREATE TABLE venta_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  nombre_producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de movimientos de stock
CREATE TABLE stock_movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id),
  tipo TEXT NOT NULL, -- 'entrada', 'salida', 'ajuste'
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  venta_id UUID REFERENCES ventas(id),
  stock_anterior INTEGER,
  stock_nuevo INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cierres de caja
CREATE TABLE cierres_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  total_efectivo DECIMAL(10,2) DEFAULT 0,
  total_transferencia DECIMAL(10,2) DEFAULT 0,
  total_credito DECIMAL(10,2) DEFAULT 0,
  total_debito DECIMAL(10,2) DEFAULT 0,
  total_ventas DECIMAL(10,2) DEFAULT 0,
  cantidad_ventas INTEGER DEFAULT 0,
  productos_vendidos INTEGER DEFAULT 0,
  productos_ingresados INTEGER DEFAULT 0,
  notas TEXT,
  cerrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Actualizar updated_at automáticamente en productos
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para generar número de factura automático
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TEXT AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_numero TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM 4) AS INTEGER)), 0)
  INTO ultimo_numero
  FROM ventas
  WHERE numero_factura LIKE 'FAC%';
  
  nuevo_numero := 'FAC' || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo usuarios autenticados pueden acceder
CREATE POLICY "usuarios_autenticados_productos" ON productos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios_autenticados_ventas" ON ventas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios_autenticados_venta_items" ON venta_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios_autenticados_movimientos" ON stock_movimientos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "usuarios_autenticados_cierres" ON cierres_caja
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- DATOS DE EJEMPLO (opcional)
-- =============================================

INSERT INTO productos (nombre, descripcion, precio, costo, stock, categoria, codigo) VALUES
  ('Producto Demo 1', 'Descripción del producto', 1500.00, 800.00, 50, 'General', 'PROD001'),
  ('Producto Demo 2', 'Descripción del producto', 2300.00, 1200.00, 30, 'General', 'PROD002'),
  ('Producto Demo 3', 'Descripción del producto', 890.00, 400.00, 100, 'General', 'PROD003');
