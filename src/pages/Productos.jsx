import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit2, Trash2, Package, X, AlertTriangle, ArrowUp, ArrowDown, Camera, ScanLine } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

const EMPTY_PRODUCTO = {
  nombre: '', descripcion: '', precio: '', costo: '',
  stock: '', stock_minimo: 5, categoria: 'General', codigo: ''
}

const CATEGORIAS = ['General', 'Electrónica', 'Ropa', 'Alimentos', 'Bebidas', 'Hogar', 'Oficina', 'Otro']

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(EMPTY_PRODUCTO)
  const [stockCantidad, setStockCantidad] = useState('')
  const [stockMotivo, setStockMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)

  useEffect(() => { loadProductos() }, [])

  useEffect(() => {
    if (scannerOpen) {
      setTimeout(() => startScanner(), 300)
    } else {
      stopScanner()
    }
    return () => stopScanner()
  }, [scannerOpen])

  async function loadProductos() {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setProductos(data ?? [])
    setLoading(false)
  }

  async function startScanner() {
    setScannerError('')
    setScanning(true)
    try {
      const html5Qr = new Html5Qrcode('scanner-productos')
      html5QrRef.current = html5Qr

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        setScannerError('No se encontró ninguna cámara.')
        setScanning(false)
        return
      }

      // Preferir cámara trasera en mobile
      const camara = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('tras')) ?? cameras[cameras.length - 1]

      await html5Qr.start(
        camara.id,
        { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
        (decodedText) => onCodigoEscaneado(decodedText),
        () => {}
      )
    } catch (err) {
      setScannerError('No se pudo acceder a la cámara. Verificá los permisos.')
      setScanning(false)
    }
  }

  async function stopScanner() {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop()
        html5QrRef.current.clear()
      } catch {}
      html5QrRef.current = null
    }
    setScanning(false)
  }

  async function onCodigoEscaneado(codigo) {
    await stopScanner()
    setScannerOpen(false)

    // Buscar si ya existe el producto
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('codigo', codigo)
      .eq('activo', true)
      .single()

    if (data) {
      // Producto existe → abrir para editar
      openEdit(data)
    } else {
      // Producto no existe → abrir formulario con código precargado
      setEditando(null)
      setForm({ ...EMPTY_PRODUCTO, codigo })
      setModalOpen(true)
    }
  }

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setEditando(null)
    setForm(EMPTY_PRODUCTO)
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditando(p)
    setForm({
      nombre: p.nombre, descripcion: p.descripcion ?? '',
      precio: p.precio, costo: p.costo ?? '',
      stock: p.stock, stock_minimo: p.stock_minimo ?? 5,
      categoria: p.categoria ?? 'General', codigo: p.codigo ?? ''
    })
    setModalOpen(true)
  }

  async function saveProducto(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: parseFloat(form.precio),
      costo: form.costo ? parseFloat(form.costo) : 0,
      stock: parseInt(form.stock) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      categoria: form.categoria,
      codigo: form.codigo || null,
    }
    if (editando) {
      await supabase.from('productos').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('productos').insert(payload)
    }
    setModalOpen(false)
    setSaving(false)
    loadProductos()
  }

  async function deleteProducto(id) {
    await supabase.from('productos').update({ activo: false }).eq('id', id)
    setDeleteConfirm(null)
    loadProductos()
  }

  async function ajustarStock(e) {
    e.preventDefault()
    setSaving(true)
    const cantidad = parseInt(stockCantidad)
    if (!cantidad || cantidad <= 0) return
    const { data: prod } = await supabase.from('productos').select('stock').eq('id', stockModal.producto.id).single()
    const stockAnterior = prod.stock
    const stockNuevo = stockModal.tipo === 'entrada' ? stockAnterior + cantidad : Math.max(0, stockAnterior - cantidad)
    await supabase.from('productos').update({ stock: stockNuevo }).eq('id', stockModal.producto.id)
    await supabase.from('stock_movimientos').insert({
      producto_id: stockModal.producto.id,
      tipo: stockModal.tipo,
      cantidad,
      motivo: stockMotivo || null,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo
    })
    setStockModal(null)
    setStockCantidad('')
    setStockMotivo('')
    setSaving(false)
    loadProductos()
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">{productos.length} productos en inventario</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setScannerOpen(true)}>
            <ScanLine size={16} /> Escanear código
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar por nombre, código o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla desktop / Cards mobile */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Package size={40} />
            <h3>Sin productos</h3>
            <p>{search ? 'No hay resultados para tu búsqueda' : 'Creá tu primer producto'}</p>
          </div>
        ) : (
          <>
            <div className="prod-desktop">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Costo</th>
                      <th>Stock</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                          {p.codigo && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.codigo}</div>}
                        </td>
                        <td><span className="badge badge-blue">{p.categoria}</span></td>
                        <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>${Number(p.precio).toLocaleString('es-AR')}</td>
                        <td style={{ color: 'var(--text-muted)' }}>${Number(p.costo).toLocaleString('es-AR')}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, color: p.stock <= p.stock_minimo ? '#facc15' : undefined }}>
                              {p.stock}
                              {p.stock <= p.stock_minimo && <AlertTriangle size={13} style={{ marginLeft: 5, verticalAlign: 'middle', color: '#facc15' }} />}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px' }}
                                onClick={() => { setStockModal({ producto: p, tipo: 'entrada' }); setStockCantidad(''); setStockMotivo('') }}>
                                <ArrowUp size={13} style={{ color: '#4ade80' }} />
                              </button>
                              <button className="btn btn-sm btn-secondary" style={{ padding: '4px 8px' }}
                                onClick={() => { setStockModal({ producto: p, tipo: 'salida' }); setStockCantidad(''); setStockMotivo('') }}>
                                <ArrowDown size={13} style={{ color: '#f87171' }} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                            <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(p)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="prod-mobile">
              {filtered.map(p => (
                <div key={p.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nombre}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.categoria}</span>
                        {p.codigo && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.codigo}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16 }}>${Number(p.precio).toLocaleString('es-AR')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>costo ${Number(p.costo).toLocaleString('es-AR')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: p.stock <= p.stock_minimo ? '#facc15' : '#4ade80' }}>
                        Stock: {p.stock}
                        {p.stock <= p.stock_minimo && <AlertTriangle size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                      </span>
                      <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px' }}
                        onClick={() => { setStockModal({ producto: p, tipo: 'entrada' }); setStockCantidad(''); setStockMotivo('') }}>
                        <ArrowUp size={13} style={{ color: '#4ade80' }} />
                      </button>
                      <button className="btn btn-sm btn-secondary" style={{ padding: '5px 10px' }}
                        onClick={() => { setStockModal({ producto: p, tipo: 'salida' }); setStockCantidad(''); setStockMotivo('') }}>
                        <ArrowDown size={13} style={{ color: '#f87171' }} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(p)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Escáner */}
      {scannerOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setScannerOpen(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title"><Camera size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Escanear código</span>
              <button className="modal-close" onClick={() => setScannerOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
                Apuntá la cámara al código de barras del producto
              </p>
              <div id="scanner-productos" style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 200 }} />
              {scannerError && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
                  {scannerError}
                </div>
              )}
              {scanning && !scannerError && (
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ScanLine size={15} style={{ color: '#1a5fa8' }} /> Buscando código...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar producto' : 'Nuevo producto'}</span>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveProducto}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {form.codigo && !editando && (
                  <div style={{ padding: '10px 14px', background: 'rgba(26,95,168,0.1)', border: '1px solid rgba(26,95,168,0.25)', borderRadius: 10, fontSize: 13, color: '#7eb8f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ScanLine size={15} /> Código escaneado: <strong>{form.codigo}</strong>
                  </div>
                )}
                <div>
                  <label className="form-label">Nombre *</label>
                  <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required placeholder="Nombre del producto" autoFocus />
                </div>
                <div>
                  <label className="form-label">Descripción</label>
                  <textarea className="input" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" style={{ resize: 'vertical' }} />
                </div>
                <div className="grid-2">
                  <div>
                    <label className="form-label">Precio de venta *</label>
                    <input className="input" type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div>
                    <label className="form-label">Costo</label>
                    <input className="input" type="number" step="0.01" min="0" value={form.costo} onChange={e => setForm({ ...form, costo: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="grid-3">
                  <div>
                    <label className="form-label">Stock actual</label>
                    <input className="input" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label">Stock mínimo</label>
                    <input className="input" type="number" min="0" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} placeholder="5" />
                  </div>
                  <div>
                    <label className="form-label">Categoría</label>
                    <select className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Código / SKU</label>
                  <input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="PROD001 (opcional)" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="btn-spinner" style={{ width: 16, height: 16 }} /> : editando ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Stock */}
      {stockModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setStockModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">
                {stockModal.tipo === 'entrada' ? '📦 Entrada de stock' : '📤 Salida de stock'}
              </span>
              <button className="modal-close" onClick={() => setStockModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={ajustarStock}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{stockModal.producto.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Stock actual: <strong style={{ color: 'var(--text)' }}>{stockModal.producto.stock}</strong>
                  </div>
                </div>
                <div>
                  <label className="form-label">Cantidad *</label>
                  <input className="input" type="number" min="1" value={stockCantidad} onChange={e => setStockCantidad(e.target.value)} required placeholder="0" autoFocus />
                </div>
                <div>
                  <label className="form-label">Motivo</label>
                  <input className="input" value={stockMotivo} onChange={e => setStockMotivo(e.target.value)} placeholder="Compra, ajuste, devolución..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStockModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="btn-spinner" style={{ width: 16, height: 16 }} /> : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <span className="modal-title">¿Eliminar producto?</span>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                Vas a eliminar <strong style={{ color: 'var(--text)' }}>{deleteConfirm.nombre}</strong>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => deleteProducto(deleteConfirm.id)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .prod-desktop { display: block; }
        .prod-mobile { display: none; }
        @media (max-width: 768px) {
          .prod-desktop { display: none; }
          .prod-mobile { display: block; }
        }
      `}</style>
    </div>
  )
}