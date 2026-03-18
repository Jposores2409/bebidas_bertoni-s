import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Trash2, X, Receipt, ShoppingCart, Tag, Check, Eye, Ban } from 'lucide-react'

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo', color: '#4ade80' },
  { value: 'transferencia', label: 'Transferencia', color: '#60a5fa' },
  { value: 'credito', label: 'Crédito', color: '#f472b6' },
  { value: 'debito', label: 'Débito', color: '#fb923c' },
]

export default function Facturacion() {
  const [tab, setTab] = useState('nueva')
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [search, setSearch] = useState('')
  const [searchHistorial, setSearchHistorial] = useState('')
  const [carritoVisible, setCarritoVisible] = useState(false)

  const [items, setItems] = useState([])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuento, setDescuento] = useState('')
  const [descuentoTipo, setDescuentoTipo] = useState('monto')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [successVenta, setSuccessVenta] = useState(null)

  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  useEffect(() => { loadProductos() }, [])
  useEffect(() => { if (tab === 'historial') loadVentas() }, [tab])

  async function loadProductos() {
    const { data } = await supabase.from('productos').select('*').eq('activo', true).order('nombre')
    setProductos(data ?? [])
  }

  async function loadVentas() {
    setLoadingVentas(true)
    const { data } = await supabase
      .from('ventas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setVentas(data ?? [])
    setLoadingVentas(false)
  }

  const prodFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  )

  function agregarItem(producto) {
    const existe = items.find(i => i.producto_id === producto.id)
    if (existe) {
      setItems(items.map(i => i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, {
        producto_id: producto.id,
        nombre_producto: producto.nombre,
        precio_unitario: producto.precio,
        cantidad: 1
      }])
    }
  }

  function actualizarCantidad(id, val) {
    const n = parseInt(val)
    if (n <= 0 || isNaN(n)) { setItems(items.filter(i => i.producto_id !== id)); return }
    setItems(items.map(i => i.producto_id === id ? { ...i, cantidad: n } : i))
  }

  function quitarItem(id) { setItems(items.filter(i => i.producto_id !== id)) }

  const subtotal = items.reduce((s, i) => s + (i.precio_unitario * i.cantidad), 0)

  const descuentoValor = (() => {
    if (!descuento || isNaN(parseFloat(descuento))) return 0
    const v = parseFloat(descuento)
    if (descuentoTipo === 'porcentaje') return Math.min(subtotal * v / 100, subtotal)
    return Math.min(v, subtotal)
  })()

  const total = subtotal - descuentoValor

  async function generarFactura(e) {
    e.preventDefault()
    if (items.length === 0) return
    setSaving(true)

    const numero = await supabase.rpc('generar_numero_factura').then(r => r.data)

    const { data: venta, error } = await supabase.from('ventas').insert({
      numero_factura: numero,
      subtotal,
      descuento: descuentoValor,
      descuento_tipo: descuentoTipo,
      total,
      metodo_pago: metodoPago,
      notas: notas || null,
    }).select().single()

    if (error || !venta) { setSaving(false); alert('Error al generar la factura'); return }

    await supabase.from('venta_items').insert(
      items.map(i => ({
        venta_id: venta.id,
        producto_id: i.producto_id,
        nombre_producto: i.nombre_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.precio_unitario * i.cantidad
      }))
    )

    for (const item of items) {
      const { data: prod } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single()
      const nuevoStock = Math.max(0, prod.stock - item.cantidad)
      await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.producto_id)
      await supabase.from('stock_movimientos').insert({
        producto_id: item.producto_id,
        tipo: 'salida',
        cantidad: item.cantidad,
        motivo: `Venta ${numero}`,
        venta_id: venta.id,
        stock_anterior: prod.stock,
        stock_nuevo: nuevoStock
      })
    }

    setSuccessVenta(venta)
    setItems([])
    setDescuento('')
    setNotas('')
    setMetodoPago('efectivo')
    setCarritoVisible(false)
    setSaving(false)
  }

  async function anularVenta(id) {
    await supabase.from('ventas').update({ estado: 'anulada' }).eq('id', id)
    loadVentas()
  }

  async function verDetalle(venta) {
    setLoadingDetalle(true)
    setVentaDetalle({ ...venta, items: [] })
    const { data } = await supabase.from('venta_items').select('*').eq('venta_id', venta.id)
    setVentaDetalle({ ...venta, items: data ?? [] })
    setLoadingDetalle(false)
  }

  const metodoColor = m => METODOS_PAGO.find(x => x.value === m)?.color ?? '#fff'
  const metodoLabel = m => METODOS_PAGO.find(x => x.value === m)?.label ?? m

  const ventasFiltradas = ventas.filter(v =>
    v.numero_factura?.toLowerCase().includes(searchHistorial.toLowerCase()) ||
    v.metodo_pago?.toLowerCase().includes(searchHistorial.toLowerCase())
  )

  const CarritoPanel = () => (
    <div className="carrito-panel">
      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 17, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShoppingCart size={18} /> Carrito
        {items.length > 0 && (
          <span style={{ marginLeft: 'auto', background: '#1a5fa8', color: '#fff', borderRadius: 20, fontSize: 12, padding: '2px 8px' }}>
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state" style={{ padding: '30px 0' }}>
          <ShoppingCart size={28} />
          <p>Agregá productos</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {items.map(item => (
            <div key={item.producto_id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', background: 'var(--surface2)',
              borderRadius: 10, border: '1px solid var(--border)'
            }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.nombre_producto}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  ${Number(item.precio_unitario).toLocaleString('es-AR')} c/u
                </div>
              </div>
              <input
                type="number" min="1" value={item.cantidad}
                onChange={e => actualizarCantidad(item.producto_id, e.target.value)}
                style={{ width: 46, textAlign: 'center', padding: '4px 4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 13 }}
              />
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit', minWidth: 64, textAlign: 'right' }}>
                ${(item.precio_unitario * item.cantidad).toLocaleString('es-AR')}
              </div>
              <button onClick={() => quitarItem(item.producto_id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', padding: 3, flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="form-label"><Tag size={11} style={{ marginRight: 4 }} />Descuento</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" type="number" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0" style={{ flex: 1 }} />
            <select className="input" style={{ width: 110 }} value={descuentoTipo} onChange={e => setDescuentoTipo(e.target.value)}>
              <option value="monto">$ Monto</option>
              <option value="porcentaje">% %</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Método de pago</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {METODOS_PAGO.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetodoPago(m.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 9,
                  border: `1px solid ${metodoPago === m.value ? m.color : 'var(--border)'}`,
                  background: metodoPago === m.value ? `${m.color}18` : 'var(--surface2)',
                  color: metodoPago === m.value ? m.color : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                }}
              >
                {metodoPago === m.value && <Check size={12} />}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label">Notas</label>
          <input className="input" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional..." />
        </div>

        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Subtotal</span><span>${subtotal.toLocaleString('es-AR')}</span>
          </div>
          {descuentoValor > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f87171' }}>
              <span>Descuento</span><span>-${descuentoValor.toLocaleString('es-AR')}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
            <span>Total</span><span>${total.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} disabled={items.length === 0 || saving} onClick={generarFactura}>
          {saving ? <span className="btn-spinner" style={{ width: 16, height: 16 }} /> : <><Receipt size={16} /> Generar factura</>}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Facturación</h1>
        <p className="page-subtitle">Nueva venta e historial de facturas</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[{ k: 'nueva', label: 'Nueva venta' }, { k: 'historial', label: 'Historial' }].map(t => (
          <button key={t.k} className={`btn ${tab === t.k ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }} onClick={() => setTab(t.k)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Nueva venta */}
      {tab === 'nueva' && (
        <>
          {/* Desktop layout */}
          <div className="factura-desktop">
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="card" style={{ padding: 0 }}>
                {prodFiltrados.length === 0 ? (
                  <div className="empty-state"><ShoppingCart size={32} /><p>Sin resultados</p></div>
                ) : (
                  <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                    {prodFiltrados.map(p => (
                      <div key={p.id} onClick={() => agregarItem(p)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {p.categoria} · Stock: <span style={{ color: p.stock <= p.stock_minimo ? '#facc15' : '#4ade80' }}>{p.stock}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Outfit', fontWeight: 700 }}>${Number(p.precio).toLocaleString('es-AR')}</div>
                          <div style={{ fontSize: 11, color: '#1a5fa8', marginTop: 2 }}>+ agregar</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="card" style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
              <CarritoPanel />
            </div>
          </div>

          {/* Mobile layout */}
          <div className="factura-mobile">
            {/* Buscador */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Lista de productos */}
            <div className="card" style={{ padding: 0, marginBottom: 80 }}>
              {prodFiltrados.length === 0 ? (
                <div className="empty-state"><ShoppingCart size={32} /><p>Sin resultados</p></div>
              ) : (
                <div>
                  {prodFiltrados.map(p => (
                    <div key={p.id} onClick={() => agregarItem(p)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s', WebkitTapHighlightColor: 'transparent'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Stock: <span style={{ color: p.stock <= p.stock_minimo ? '#facc15' : '#4ade80' }}>{p.stock}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 15 }}>${Number(p.precio).toLocaleString('es-AR')}</div>
                        <div style={{ fontSize: 11, color: '#1a5fa8' }}>+ agregar</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón flotante carrito */}
            <button
              onClick={() => setCarritoVisible(true)}
              style={{
                position: 'fixed', bottom: 20, right: 20,
                background: 'linear-gradient(135deg, #1a5fa8, #1e4d8c)',
                color: '#fff', border: 'none', borderRadius: 16,
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                boxShadow: '0 8px 24px rgba(26,95,168,0.5)',
                cursor: 'pointer', zIndex: 150,
                transition: 'transform 0.15s'
              }}
            >
              <ShoppingCart size={20} />
              {items.length > 0 ? (
                <>
                  <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '2px 8px' }}>
                    ${total.toLocaleString('es-AR')}
                  </span>
                </>
              ) : (
                <span>Ver carrito</span>
              )}
            </button>

            {/* Carrito como modal en mobile */}
            {carritoVisible && (
              <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setCarritoVisible(false)}>
                <div className="modal" style={{ maxWidth: '100%', margin: '0', borderRadius: '20px 20px 0 0', position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '90vh' }}>
                  <div className="modal-header">
                    <span className="modal-title">Carrito</span>
                    <button className="modal-close" onClick={() => setCarritoVisible(false)}><X size={18} /></button>
                  </div>
                  <div className="modal-body">
                    <CarritoPanel />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar factura..." value={searchHistorial} onChange={e => setSearchHistorial(e.target.value)} />
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loadingVentas ? (
              <div style={{ padding: 40 }}><div className="spinner" /></div>
            ) : ventasFiltradas.length === 0 ? (
              <div className="empty-state"><Receipt size={40} /><h3>Sin facturas</h3><p>Las ventas aparecerán aquí</p></div>
            ) : (
              <div>
                {/* Desktop tabla */}
                <div className="hist-desktop">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Nro. Factura</th>
                          <th>Fecha</th>
                          <th>Método</th>
                          <th>Descuento</th>
                          <th>Total</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasFiltradas.map(v => (
                          <tr key={v.id}>
                            <td style={{ fontWeight: 600 }}>{v.numero_factura}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{format(new Date(v.created_at), "dd/MM/yy HH:mm")}</td>
                            <td><span style={{ color: metodoColor(v.metodo_pago), fontWeight: 600, fontSize: 13 }}>{metodoLabel(v.metodo_pago)}</span></td>
                            <td style={{ color: 'var(--text-muted)' }}>{v.descuento > 0 ? `$${Number(v.descuento).toLocaleString('es-AR')}` : '—'}</td>
                            <td style={{ fontFamily: 'Outfit', fontWeight: 700 }}>${Number(v.total).toLocaleString('es-AR')}</td>
                            <td><span className={`badge badge-${v.estado === 'completada' ? 'green' : 'red'}`}>{v.estado}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => verDetalle(v)}><Eye size={13} /></button>
                                {v.estado === 'completada' && (
                                  <button className="btn btn-sm btn-danger" onClick={() => anularVenta(v.id)}><Ban size={13} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="hist-mobile">
                  {ventasFiltradas.map(v => (
                    <div key={v.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{v.numero_factura}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {format(new Date(v.created_at), "dd/MM/yy HH:mm")} ·{' '}
                            <span style={{ color: metodoColor(v.metodo_pago) }}>{metodoLabel(v.metodo_pago)}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16 }}>${Number(v.total).toLocaleString('es-AR')}</div>
                          <span className={`badge badge-${v.estado === 'completada' ? 'green' : 'red'}`} style={{ fontSize: 10 }}>{v.estado}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-sm btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => verDetalle(v)}>
                          <Eye size={13} /> Ver detalle
                        </button>
                        {v.estado === 'completada' && (
                          <button className="btn btn-sm btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => anularVenta(v.id)}>
                            <Ban size={13} /> Anular
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successVenta && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={30} color="#4ade80" />
              </div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>¡Venta registrada!</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>{successVenta.numero_factura}</div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 28, color: '#4ade80' }}>${Number(successVenta.total).toLocaleString('es-AR')}</div>
              <button className="btn btn-primary" style={{ marginTop: 24, width: '100%', justifyContent: 'center' }} onClick={() => setSuccessVenta(null)}>
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalle Modal */}
      {ventaDetalle && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setVentaDetalle(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{ventaDetalle.numero_factura}</span>
              <button className="modal-close" onClick={() => setVentaDetalle(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <span className="badge badge-blue">{metodoLabel(ventaDetalle.metodo_pago)}</span>
                <span className={`badge badge-${ventaDetalle.estado === 'completada' ? 'green' : 'red'}`}>{ventaDetalle.estado}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(new Date(ventaDetalle.created_at), "dd/MM/yyyy HH:mm")}</span>
              </div>
              {loadingDetalle ? <div className="spinner" /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ventaDetalle.items?.map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--surface2)', borderRadius: 9 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{i.nombre_producto}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>x{i.cantidad} · ${Number(i.precio_unitario).toLocaleString('es-AR')} c/u</div>
                      </div>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 700 }}>${Number(i.subtotal).toLocaleString('es-AR')}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                  <span>Subtotal</span><span>${Number(ventaDetalle.subtotal).toLocaleString('es-AR')}</span>
                </div>
                {ventaDetalle.descuento > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#f87171' }}>
                    <span>Descuento</span><span>-${Number(ventaDetalle.descuento).toLocaleString('es-AR')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Outfit', fontWeight: 700, fontSize: 18 }}>
                  <span>Total</span><span>${Number(ventaDetalle.total).toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .factura-desktop {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          align-items: start;
        }
        .factura-mobile { display: none; }
        .hist-desktop { display: block; }
        .hist-mobile { display: none; }
        .carrito-panel { /* shared styles */ }

        @media (max-width: 768px) {
          .factura-desktop { display: none; }
          .factura-mobile { display: block; }
          .hist-desktop { display: none; }
          .hist-mobile { display: block; }
        }
      `}</style>
    </div>
  )
}