import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  CloudSun,
  Gauge,
  LineChart as LineChartIcon,
  PackageCheck,
  RefreshCcw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const interfaces = [
  { id: "dashboard", label: "決策總覽", icon: Gauge },
  { id: "forecast", label: "銷量預測", icon: LineChartIcon },
  { id: "stock", label: "進貨庫存", icon: Boxes },
  { id: "monitor", label: "資料監控", icon: CloudSun },
];

const statusLabel = {
  shortage: "庫存不足",
  overstock: "庫存過剩",
  healthy: "正常",
};

const statusClass = {
  shortage: "danger",
  overstock: "warning",
  healthy: "success",
};

function formatNumber(value) {
  return new Intl.NumberFormat("zh-TW").format(Math.round(Number(value || 0)));
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || `API request failed: ${response.status}`);
  return payload;
}

function useAsyncData(loader, deps = []) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let mounted = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    loader()
      .then(
        (data) => mounted && setState({ loading: false, error: null, data }),
      )
      .catch(
        (error) =>
          mounted &&
          setState({ loading: false, error: error.message, data: null }),
      );
    return () => {
      mounted = false;
    };
  }, deps);

  return state;
}

function Card({ title, icon: Icon, children, action }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Decision Intelligence</p>
          <h2>{title}</h2>
        </div>
        <div className="card-actions">
          {action}
          {Icon && <Icon size={22} />}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message = "目前沒有資料" }) {
  return <div className="empty-state">{message}</div>;
}

function LoadingPanel() {
  return (
    <div className="empty-state loading">
      <RefreshCcw size={18} /> 資料載入中...
    </div>
  );
}

function ErrorPanel({ message }) {
  return <div className="empty-state error">讀取失敗：{message}</div>;
}

function MetricCard({
  title,
  value,
  suffix,
  description,
  icon: Icon,
  tone = "blue",
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-icon">{Icon && <Icon size={22} />}</div>
      <p>{title}</p>
      <strong>
        {value}
        {suffix}
      </strong>
      <span>{description}</span>
    </div>
  );
}

function ForecastChart({ data, height = 330 }) {
  if (!data?.length)
    return <EmptyState message="Supabase 目前沒有可顯示的銷售或預測資料" />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={18} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="actualSales"
          name="歷史銷量"
          stroke="#2563eb"
          strokeWidth={3}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="predictedSales"
          name="AI 預測值"
          stroke="#f97316"
          strokeWidth={3}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="upperBound"
          name="置信區間上緣"
          stroke="#fb923c"
          strokeDasharray="5 5"
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="lowerBound"
          name="置信區間下緣"
          stroke="#fdba74"
          strokeDasharray="5 5"
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DashboardView() {
  const { loading, error, data } = useAsyncData(() => api("/dashboard"), []);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="view-grid">
      <div className="metrics-grid">
        <MetricCard
          title="今日預計銷量"
          value={formatNumber(data.metrics.todayForecast)}
          suffix=" 件"
          description="由 forecasts 表或即時分析值彙整"
          icon={TrendingUp}
          tone="blue"
        />
        <MetricCard
          title="本月銷量達成率"
          value={data.metrics.monthlyAchievementRate}
          suffix="%"
          description="以本月累積銷量 / 預估月目標計算"
          icon={BarChart3}
          tone="green"
        />
        <MetricCard
          title="異動警示"
          value={data.metrics.activeAlerts}
          suffix=" 則"
          description="庫存、模型與銷售波動警示"
          icon={AlertTriangle}
          tone="orange"
        />
      </div>

      <Card title="14 天趨勢快照" icon={LineChartIcon}>
        <ForecastChart data={data.trendSnapshot} height={300} />
      </Card>

      <Card title="自動化進貨預警" icon={ShoppingCart}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>產品</th>
                <th>狀態</th>
                <th>可用庫存</th>
                <th>7 日需求</th>
                <th>建議進貨</th>
              </tr>
            </thead>
            <tbody>
              {data.stockWarnings.map((item) => (
                <tr key={item.productId}>
                  <td>
                    {item.productName}
                    <span>{item.category}</span>
                  </td>
                  <td>
                    <span className={`pill ${statusClass[item.status]}`}>
                      {statusLabel[item.status]}
                    </span>
                  </td>
                  <td>{formatNumber(item.available)}</td>
                  <td>{formatNumber(item.sevenDayDemand)}</td>
                  <td>
                    <strong>{formatNumber(item.recommendedOrderQty)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.stockWarnings.length && (
          <EmptyState message="目前沒有庫存不足或過剩警示" />
        )}
      </Card>

      <Card title="異動警示中心" icon={AlertTriangle}>
        <div className="alert-list">
          {data.alerts.map((alert, index) => (
            <div
              className={`alert-item ${alert.level}`}
              key={`${alert.title}-${index}`}
            >
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ForecastCenter() {
  const productsState = useAsyncData(() => api("/products"), []);
  const [productId, setProductId] = useState("all");
  const [days, setDays] = useState(14);
  const { loading, error, data } = useAsyncData(
    () => api(`/forecast?productId=${productId}&days=${days}`),
    [productId, days],
  );

  const products = productsState.data?.products || [];
  const barColors = [
    "#2563eb",
    "#0ea5e9",
    "#22c55e",
    "#f97316",
    "#ef4444",
    "#8b5cf6",
  ];

  return (
    <div className="view-grid">
      <Card
        title="長短期趨勢圖"
        icon={LineChartIcon}
        action={
          <div className="controls-inline">
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="all">全站產品</option>
              {products.map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              <option value={14}>14 天</option>
              <option value={21}>21 天</option>
              <option value={30}>30 天</option>
            </select>
          </div>
        }
      >
        {loading && <LoadingPanel />}
        {error && <ErrorPanel message={error} />}
        {data && <ForecastChart data={data.series} height={360} />}
        {data?.modelNote && <p className="hint">{data.modelNote}</p>}
      </Card>

      <div className="two-column">
        <Card title="多維度特徵權重視圖" icon={Sparkles}>
          {data?.featureWeights?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.featureWeights}
                layout="vertical"
                margin={{ top: 12, right: 20, left: 20, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" />
                <YAxis type="category" dataKey="name" width={92} />
                <Tooltip />
                <Bar dataKey="contribution" name="貢獻度">
                  {data.featureWeights.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={barColors[index % barColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Supabase feature_weights 表目前沒有資料" />
          )}
        </Card>

        <Card title="非線性變動追蹤" icon={AlertTriangle}>
          <div className="timeline">
            {!data?.nonlinearEvents?.length && (
              <EmptyState message="Supabase nonlinear_events 表目前沒有資料" />
            )}
            {data?.nonlinearEvents?.map((event) => (
              <div
                className="timeline-item"
                key={`${event.date}-${event.type}`}
              >
                <span>{event.date}</span>
                <strong>
                  {event.productName}｜{event.type}
                </strong>
                <p>
                  {event.impact}，{event.response}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StockControl() {
  const { loading, error, data } = useAsyncData(
    () => api("/stock-control"),
    [],
  );
  const productsState = useAsyncData(() => api("/products"), []);
  const [simForm, setSimForm] = useState({
    productId: "all",
    promotionActive: false,
    priceChangePct: 0,
  });
  const [simulation, setSimulation] = useState(null);
  const [orderResult, setOrderResult] = useState(null);

  const orderItems = useMemo(
    () =>
      data?.recommendations
        ?.filter((item) => item.recommendedOrderQty > 0)
        .map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.recommendedOrderQty,
        })) || [],
    [data],
  );

  async function runSimulation() {
    const result = await api("/stock-control/simulate", {
      method: "POST",
      body: JSON.stringify(simForm),
    });
    setSimulation(result);
  }

  async function createPurchaseOrder() {
    try {
      const result = await api("/stock-control/purchase-orders", {
        method: "POST",
        body: JSON.stringify({ items: orderItems }),
      });
      setOrderResult(result);
    } catch (error) {
      setOrderResult({ error: error.message });
    }
  }

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="view-grid">
      <Card
        title="智慧訂單建議"
        icon={PackageCheck}
        action={
          <button
            className="primary"
            onClick={createPurchaseOrder}
            disabled={!orderItems.length}
          >
            一鍵產生採購單
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>產品</th>
                <th>庫存狀態</th>
                <th>可用庫存</th>
                <th>安全庫存</th>
                <th>建議訂購量</th>
                <th>信心分數</th>
              </tr>
            </thead>
            <tbody>
              {data.recommendations.map((item) => (
                <tr key={item.productId}>
                  <td>
                    {item.productName}
                    <span>{item.category}</span>
                  </td>
                  <td>
                    <span className={`pill ${statusClass[item.status]}`}>
                      {statusLabel[item.status]}
                    </span>
                  </td>
                  <td>{formatNumber(item.available)}</td>
                  <td>{formatNumber(item.safetyStock)}</td>
                  <td>
                    <strong>{formatNumber(item.recommendedOrderQty)}</strong>
                  </td>
                  <td>{Math.round(item.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orderResult?.order && (
          <p className="success-message">
            採購單已建立：{orderResult.order.id || orderResult.order.created_at}
            （已寫入 Supabase）
          </p>
        )}
        {orderResult?.error && (
          <p className="error-message">採購單建立失敗：{orderResult.error}</p>
        )}
      </Card>

      <div className="two-column">
        <Card title="模擬情境分析" icon={Sparkles}>
          <div className="form-grid">
            <label>
              產品
              <select
                value={simForm.productId}
                onChange={(event) =>
                  setSimForm({ ...simForm, productId: event.target.value })
                }
              >
                <option value="all">全站產品</option>
                {productsState.data?.products?.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              價格調整（%）
              <input
                type="number"
                value={simForm.priceChangePct}
                onChange={(event) =>
                  setSimForm({
                    ...simForm,
                    priceChangePct: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={simForm.promotionActive}
                onChange={(event) =>
                  setSimForm({
                    ...simForm,
                    promotionActive: event.target.checked,
                  })
                }
              />
              啟用促銷狀態
            </label>
            <button className="primary" onClick={runSimulation}>
              重新運算情境
            </button>
          </div>
          {simulation && (
            <>
              <div className="simulation-summary">
                <span>
                  原始需求：{formatNumber(simulation.summary.baseDemand)}
                </span>
                <span>
                  模擬需求：{formatNumber(simulation.summary.simulatedDemand)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={simulation.simulated}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="basePredictedSales"
                    name="原始預測"
                    stroke="#94a3b8"
                    fill="#cbd5e1"
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedSales"
                    name="情境預測"
                    stroke="#f97316"
                    fill="#fed7aa"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="hint">{simulation.summary.recommendation}</p>
            </>
          )}
        </Card>

        <Card title="穩定性報告" icon={CheckCircle2}>
          <div className={`stability ${data.stability.riskLevel}`}>
            <strong>{data.stability.bufferSuggestion}</strong>
            <p>平均置信區間寬度：{data.stability.confidenceBandAvg}%</p>
            <p>預測波動分數：{data.stability.volatilityScore}%</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FeatureMonitor() {
  const { loading, error, data } = useAsyncData(
    () => api("/feature-monitor"),
    [],
  );
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="view-grid">
      <div className="two-column">
        <Card title="外部因子監控站：氣候指數" icon={CloudSun}>
          <div className="factor-grid">
            {data.externalFactors.weather.map((item, index) => (
              <div
                className="factor-card"
                key={`${item.region || item.city}-${index}`}
              >
                <strong>{item.region || item.city || "未知區域"}</strong>
                <p>{item.temperature ?? item.temp}°C</p>
                <span>
                  降雨機率{" "}
                  {item.rainfall_probability ?? item.rainProbability ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="模型運行健康度" icon={Gauge}>
          <div className={`health-light ${data.modelHealth.status}`}>
            <span />
            <div>
              <strong>{data.modelHealth.label}</strong>
              <p>
                最後執行：
                {data.modelHealth.lastRunAt
                  ? new Date(data.modelHealth.lastRunAt).toLocaleString("zh-TW")
                  : "Supabase 尚無紀錄"}
              </p>
              <p>
                優化器：{data.modelHealth.optimizer || "Supabase 尚無紀錄"}
                ｜權重更新：
                {data.modelHealth.weightUpdated ? "已完成" : "未完成"}
              </p>
              <small>{data.modelHealth.note}</small>
            </div>
          </div>
        </Card>
      </div>

      <div className="two-column">
        <Card title="節慶行事曆" icon={Sparkles}>
          <div className="timeline compact">
            {data.externalFactors.holidays.map((holiday) => (
              <div className="timeline-item" key={holiday.date}>
                <span>{holiday.date}</span>
                <strong>{holiday.name}</strong>
                <p>預估影響 {holiday.expectedImpact}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="促銷活動排程" icon={ShoppingCart}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>活動</th>
                  <th>狀態</th>
                  <th>期間</th>
                </tr>
              </thead>
              <tbody>
                {data.externalFactors.promotions.map((promo, index) => (
                  <tr key={`${promo.name}-${index}`}>
                    <td>{promo.name}</td>
                    <td>
                      <span className="pill blue">{promo.status}</span>
                    </td>
                    <td>
                      {promo.start_date} ~ {promo.end_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function App() {
  const [active, setActive] = useState("dashboard");
  const ActiveIcon =
    interfaces.find((item) => item.id === active)?.icon || Gauge;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={24} />
          </div>
          <div>
            <strong>AI 決策管理</strong>
            <span>Supabase Analytics</span>
          </div>
        </div>
        <nav>
          {interfaces.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => setActive(id)}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>

      <main>
        <header className="hero">
          <div>
            <p className="eyebrow">Management Console</p>
            <h1>
              <ActiveIcon size={30} />{" "}
              {interfaces.find((item) => item.id === active)?.label}
            </h1>
            <span>
              讓管理者直接透過介面取得銷售預測、庫存建議、異常警示與資料健康度。
            </span>
          </div>
        </header>

        {active === "dashboard" && <DashboardView />}
        {active === "forecast" && <ForecastCenter />}
        {active === "stock" && <StockControl />}
        {active === "monitor" && <FeatureMonitor />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
