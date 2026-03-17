import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit2, Trash2, Package, X, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'

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
  const [stockModal, setStockModal] = useState(null) // { producto, tipo }
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(EMPTY_PRODUCTO)
  const [stockCantidad, setStockCantidad] = useState('')
  const [stockMotivo, setStockMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { loadProductos() }, [])

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
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nuevo producto
        </button>
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

      {/* Table */}
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
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px' }}
                            title="Entrada de stock"
                            onClick={() => { setStockModal({ producto: p, tipo: 'entrada' }); setStockCantidad(''); setStockMotivo('') }}
                          >
                            <ArrowUp size={13} style={{ color: '#4ade80' }} />
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px' }}
                            title="Salida de stock"
                            onClick={() => { setStockModal({ producto: p, tipo: 'salida' }); setStockCantidad(''); setStockMotivo('') }}
                          >
                            <ArrowDown size={13} style={{ color: '#f87171' }} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(p)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editando ? 'Editar producto' : 'Nuevo producto'}</span>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveProducto}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Nombre *</label>
                  <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required placeholder="Nombre del producto" />
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

      {/* Stock Modal */}
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
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Stock actual: <strong style={{ color: 'var(--text)' }}>{stockModal.producto.stock}</strong></div>
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

      {/* Delete Confirm */}
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
    </div>
  )
}
