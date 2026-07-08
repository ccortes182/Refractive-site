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
import Campaigns from './pages/Campaigns'
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
import LockedFeature from './components/LockedFeature'

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
      <BrowserRouter basename="/lucerna-app">
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
                <Route path="/products" element={<Products {...dr} />} />
                <Route path="/efficiency" element={<Efficiency {...dr} />} />
                <Route path="/incrementality" element={
                  <LockedFeature tier="lumen" page title="Incrementality Testing"
                    value="Lift tests, iROAS, and the calibration factors that keep your dashboard honest. This is where the modeled numbers come from.">
                    <Incrementality {...dr} />
                  </LockedFeature>
                } />
                <Route path="/mmm" element={
                  <LockedFeature tier="lumen" page title="Media Mix Modeling"
                    value="Saturation curves, adstock, and a budget simulator that shows what moving $10K between channels actually does to revenue.">
                    <MediaMix {...dr} />
                  </LockedFeature>
                } />
                <Route path="/campaigns" element={<Campaigns {...dr} />} />
                <Route path="/creative" element={
                  <LockedFeature tier="pro" page title="Creative Intelligence"
                    value="Hook rates, fatigue curves, A/B significance, and audience-level creative ROAS. Know which ad to kill before the platform tells you.">
                    <Creative {...dr} />
                  </LockedFeature>
                } />
                <Route path="/cohorts" element={<Cohorts {...dr} />} />
                <Route path="/tracking" element={<Tracking {...dr} />} />
                <Route path="/forecasting" element={<Forecasting {...dr} />} />
                <Route path="/geo" element={<Geo {...dr} />} />
                <Route path="/profitability" element={<Profitability {...dr} />} />
                <Route path="/inventory" element={<Inventory {...dr} />} />
                <Route path="/subscriptions" element={<Subscriptions {...dr} />} />
                <Route path="/competitive" element={
                  <LockedFeature tier="pro" page title="Competitive Intelligence"
                    value="Share of search, share of voice, CPM pressure, and price positioning against the brands you actually compete with.">
                    <Competitive {...dr} />
                  </LockedFeature>
                } />
                <Route path="/alerts" element={<Alerts {...dr} />} />
                <Route path="/reports" element={<Reports {...dr} />} />
                <Route path="/journeys" element={<Journeys {...dr} />} />
                <Route path="/ai-insights" element={
                  <LockedFeature tier="pro" page title="AI Insights"
                    value="A weekly analyst memo, creative clustering, and ranked hypotheses generated from your own data. Like having a growth analyst on retainer.">
                    <AIInsights {...dr} />
                  </LockedFeature>
                } />
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
