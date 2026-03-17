# GestiónPro — Sistema de gestión empresarial

Aplicación web completa construida con **React + Supabase + Vercel**.

## Módulos incluidos
- 🔐 **Login seguro** con Supabase Auth (JWT)
- 📦 **Gestión de productos** (CRUD completo + control de stock)
- 🧾 **Facturación** (nueva venta, descuentos, métodos de pago, historial)
- 💰 **Cierre de caja** (resumen diario por método de pago, movimientos de stock)

---

## Configuración paso a paso

### 1. Crear proyecto en Supabase
1. Entrá a [supabase.com](https://supabase.com) y creá un nuevo proyecto
2. Esperá que termine de inicializarse (~2 min)
3. Andá a **Settings → API** y copiá:
   - `Project URL` → tu `SUPABASE_URL`
   - `anon public` key → tu `SUPABASE_ANON_KEY`

### 2. Ejecutar el schema de base de datos
1. En el dashboard de Supabase, andá a **SQL Editor**
2. Copiá todo el contenido de `supabase-schema.sql`
3. Pegalo y ejecutalo (botón **Run**)

### 3. Crear usuario administrador
1. En Supabase, andá a **Authentication → Users**
2. Hacé click en **Add user** → **Create new user**
3. Ingresá email y contraseña del administrador

### 4. Conectar Supabase al proyecto
Abrí `src/lib/supabase.js` y reemplazá:
```js
const SUPABASE_URL = 'https://TU_PROJECT_ID.supabase.co'
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI'
```
Con los valores copiados en el paso 1.

### 5. Instalar dependencias y correr localmente
```bash
npm install
npm start
```
La app va a abrir en `http://localhost:3000`

---

## Deploy en Vercel

### Opción A: Desde GitHub (recomendado)
1. Subí el proyecto a un repositorio en GitHub
2. Entrá a [vercel.com](https://vercel.com) → **New Project**
3. Importá tu repositorio
4. En **Environment Variables** agregá:
   - `REACT_APP_SUPABASE_URL` = tu URL de Supabase
   - `REACT_APP_SUPABASE_ANON_KEY` = tu anon key
5. Hacé click en **Deploy**

> ⚠️ Si usás variables de entorno de Vercel, actualizá `src/lib/supabase.js`:
> ```js
> const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
> const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY
> ```

### Opción B: Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## Estructura del proyecto
```
src/
├── context/
│   └── AuthContext.jsx      # Manejo de autenticación global
├── lib/
│   └── supabase.js          # Cliente de Supabase (configurar aquí)
├── components/
│   └── Layout.jsx           # Sidebar + navegación
├── pages/
│   ├── Login.jsx            # Pantalla de ingreso
│   ├── Dashboard.jsx        # Estadísticas y gráficos
│   ├── Productos.jsx        # CRUD de productos + stock
│   ├── Facturacion.jsx      # Nueva venta + historial
│   └── CierreCaja.jsx       # Resumen y cierre diario
└── App.jsx                  # Rutas y guards de autenticación
```

---

## Próximas mejoras sugeridas
- [ ] Roles de usuario (admin vs empleado)
- [ ] Exportar reportes a PDF o Excel
- [ ] Código de barras con cámara
- [ ] Notificaciones de stock bajo por email
- [ ] Módulo de clientes / CRM básico
