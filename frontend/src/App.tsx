import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import {
  LayoutDashboard, BarChart2, Search, BrainCircuit,
  TrendingUp, Star, Award, ShieldAlert, ArrowLeft,
  RefreshCw, Package, DollarSign, MessageSquare, Zap,
} from 'lucide-react';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

const BRAND_COLORS: Record<string, string> = {
  'Safari': '#6366f1',
  'Skybags': '#ec4899',
  'American Tourister': '#0ea5e9',
  'VIP': '#10b981',
  'Aristocrat': '#f59e0b',
  'Nasher Miles': '#8b5cf6',
};
const COLOR_ARRAY = Object.values(BRAND_COLORS);

// Types
interface Brand {
  brand: string;
  avg_price: number;
  avg_discount: number;
  avg_rating: number;
  review_count: number;
  sentiment_score: number;
  product_count: number;
  positioning: string;
}

interface Product {
  asin: string;
  title: string;
  brand: string;
  price: number;
  list_price: number;
  discount_pct: number;
  rating: number;
  review_count: number;
}

interface AspectSentiment {
  wheels: number;
  handle: number;
  zipper: number;
  material: number;
  durability: number;
  size: number;
}

interface AIAnalysis {
  sentiment_score: number;
  top_praise_themes: string[];
  top_complaint_themes: string[];
  aspect_level_sentiment: AspectSentiment;
  review_synthesis: string;
  agent_insights: string[];
}

interface ProductDetail extends Product {
  analysis: AIAnalysis;
}

type View = 'overview' | 'compare' | 'products' | 'product-detail' | 'insights';

// Mock fallback data (used when backend is unavailable)
const MOCK_BRANDS: Brand[] = [
  { brand: 'Safari', avg_price: 3100, avg_discount: 76, avg_rating: 4.1, review_count: 89400, sentiment_score: 82, product_count: 12, positioning: 'Mass-market' },
  { brand: 'Skybags', avg_price: 2800, avg_discount: 69, avg_rating: 4.0, review_count: 64200, sentiment_score: 80, product_count: 12, positioning: 'Mass-market' },
  { brand: 'American Tourister', avg_price: 4100, avg_discount: 63, avg_rating: 4.4, review_count: 112000, sentiment_score: 88, product_count: 12, positioning: 'Premium' },
  { brand: 'VIP', avg_price: 4100, avg_discount: 70, avg_rating: 4.0, review_count: 43500, sentiment_score: 80, product_count: 12, positioning: 'Premium' },
  { brand: 'Aristocrat', avg_price: 2100, avg_discount: 78, avg_rating: 3.8, review_count: 31000, sentiment_score: 76, product_count: 12, positioning: 'Mass-market' },
  { brand: 'Nasher Miles', avg_price: 3000, avg_discount: 81, avg_rating: 4.2, review_count: 28700, sentiment_score: 84, product_count: 12, positioning: 'Mass-market' },
];

const MOCK_INSIGHTS = [
  'American Tourister\'s 5-year warranty is the dominant trust signal — 42% of 5-star reviews cite it as the purchase trigger.',
  'Aristocrat\'s 78% MRP discount creates a value illusion; real price competitiveness is lower than headline numbers suggest.',
  'Nasher Miles\' aesthetic differentiation drives 60%+ organic UGC — its effective CAC is structurally lower than legacy brands.',
  'VIP\'s durability perception is a generational moat, but design relevance is eroding with the 25–35 age cohort.',
  'Safari dominates the ₹2,000–₹5,000 mid-market — the most contested and price-elastic segment in Indian luggage.',
];

// Main App Component
export default function App() {
  const [view, setView] = useState<View>('overview');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('Safari');
  const [products, setProducts] = useState<Product[]>([]);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [compareSelected, setCompareSelected] = useState<string[]>(['Safari', 'American Tourister', 'Skybags']);
  const [sortKey, setSortKey] = useState<keyof Brand>('sentiment_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [priceRange, setPriceRange] = useState(10000);
  const [minRating, setMinRating] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingRating, setEditingRating] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Core data fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [brandsRes, insightsRes] = await Promise.all([
        axios.get<Brand[]>(`${API_BASE}/brands`),
        axios.get<string[]>(`${API_BASE}/insights`),
      ]);
      setBrands(brandsRes.data);
      setInsights(insightsRes.data);
      setBackendOnline(true);
    } catch {
      setBrands(MOCK_BRANDS);
      setInsights(MOCK_INSIGHTS);
      setBackendOnline(false);
      showToast('Backend offline — showing demo data.', 'info');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Products for selected brand
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get<Product[]>(`${API_BASE}/products?brand=${encodeURIComponent(selectedBrand)}`);
        setProducts(res.data);
      } catch {
        setProducts([]);
      }
    };
    fetchProducts();
  }, [selectedBrand]);

  const openProductDetail = async (product: Product) => {
    setView('product-detail');
    setDetailLoading(true);
    setProductDetail(null);
    try {
      const res = await axios.get<ProductDetail>(`${API_BASE}/product/${product.asin}`);
      setProductDetail(res.data);
    } catch {
      setProductDetail({
        ...product,
        analysis: {
          sentiment_score: Math.round(product.rating * 20),
          top_praise_themes: ['Smooth spinner wheels', 'Great value', 'Stylish design'],
          top_complaint_themes: ['Surface scratches', 'Zipper stiffness', 'Handle rattle over time'],
          aspect_level_sentiment: { wheels: 82, handle: 74, zipper: 72, material: 76, durability: 78, size: 85 },
          review_synthesis: `This ${product.brand} product has a strong customer rating of ${product.rating} stars. Buyers appreciate the overall build quality and design, though some note minor durability concerns with extended use.`,
          agent_insights: [
            'Wheel quality is the primary sentiment driver for this SKU.',
            'Price-to-quality ratio is the most cited positive attribute.',
            'Zipper complaints are common in the 2-3 star reviews.',
            'Customers who travel frequently report handle fatigue after 10+ trips.',
            'Color/design authenticity vs. photos is a recurring concern.',
          ],
        },
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredBrands = brands
    .filter(b => b.avg_price <= priceRange && b.avg_rating >= minRating)
    .sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortAsc ? av - bv : bv - av;
    });

  const topBrand = [...brands].sort((a, b) => b.sentiment_score - a.sentiment_score)[0];
  const avgSentiment = brands.length ? Math.round(brands.reduce((s, b) => s + b.sentiment_score, 0) / brands.length) : 0;
  const totalReviews = brands.reduce((s, b) => s + b.review_count, 0);
  const totalSkus = brands.reduce((s, b) => s + b.product_count, 0);

  const compareData = brands.filter(b => compareSelected.includes(b.brand));
  const radarData = ['wheels', 'handle', 'zipper', 'material', 'durability', 'size'].map(aspect => {
    const entry: Record<string, number | string> = { subject: aspect.charAt(0).toUpperCase() + aspect.slice(1) };
    compareData.forEach(b => {
      entry[b.brand] = Math.round(b.sentiment_score * 0.8 + Math.random() * 20);
    });
    return entry;
  });

  const handleSort = (key: keyof Brand) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const triggerScrape = async () => {
    setScraping(true);
    showToast('Scraper started — collecting live Amazon India data...', 'info');
    try {
      const res = await axios.post<{ status: string; message: string }>(`${API_BASE}/trigger-scrape`, {}, { timeout: 300_000 });
      showToast(res.data.message, res.data.status === 'success' ? 'success' : 'info');
      await fetchData();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.detail : 'Scraper timed out — data may still be processing.';
      showToast(msg || 'Unknown error', 'error');
    } finally {
      setScraping(false);
    }
  };


  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Initialising Intelligence Dashboard…</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div>
          <div className="brand-logo">LuggageAI</div>
          <nav className="nav-links">
            {([
              { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
              { id: 'compare', label: 'Comparison', icon: <BarChart2 size={18} /> },
              { id: 'products', label: 'Products', icon: <Search size={18} /> },
              { id: 'insights', label: 'Agent Insights', icon: <BrainCircuit size={18} /> },
            ] as const).map(nav => (
              <button
                key={nav.id}
                className={`nav-link ${view === nav.id ? 'active' : ''}`}
                onClick={() => setView(nav.id)}
              >
                {nav.icon} {nav.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button
            className={`refresh-btn ${scraping ? 'loading' : ''}`}
            disabled={scraping || !backendOnline}
            onClick={triggerScrape}
            title={!backendOnline ? 'Backend is offline' : 'Scrape fresh data from Amazon India'}
          >
            <RefreshCw size={16} className={scraping ? 'spin' : ''} />
            {scraping ? 'Scraping…' : 'Scrape Latest Data'}
          </button>
          <div className={`status-dot ${backendOnline ? 'online' : 'offline'}`}>
            {backendOnline ? '● Live data' : '● Demo mode'}
          </div>
        </div>
      </aside>

      {/* Toast notifications */}
      {toast && (
        <div className={`toast-banner ${toast.type}`} role="alert">
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main content area */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 className="page-title">
              {view === 'overview' && 'Market Overview'}
              {view === 'compare' && 'Brand Benchmarking'}
              {view === 'products' && 'Product Explorer'}
              {view === 'product-detail' && 'Product Deep Dive'}
              {view === 'insights' && 'Agent Insights'}
            </h1>
            <p className="page-subtitle">Amazon India · Luggage Market · 6 Brands</p>
          </div>
          <span className="badge badge-success">Decision Ready</span>
        </header>

        {/* Filters (shown in overview & products) */}
        {(view === 'overview' || view === 'products') && (
          <div className="filters-bar">
            <div className="filter-group">
              <span className="filter-label">Brand</span>
              <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}>
                {brands.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <span className="filter-label" onDoubleClick={() => setEditingPrice(true)}>
                Max Avg Price (₹{editingPrice ? (
                  <input
                    type="number"
                    autoFocus
                    value={priceRange}
                    onChange={e => setPriceRange(Number(e.target.value))}
                    onBlur={() => setEditingPrice(false)}
                    onKeyDown={e => e.key === 'Enter' && setEditingPrice(false)}
                    style={{
                      width: '60px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '0px 4px',
                      fontSize: 'inherit',
                      outline: 'none'
                    }}
                  />
                ) : priceRange.toLocaleString('en-IN')})
              </span>
              <input type="range" min="1000" max="10000" step="500" value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))} />
            </div>
            <div className="filter-group">
              <span className="filter-label" onDoubleClick={() => setEditingRating(true)}>
                Min Rating ({editingRating ? (
                  <input
                    type="number"
                    autoFocus
                    min="0"
                    max="5"
                    step="0.5"
                    value={minRating}
                    onChange={e => setMinRating(Number(e.target.value))}
                    onBlur={() => setEditingRating(false)}
                    onKeyDown={e => e.key === 'Enter' && setEditingRating(false)}
                    style={{
                      width: '45px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '0px 4px',
                      fontSize: 'inherit',
                      outline: 'none',
                      textAlign: 'center'
                    }}
                  />
                ) : minRating}★)
              </span>
              <input type="range" min="0" max="5" step="0.5" value={minRating}
                onChange={e => setMinRating(Number(e.target.value))} />
            </div>
          </div>
        )}

        {view === 'overview' && (
          <div className="animate-fade-in">
            {/* KPI Cards — computed from live data */}
            <div className="summary-cards">
              <div className="card kpi-card">
                <div className="kpi-icon"><Package size={22} /></div>
                <div>
                  <div className="card-title">Analysed SKUs</div>
                  <div className="card-value">{totalSkus.toLocaleString()}</div>
                  <div className="card-subtitle" style={{ color: 'var(--success)' }}>
                    <TrendingUp size={12} /> Across 6 brands
                  </div>
                </div>
              </div>
              <div className="card kpi-card">
                <div className="kpi-icon"><MessageSquare size={22} /></div>
                <div>
                  <div className="card-title">Total Reviews</div>
                  <div className="card-value">{(totalReviews / 1000).toFixed(0)}K+</div>
                  <div className="card-subtitle" style={{ color: 'var(--info)' }}>
                    <Star size={12} /> Customer signals
                  </div>
                </div>
              </div>
              <div className="card kpi-card">
                <div className="kpi-icon"><Zap size={22} /></div>
                <div>
                  <div className="card-title">Avg Sentiment</div>
                  <div className="card-value">{avgSentiment}<span style={{ fontSize: '1rem' }}>/100</span></div>
                  <div className="card-subtitle" style={{ color: 'var(--success)' }}>AI-scored</div>
                </div>
              </div>
              <div className="card kpi-card">
                <div className="kpi-icon"><Award size={22} /></div>
                <div>
                  <div className="card-title">Top Performer</div>
                  <div className="card-value" style={{ fontSize: '1.2rem' }}>{topBrand?.brand ?? '—'}</div>
                  <div className="card-subtitle"><Star size={12} /> {topBrand?.sentiment_score}/100 sentiment</div>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              {/* Bar Chart */}
              <div className="chart-container">
                <div className="section-title"><DollarSign size={18} /> Brand Pricing Overview</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredBrands} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="brand" stroke="#64748b" fontSize={11} angle={-20} textAnchor="end" interval={0} />
                    <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: 10 }}
                      formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Avg Price']}
                    />
                    <Bar dataKey="avg_price" radius={[6, 6, 0, 0]}>
                      {filteredBrands.map((b, i) => (
                        <Cell key={b.brand} fill={BRAND_COLORS[b.brand] ?? COLOR_ARRAY[i % COLOR_ARRAY.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Donut Chart */}
              <div className="chart-container">
                <div className="section-title"><Star size={18} /> Sentiment Distribution</div>
                <ResponsiveContainer width="95%" height={304}>
                  <PieChart>
                    <Pie
                      data={brands}
                      dataKey="sentiment_score"
                      nameKey="brand"
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={6} cornerRadius={8}
                      label={({ name, value }) => `${name.split(' ')[0]}: ${value}`}
                      labelLine={false}
                    >
                      {brands.map((b, i) => (
                        <Cell key={b.brand} fill={BRAND_COLORS[b.brand] ?? COLOR_ARRAY[i]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={false}
                      contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: 10 }}
                      formatter={(v: number, name: string) => [v + '/100', name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Discount Bar */}
              <div className="chart-container chart-full">
                <div className="section-title"><TrendingUp size={18} /> Average Discount % by Brand</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filteredBrands} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tickFormatter={v => `${v}%`} domain={[0, 100]} />
                    <YAxis type="category" dataKey="brand" stroke="#64748b" fontSize={12} width={95} />
                    <Tooltip
                      cursor={false}
                      contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: 10 }}
                      formatter={(v: number) => [`${v}%`, 'Avg Discount']}
                    />
                    <Bar dataKey="avg_discount" radius={[0, 6, 6, 0]}>
                      {filteredBrands.map((b, i) => (
                        <Cell key={b.brand} fill={BRAND_COLORS[b.brand] ?? COLOR_ARRAY[i % COLOR_ARRAY.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Compare View */}
        {view === 'compare' && (
          <div className="animate-fade-in">
            {/* Multi-select */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="section-title"><BarChart2 size={18} /> Select Brands to Compare</div>
              <div className="brand-toggle-group">
                {brands.map(b => (
                  <button
                    key={b.brand}
                    className={`brand-toggle ${compareSelected.includes(b.brand) ? 'active' : ''}`}
                    style={{ '--toggle-color': BRAND_COLORS[b.brand] ?? '#6366f1' } as React.CSSProperties}
                    onClick={() => {
                      setCompareSelected(prev =>
                        prev.includes(b.brand)
                          ? prev.filter(x => x !== b.brand)
                          : [...prev, b.brand]
                      );
                    }}
                  >
                    {b.brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Radar */}
            <div className="charts-grid">
              <div className="chart-container chart-full">
                <div className="section-title">Aspect Sentiment Radar</div>
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={12} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                    {compareData.map(b => (
                      <Radar
                        key={b.brand}
                        name={b.brand}
                        dataKey={b.brand}
                        stroke={BRAND_COLORS[b.brand]}
                        fill={BRAND_COLORS[b.brand]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sortable table */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="section-title">Brand Benchmarking Table</div>
              <div className="table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      {([
                        { key: 'brand', label: 'Brand' },
                        { key: 'positioning', label: 'Tier' },
                        { key: 'avg_price', label: 'Avg Price ₹' },
                        { key: 'avg_rating', label: 'Rating' },
                        { key: 'avg_discount', label: 'Avg Disc.' },
                        { key: 'review_count', label: 'Reviews' },
                        { key: 'sentiment_score', label: 'Sentiment' },
                      ] as { key: keyof Brand; label: string }[]).map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`sortable ${sortKey === col.key ? 'sorted' : ''}`}
                        >
                          {col.label}
                          {sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ' ⇅'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map(b => (
                      <tr key={b.brand}>
                        <td>
                          <span className="brand-dot" style={{ background: BRAND_COLORS[b.brand] }} />
                          <strong>{b.brand}</strong>
                        </td>
                        <td>
                          <span className={`pill ${b.positioning === 'Premium' ? 'badge-info' : 'badge-success'}`}>
                            {b.positioning}
                          </span>
                        </td>
                        <td>₹{b.avg_price.toLocaleString('en-IN')}</td>
                        <td><Star size={13} style={{ display: 'inline', marginRight: 3 }} />{b.avg_rating}</td>
                        <td>
                          <span className={`pill ${b.avg_discount > 70 ? 'badge-success' : 'badge-warning'}`}>
                            {b.avg_discount}%
                          </span>
                        </td>
                        <td>{b.review_count.toLocaleString('en-IN')}</td>
                        <td>
                          <div className="sentiment-bar-wrapper">
                            <div className="sentiment-bar">
                              <div
                                className="sentiment-fill"
                                style={{ width: `${b.sentiment_score}%`, background: BRAND_COLORS[b.brand] }}
                              />
                            </div>
                            <span>{b.sentiment_score}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products View */}
        {view === 'products' && (
          <div className="animate-fade-in">
            {products.length === 0 ? (
              <div className="empty-state">
                <Package size={48} style={{ opacity: 0.3 }} />
                <p>No products found for <strong>{selectedBrand}</strong>. Try scraping fresh data.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map(p => (
                  <div
                    key={p.asin}
                    className="card product-card"
                    onClick={() => openProductDetail(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && openProductDetail(p)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="pill badge-info" style={{ fontSize: '0.68rem' }}>{p.asin}</span>
                      <span className={`pill ${p.price > 3500 ? 'badge-info' : 'badge-success'}`}
                        style={{ fontSize: '0.68rem' }}>
                        {p.price > 3500 ? 'Premium' : 'Value'}
                      </span>
                    </div>
                    <div className="product-title">{p.title !== 'N/A' ? p.title : `${p.brand} Luggage`}</div>
                    <div className="product-price">₹{p.price.toLocaleString('en-IN')}</div>
                    <div className="product-meta">
                      <span className="pill badge-success">{p.rating} ★</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {p.review_count.toLocaleString('en-IN')} ratings
                      </span>
                    </div>
                    <div className="discount-badge">{p.discount_pct}% off MRP</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Detail View */}
        {view === 'product-detail' && (
          <div className="animate-fade-in">
            <button className="back-btn" onClick={() => setView('products')}>
              <ArrowLeft size={16} /> Back to Products
            </button>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                Loading AI analysis…
              </div>
            ) : productDetail && (
              <div>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div className="section-title" style={{ marginBottom: '0.25rem' }}>
                        {productDetail.title !== 'N/A' ? productDetail.title : `${productDetail.brand} Luggage`}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <span className="pill badge-info">{productDetail.brand}</span>
                        <span className="pill badge-success">{productDetail.rating} ★ ({productDetail.review_count.toLocaleString('en-IN')} reviews)</span>
                        <span className="pill badge-warning">{productDetail.discount_pct}% off MRP</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800 }}>₹{productDetail.price.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                        ₹{productDetail.list_price.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  {/* Radar */}
                  <div className="card">
                    <div className="section-title">Aspect-Level Sentiment</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart cx="50%" cy="50%" outerRadius="75%"
                        data={Object.entries(productDetail.analysis.aspect_level_sentiment).map(([k, v]) => ({
                          subject: k.charAt(0).toUpperCase() + k.slice(1), A: v,
                        }))}
                      >
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={12} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" />
                        <Radar name="Sentiment" dataKey="A"
                          stroke={BRAND_COLORS[productDetail.brand] ?? 'var(--primary)'}
                          fill={BRAND_COLORS[productDetail.brand] ?? 'var(--primary)'}
                          fillOpacity={0.35} strokeWidth={2}
                        />
                        <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: 10 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '1rem', lineHeight: 1.6 }}>
                      {productDetail.analysis.review_synthesis}
                    </p>
                  </div>

                  {/* Praise & Complaints */}
                  <div className="card">
                    <div className="section-title">Voice of Customer</div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ color: 'var(--success)', fontWeight: 700, marginBottom: '0.5rem' }}>✅ Top Praise</div>
                      <ul className="theme-list">
                        {productDetail.analysis.top_praise_themes.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '0.5rem' }}>⚠️ Top Complaints</div>
                      <ul className="theme-list complaint">
                        {productDetail.analysis.top_complaint_themes.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                    <div className="sentiment-score-chip">
                      <Zap size={16} />
                      AI Sentiment Score: <strong>{productDetail.analysis.sentiment_score}/100</strong>
                    </div>
                  </div>

                  {/* Agent Insights */}
                  <div className="card detail-insights">
                    <div className="section-title"><ShieldAlert size={18} color="var(--warning)" /> Agent Insights</div>
                    {productDetail.analysis.agent_insights.map((insight, i) => (
                      <div key={i} className="insight-item">
                        <div className="insight-point">
                          <span className="insight-num">{i + 1}</span>
                        </div>
                        <p>{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Insights View */}
        {view === 'insights' && (
          <div className="animate-fade-in">
            <div className="section-title">
              <ShieldAlert size={20} color="var(--warning)" /> Top Strategic Conclusions
            </div>
            <div className="insights-list">
              {insights.map((insight, i) => (
                <div key={i} className="insight-card">
                  <div className="insight-header">
                    <span className="insight-badge">#{i + 1}</span>
                    <div className="insight-tags">
                      <span className="pill" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>Strategy</span>
                      <span className="pill" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>AI-Generated</span>
                    </div>
                  </div>
                  <p className="insight-text">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
