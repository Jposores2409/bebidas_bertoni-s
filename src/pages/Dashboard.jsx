import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  TrendingUp, Package, Receipt, DollarSign,
  AlertTriangle, ShoppingCart
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState({ ventas_hoy: 0, total_hoy: 0, productos: 0, stock_bajo: 0 })
  const [ventasRecientes, setVentasRecientes] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), "yyyy-MM-dd")

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const { data: ventasHoy } = await supabase
        .from('ventas')
        .select('total')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .eq('estado', 'completada')

      const totalHoy = ventasHoy?.reduce((s, v) => s + Number(v.total), 0) ?? 0

      const { data: productos } = await supabase.from('productos').select('stock, stock_minimo').eq('activo', true)
      const stockBajo = productos?.filter(p => p.stock <= p.stock_minimo).length ?? 0

      setStats({
        ventas_hoy: ventasHoy?.length ?? 0,
        total_hoy: totalHoy,
        productos: productos?.length ?? 0,
        stock_bajo: stockBajo
      })

      const { data: recientes } = await supabase
        .from('ventas')
        .select('*, venta_items(count)')
        .order('created_at', { ascending: false })
        .limit(5)
      setVentasRecientes(recientes ?? [])

      const dias = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dias.push(format(d, 'yyyy-MM-dd'))
      }

      const chartRows = await Promise.all(dias.map(async dia => {
        const { data } = await supabase
          .from('ventas')
          .select('total')
          .gte('created_at', `${dia}T00:00:00`)
          .lte('created_at', `${dia}T23:59:59`)
          .eq('estado', 'completada')
        const total = data?.reduce((s, v) => s + Number(v.total), 0) ?? 0
        return { dia: format(new Date(dia + 'T12:00:00'), 'EEE', { locale: es }), total }
      }))
      setChartData(chartRows)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const metodos = {
    efectivo: { label: 'Efectivo', color: '#4ade80' },
    transferencia: { label: 'Transferencia', color: '#60a5fa' },
    credito: { label: 'Crédito', color: '#f472b6' },
    debito: { label: 'Débito', color: '#fb923c' },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}</p>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(26,95,168,0.15)' }}>
            <DollarSign size={22} color="#7eb8f5" />
          </div>
          <div>
            <div className="stat-value">${stats.total_hoy.toLocaleString('es-AR')}</div>
            <div className="stat-label">Ventas hoy</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Receipt size={22} color="#4ade80" />
          </div>
          <div>
            <div className="stat-value">{stats.ventas_hoy}</div>
            <div className="stat-label">Facturas hoy</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
            <Package size={22} color="#60a5fa" />
          </div>
          <div>
            <div className="stat-value">{stats.productos}</div>
            <div className="stat-label">Productos activos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: stats.stock_bajo > 0 ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.05)' }}>
            <AlertTriangle size={22} color={stats.stock_bajo > 0 ? '#facc15' : '#555'} />
          </div>
          <div>
            <div className="stat-value" style={{ color: stats.stock_bajo > 0 ? '#facc15' : undefined }}>
              {stats.stock_bajo}
            </div>
            <div className="stat-label">Stock bajo</div>
          </div>
        </div>
      </div>

      {/* Chart + Recientes */}
      <div className="dash-bottom">
        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16 }}>Ventas últimos 7 días</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Total en $</div>
            </div>
            <TrendingUp size={18} color="var(--text-muted)" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString('es-AR')}`} width={70} />
              <Tooltip
                contentStyle={{ background: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13 }}
                formatter={v => [`$${Number(v).toLocaleString('es-AR')}`, 'Total']}
                cursor={{ fill: 'rgba(26,95,168,0.08)' }}
              />
              <Bar dataKey="total" fill="#1a5fa8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Últimas ventas */}
        <div className="card">
          <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Últimas ventas
          </div>
          {ventasRecientes.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <ShoppingCart size={32} />
              <p>Sin ventas registradas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ventasRecientes.map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10,
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v.numero_factura}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {format(new Date(v.created_at), 'HH:mm')} ·
                      <span style={{ marginLeft: 4, color: metodos[v.metodo_pago]?.color ?? '#fff' }}>
                        {metodos[v.metodo_pago]?.label ?? v.metodo_pago}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Outfit' }}>
                      ${Number(v.total).toLocaleString('es-AR')}
                    </div>
                    <span className={`badge badge-${v.estado === 'completada' ? 'green' : 'red'}`} style={{ fontSize: 10 }}>
                      {v.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .dash-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .dash-bottom {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        @media (max-width: 1024px) {
          .dash-bottom {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dash-stats {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .dash-bottom {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .stat-value {
            font-size: 20px !important;
          }
        }

        @media (max-width: 400px) {
          .dash-stats {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  )
}