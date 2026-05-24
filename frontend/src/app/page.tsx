'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Package,
  Truck,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface KPIMetrics {
  total_forecast_accuracy: number
  inventory_turnover: number
  delivery_on_time: number
  stockout_reduction: number
  cost_savings: number
  alerts_critical: number
  alerts_warning: number
  system_health: string
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<KPIMetrics>({
    total_forecast_accuracy: 0,
    inventory_turnover: 0,
    delivery_on_time: 0,
    stockout_reduction: 0,
    cost_savings: 0,
    alerts_critical: 0,
    alerts_warning: 0,
    system_health: 'healthy'
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading metrics from API
    const loadMetrics = async () => {
      try {
        // In real implementation, this would call the backend API
        const response = await fetch('/api/v1/dashboard/kpis')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        } else {
          // Mock data for demonstration
          setMetrics({
            total_forecast_accuracy: 94.2,
            inventory_turnover: 12.8,
            delivery_on_time: 97.5,
            stockout_reduction: 78.3,
            cost_savings: 245000,
            alerts_critical: 3,
            alerts_warning: 12,
            system_health: 'healthy'
          })
        }
      } catch (error) {
        console.error('Failed to load metrics:', error)
        // Keep mock data
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()
  }, [])

  const kpiCards = [
    {
      title: 'Forecast Accuracy',
      value: `${metrics.total_forecast_accuracy}%`,
      description: 'Accuracy of demand forecasting models',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Inventory Turnover',
      value: `${metrics.inventory_turnover}`,
      description: 'Inventory turnover cycles per year',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'On-Time Delivery',
      value: `${metrics.delivery_on_time}%`,
      description: 'Percentage of on-time deliveries',
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Stockout Reduction',
      value: `${metrics.stockout_reduction}%`,
      description: 'Reduction in inventory stockout incidents',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ]

  const alerts = [
    {
      type: 'critical',
      title: 'Emergency Stock Shortage',
      message: 'Metformin at the Central Branch has less than 2 days of stock remaining',
      time: '10 minutes ago',
      branch: 'Central Branch'
    },
    {
      type: 'warning',
      title: 'Delivery Delay',
      message: 'The delivery route to the Northern Branch is delayed by 2 hours',
      time: '30 minutes ago',
      branch: 'Northern Branch'
    },
    {
      type: 'info',
      title: 'Demand Forecast Completed',
      message: 'Next month\'s demand forecast was calculated for 50 drugs',
      time: '1 hour ago',
      branch: 'System'
    }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Supply Chain Management Dashboard</h1>
          <p className="text-gray-700 mt-1">Overview of AI system performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={metrics.system_health === 'healthy' ? 'default' : 'destructive'}>
            System {metrics.system_health === 'healthy' ? 'Healthy' : 'Needs Attention'}
          </Badge>
          <Button>
            <RefreshCw className="h-4 w-4 ml-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                <p className="text-xs text-gray-600 mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Cost Savings & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Savings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 ml-2 text-green-600" />
              Cost Savings
            </CardTitle>
            <CardDescription>
              Savings achieved through AI-driven optimizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {metrics.cost_savings.toLocaleString()} Toman
            </div>
            <div className="text-sm text-gray-600">
              Compared to traditional methods
            </div>
          </CardContent>
        </Card>

        {/* Alert Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 ml-2 text-orange-600" />
              Alerts Summary
            </CardTitle>
            <CardDescription>
              Current status of system alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{metrics.alerts_critical}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.alerts_warning}</div>
                <div className="text-sm text-gray-600">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Info</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>
            Latest system activities and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div className={`p-1 rounded-full ${
                  alert.type === 'critical' ? 'bg-red-100' :
                  alert.type === 'warning' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.type === 'critical' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 ml-1" />
                      {alert.time}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {alert.branch}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}