import { useState } from 'react'
import { subDays } from 'date-fns'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { TODAY } from './data/mockData'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Overview from './pages/Overview'
import Channels from './pages/Channels'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Efficiency from './pages/Efficiency'
import Incrementality from './pages/Incrementality'
import MediaMix from './pages/MediaMix'
import Creative from './pages/Creative'
import Cohorts from './pages/Cohorts'
import Tracking from './pages/Tracking'
import Forecasting from './pages/Forecasting'
import Geo from './pages/Geo'
import Profitability from './pages/Profitability'
import Inventory from './pages/Inventory'
import Subscriptions from './pages/Subscriptions'
import Competitive from './pages/Competitive'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Journeys from './pages/Journeys'
import AIInsights from './pages/AIInsights'
import Integrations from './pages/Integrations'
import Transactions from './pages/Transactions'
import Settings from './pages/Settings'

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const [dateRange, setDateRange] = useState({
    start: subDays(TODAY, 29),
    end: TODAY,
    preset: '30d',
  })

  const [compare, setCompare] = useState({
    enabled: false,
    mode: 'previous',
    start: null,
    end: null,
  })

  const dr = { dateRange, compare }

  return (
    <ThemeProvider>
      <BrowserRouter basename="/illuminate-app">
        <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <div
            className="hidden md:block flex-shrink-0 transition-all duration-300"
            style={{ width: sidebarCollapsed ? 64 : 240 }}
          />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              compare={compare}
              onCompareChange={setCompare}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-primary)]">
              <Routes>
                <Route path="/" element={<Overview {...dr} />} />
                <Route path="/channels" element={<Channels {...dr} />} />
                <Route path="/customers" element={<Customers {...dr} />} />
                <Route path="/products" element={<Products dateRange={dateRange} />} />
                <Route path="/efficiency" element={<Efficiency {...dr} />} />
                <Route path="/incrementality" element={<Incrementality {...dr} />} />
                <Route path="/mmm" element={<MediaMix {...dr} />} />
                <Route path="/creative" element={<Creative {...dr} />} />
                <Route path="/cohorts" element={<Cohorts {...dr} />} />
                <Route path="/tracking" element={<Tracking {...dr} />} />
                <Route path="/forecasting" element={<Forecasting {...dr} />} />
                <Route path="/geo" element={<Geo {...dr} />} />
                <Route path="/profitability" element={<Profitability {...dr} />} />
                <Route path="/inventory" element={<Inventory {...dr} />} />
                <Route path="/subscriptions" element={<Subscriptions {...dr} />} />
                <Route path="/competitive" element={<Competitive {...dr} />} />
                <Route path="/alerts" element={<Alerts {...dr} />} />
                <Route path="/reports" element={<Reports {...dr} />} />
                <Route path="/journeys" element={<Journeys {...dr} />} />
                <Route path="/ai-insights" element={<AIInsights {...dr} />} />
                <Route path="/integrations" element={<Integrations {...dr} />} />
                <Route path="/transactions" element={<Transactions {...dr} />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
