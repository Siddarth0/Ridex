"use client"
import { useEffect, useState } from "react"
import api, { getApiErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield } from "lucide-react"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string | null
  diff: Record<string, unknown> | null
  ip: string | null
  createdAt: string
  actor: { id: string; name: string; email: string }
}

const ACTIONS = [
  "driver.approve",
  "driver.reject",
  "driver.suspend",
  "driver.reactivate",
  "user.suspend",
  "user.reactivate",
  "ride.force_cancel",
  "pricing.update",
]

const actionColor = (action: string) => {
  if (action.includes("suspend") || action.includes("reject") || action.includes("force_cancel"))
    return "bg-red-100 text-red-700"
  if (action.includes("approve") || action.includes("reactivate")) return "bg-green-100 text-green-700"
  if (action.includes("pricing")) return "bg-amber-100 text-amber-700"
  return "bg-gray-100 text-gray-700"
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState("all")

  useEffect(() => {
    let cancelled = false
    const params: Record<string, string | number> = { limit: 100 }
    if (action !== "all") params.action = action
    api
      .get("/admin/audit", { params })
      .then((res) => {
        if (!cancelled) setLogs(res.data.data.logs)
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load audit log"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [action])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-crimson" />
            Audit Log
          </h1>
          <p className="text-gray-600 mt-1">Every admin mutation, newest first.</p>
        </div>
        <div className="w-56">
          <Select
            value={action}
            onValueChange={(v) => {
              setLoading(true)
              setAction(v)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Entries ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 py-8 text-center">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No audit entries.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge className={`${actionColor(log.action)} hover:opacity-100`}>{log.action}</Badge>
                      <span className="text-sm text-gray-900">{log.actor.name}</span>
                      <span className="text-xs text-gray-400">{log.actor.email}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </span>
                    {log.ip && <span>ip {log.ip}</span>}
                  </div>
                  {log.diff && (
                    <pre className="mt-2 text-xs bg-white border border-gray-100 rounded p-2 overflow-x-auto text-gray-700">
                      {JSON.stringify(log.diff, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
