"use client"
import { useEffect, useState } from "react"
import api, { getApiErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bike, Car, Crown, Save, TrendingUp } from "lucide-react"

interface FareConfig {
  id: string
  rideType: "bike" | "car" | "premium"
  baseFare: number
  perKm: number
  perMin: number
  minFare: number
  surgeMultiplier: number
  cancelFreeWindowS: number
  cancelFee: number
  currency: string
  isActive: boolean
  updatedAt: string
}

const EDITABLE = [
  "baseFare",
  "perKm",
  "perMin",
  "minFare",
  "surgeMultiplier",
  "cancelFreeWindowS",
  "cancelFee",
] as const
type EditableKey = (typeof EDITABLE)[number]

const FIELDS: { key: EditableKey; label: string; step: number }[] = [
  { key: "baseFare", label: "Base fare (NPR)", step: 1 },
  { key: "perKm", label: "Per km (NPR)", step: 1 },
  { key: "perMin", label: "Per min (NPR)", step: 0.5 },
  { key: "minFare", label: "Minimum fare (NPR)", step: 1 },
  { key: "surgeMultiplier", label: "Surge (1.0–3.0)", step: 0.1 },
  { key: "cancelFreeWindowS", label: "Free-cancel window (s)", step: 10 },
  { key: "cancelFee", label: "Cancellation fee (NPR)", step: 5 },
]

const ICON = { bike: Bike, car: Car, premium: Crown } as const

export default function PricingPage() {
  const [configs, setConfigs] = useState<FareConfig[]>([])
  const [drafts, setDrafts] = useState<Record<string, Record<EditableKey, string>>>({})
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get("/admin/pricing")
      .then((res) => {
        if (cancelled) return
        const list: FareConfig[] = res.data.data.configs
        setConfigs(list)
        const d: Record<string, Record<EditableKey, string>> = {}
        for (const c of list) {
          d[c.rideType] = Object.fromEntries(
            EDITABLE.map((k) => [k, String(c[k])]),
          ) as Record<EditableKey, string>
        }
        setDrafts(d)
      })
      .catch((error) => {
        if (!cancelled) toast.error(getApiErrorMessage(error, "Failed to load pricing"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const setField = (rideType: string, key: EditableKey, value: string) => {
    setDrafts((d) => ({ ...d, [rideType]: { ...d[rideType], [key]: value } }))
  }

  const save = async (config: FareConfig) => {
    const draft = drafts[config.rideType]
    const patch: Partial<Record<EditableKey, number>> = {}
    for (const key of EDITABLE) {
      const num = Number(draft[key])
      if (!Number.isNaN(num) && num !== config[key]) patch[key] = num
    }
    if (Object.keys(patch).length === 0) {
      toast.info("No changes to save")
      return
    }
    try {
      setSavingType(config.rideType)
      await api.patch(`/admin/pricing/${config.rideType}`, patch)
      toast.success(`${config.rideType} pricing updated`)
      setRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update pricing"))
    } finally {
      setSavingType(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pricing & Surge</h1>
        <p className="text-gray-600 mt-1">
          Tune fares, surge, and cancellation policy per ride type. Changes apply to the next estimate.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500 py-8 text-center">Loading pricing…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {configs.map((config) => {
            const Icon = ICON[config.rideType]
            const draft = drafts[config.rideType]
            const surged = Number(draft?.surgeMultiplier) > 1
            return (
              <Card key={config.id} className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2 capitalize">
                      <Icon className="w-5 h-5 text-crimson" />
                      {config.rideType}
                    </span>
                    {surged && (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        surge
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs text-gray-500">{f.label}</Label>
                      <Input
                        type="number"
                        step={f.step}
                        value={draft?.[f.key] ?? ""}
                        onChange={(e) => setField(config.rideType, f.key, e.target.value)}
                      />
                    </div>
                  ))}
                  <Button
                    className="w-full bg-crimson hover:bg-crimson-ink"
                    disabled={savingType === config.rideType}
                    onClick={() => save(config)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingType === config.rideType ? "Saving…" : "Save"}
                  </Button>
                  <p className="text-xs text-gray-400 text-center">
                    Updated {new Date(config.updatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
