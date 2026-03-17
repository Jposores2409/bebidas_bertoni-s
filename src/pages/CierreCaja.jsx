import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Archive, DollarSign, CreditCard, Smartphone, Banknote, Package, ArrowUp, ArrowDown, Check, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CierreCaja() {
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [resumen, setResumen] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [cierreExistente, setCierreExistente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notas, setNotas] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => { loadData() }, [fecha])

  async function loadData() {
    setLoading(true)
    setSuccess(false)

    // Verificar si ya existe un cierre para esa fecha
    const { data: cierre } = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('fecha', fecha)
      .single()

    setCierreExistente(cierre)
    if (cierre) setNotas(cierre.notas ?? '')

    // Ventas del día
    const { data: ventas } = await supabase
      .from('ventas')
      .select('*')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`)
      .eq('estado', 'completada')

    const totalesPorMetodo = {
      efectivo: 0, transferencia: 0, credito: 0, debito: 0
    }

    ventas?.forEach(v => {
      if (totalesPorMetodo[v.metodo_pago] !== undefined) {
        totalesPorMetodo[v.metodo_pago] += Number(v.total)
      }
    })

    const totalVentas = Object.values(totalesPorMetodo).reduce((s, v) => s + v, 0)

    // Movimientos de stock del día
    const { data: movs } = await supabase
      .from('stock_movimientos')
      .select('*, productos(nombre)')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`)
      .order('created_at', { ascending: false })

    const productosVendidos = movs?.filter(m => m.tipo === 'salida').reduce((s, m) => s + m.cantidad, 0) ?? 0
    const productosIngresados = movs?.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.cantidad, 0) ?? 0

    setResumen({
      ...totalesPorMetodo,
      total_ventas: totalVentas,
      cantidad_ventas: ventas?.length ?? 0,
      productos_vendidos: productosVendidos,
      productos_ingresados: productosIngresados,
    })
    setMovimientos(movs ?? [])
    setLoading(false)
  }

  async function cerrarCaja() {
    setSaving(true)
    const payload = {
      fecha,
      total_efectivo: resumen.efectivo,
      total_transferencia: resumen.transferencia,
      total_credito: resumen.credito,
      total_debito: resumen.debito,
      total_ventas: resumen.total_ventas,
      cantidad_ventas: resumen.cantidad_ventas,
      productos_vendidos: resumen.productos_vendidos,
      productos_ingresados: resumen.productos_ingresados,
      notas: notas || null,
    }

    if (cierreExistente) {
      await supabase.from('cierres_caja').update(payload).eq('id', cierreExistente.id)
    } else {
      await supabase.from('cierres_caja').insert(payload)
    }

    setSaving(false)
    setSuccess(true)
    loadData()
  }

  const cambiarDia = (delta) => {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setFecha(format(d, 'yyyy-MM-dd'))
  }

  const metodosDisplay = [
    { key: 'efectivo', label: 'Efectivo', Icon: Banknote, color: '#4ade80', bg: 'rgba(34,197,94,0.12)' },
    { key: 'transferencia', label: 'Transferencia', Icon: Smartphone, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    { key: 'credito', label: 'Crédito', Icon: CreditCard, color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
    { key: 'debito', label: 'Débito', Icon: CreditCard, color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  ]

  const esHoy = fecha === format(new Date(), 'yyyy-MM-dd')

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Cierre de caja</h1>
          <p className="page-subtitle">Resumen diario de ventas y movimientos</p>
        </div>

        {/* Selector de fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px' }}>
          <button onClick={() => cambiarDia(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
          />
          <button onClick={() => cambiarDia(1)} style={{ background: 'none', border: 'none', color: esHoy ? 'rgba(255,255,255,0.15)' : 'var(--text-muted)', cursor: esHoy ? 'not-allowed' : 'pointer', display: 'flex' }} disabled={esHoy}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : (
        <>
          {/* Estado del cierre */}
          {cierreExistente && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, marginBottom: 20 }}>
              <Check size={16} color="#4ade80" />
              <span style={{ fontSize: 14, color: '#4ade80', fontWeight: 500 }}>
                Caja cerrada el {format(new Date(cierreExistente.created_at), "dd/MM/yyyy 'a las' HH:mm")}
              </span>
            </div>
          )}

          {success && !cierreExistente && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, marginBottom: 20 }}>
              <Check size={16} color="#4ade80" />
              <span style={{ fontSize: 14, color: '#4ade80', fontWeight: 500 }}>¡Cierre guardado exitosamente!</span>
            </div>
          )}

          {resumen?.cantidad_ventas === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12, marginBottom: 20 }}>
              <AlertCircle size={16} color="#facc15" />
              <span style={{ fontSize: 14, color: '#facc15' }}>No hay ventas registradas para este día.</span>
            </div>
          )}

          {/* Total del día */}
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total del día</div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 42, color: '#fff', letterSpacing: '-2px', lineHeight: 1.1 }}>
                ${resumen?.total_ventas?.toLocaleString('es-AR')}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {resumen?.cantidad_ventas} {resumen?.cantidad_ventas === 1 ? 'venta' : 'ventas'} ·{' '}
                {format(new Date(fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4ade80', fontWeight: 700, fontSize: 20, fontFamily: 'Outfit' }}>
                  <ArrowDown size={18} />{resumen?.productos_vendidos}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Vendidos</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#60a5fa', fontWeight: 700, fontSize: 20, fontFamily: 'Outfit' }}>
                  <ArrowUp size={18} />{resumen?.productos_ingresados}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Ingresados</div>
              </div>
            </div>
          </div>

          {/* Por método de pago */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            {metodosDisplay.map(({ key, label, Icon, color, bg }) => (
              <div key={key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, background: bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 22, color }}>
                    ${Number(resumen?.[key] ?? 0).toLocaleString('es-AR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Movimientos de stock */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} /> Movimientos de stock
            </div>
            {movimientos.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <Package size={28} />
                <p>Sin movimientos de stock</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Stock anterior</th>
                      <th>Stock nuevo</th>
                      <th>Motivo</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.productos?.nombre ?? '—'}</td>
                        <td>
                          <span className={`badge badge-${m.tipo === 'entrada' ? 'green' : m.tipo === 'salida' ? 'red' : 'yellow'}`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'Outfit', fontWeight: 700, color: m.tipo === 'entrada' ? '#4ade80' : '#f87171' }}>
                          {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{m.stock_anterior}</td>
                        <td>{m.stock_nuevo}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.motivo ?? '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                          {format(new Date(m.created_at), 'HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cerrar caja */}
          <div className="card">
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Archive size={18} /> {cierreExistente ? 'Actualizar cierre' : 'Cerrar caja'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Notas del cierre</label>
              <textarea className="input" rows={3} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones, novedades del día..." style={{ resize: 'vertical' }} />
            </div>
            <button className="btn btn-primary" onClick={cerrarCaja} disabled={saving || resumen?.cantidad_ventas === 0}>
              {saving ? <span className="btn-spinner" style={{ width: 16, height: 16 }} /> : <><Archive size={16} /> {cierreExistente ? 'Actualizar cierre' : 'Confirmar cierre de caja'}</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
