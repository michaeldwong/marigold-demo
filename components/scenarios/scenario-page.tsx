"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import type { ID } from "@/lib/domain/types";
import { rulesEngine } from "@/lib/compliance/mock-rules-engine";
import { runSourcingScenario, type ScenarioInput } from "@/lib/calculations/scenario";
import { macrThreshold } from "@/lib/calculations/material-assistance";
import { contextFor, useWorkspace } from "@/lib/state/workspace";
import { fmtMoney, fmtNum, fmtPct, fmtRange, fmtUsd } from "@/lib/format";
import { Card, CardHeader, PageHeader, Pill, PrototypeNote, Select, cx } from "@/components/ui/primitives";
import { PfePill } from "@/components/ui/status";

interface Preset {
  id: string;
  title: string;
  horizon: "Counterfactual (historical)" | "Forward-looking";
  description: string;
  input: Omit<ScenarioInput, "currentAddersPerUnit" | "alternativeAddersPerUnit"> & { currentAdders: number; altAdders: number };
}

const PRESETS: Preset[] = [
  {
    id: "sep",
    title: "Replace Qingdao Separator with Carolina Membrane — VX-2170 BOM v3.2",
    horizon: "Counterfactual (historical)",
    description: "What if H1 2027 separator had been sourced from a domestic supplier with verified ownership?",
    input: { componentId: "CMP-2170", bomVersionId: "BOM-2170-v3.2", bomLineId: "BOM-2170-v3.2-L3", alternativeSupplierId: "SUP-1840", alternativeUnitCost: 0.19, currentAdders: 0.02, altAdders: 0.004 },
  },
  {
    id: "graph",
    title: "Replace Tianjin graphite with Appalachian graphite — VX-2170 BOM v3.2",
    horizon: "Counterfactual (historical)",
    description: "The v3.3 change, had it been effective January 1 instead of July 1.",
    input: { componentId: "CMP-2170", bomVersionId: "BOM-2170-v3.2", bomLineId: "BOM-2170-v3.2-L2", alternativeSupplierId: "SUP-1821", alternativeUnitCost: 0.34, currentAdders: 0.05, altAdders: 0.006 },
  },
  {
    id: "elec",
    title: "Replace Huaxin electrolyte with Hoshino Electrolyte America — VX-4680 BOM v1.0",
    horizon: "Forward-looking",
    description: "Removes a supplier whose PFE review is incomplete ahead of the 2028 threshold step-up.",
    input: { componentId: "CMP-4680", bomVersionId: "BOM-4680-v1.0", bomLineId: "BOM-4680-v1.0-L4", alternativeSupplierId: "SUP-1869", alternativeUnitCost: 0.34, currentAdders: 0.04, altAdders: 0.008 },
  },
];

export function ScenarioPage() {
  const { dataset, state } = useWorkspace();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const [altSupplier, setAltSupplier] = useState<ID>(preset.input.alternativeSupplierId);
  const [altCost, setAltCost] = useState(preset.input.alternativeUnitCost);
  const [curAdders, setCurAdders] = useState(preset.input.currentAdders);
  const [altAdders, setAltAdders] = useState(preset.input.altAdders);

  const choose = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setAltSupplier(p.input.alternativeSupplierId);
    setAltCost(p.input.alternativeUnitCost);
    setCurAdders(p.input.currentAdders);
    setAltAdders(p.input.altAdders);
  };

  const result = useMemo(
    () =>
      runSourcingScenario(rulesEngine, dataset, contextFor(state), {
        ...preset.input,
        alternativeSupplierId: altSupplier,
        alternativeUnitCost: altCost,
        currentAddersPerUnit: curAdders,
        alternativeAddersPerUnit: altAdders,
      }),
    [dataset, state, preset, altSupplier, altCost, curAdders, altAdders],
  );

  const bom = dataset.bomVersions.find((b) => b.id === preset.input.bomVersionId)!;
  const line = bom.lines.find((l) => l.id === preset.input.bomLineId)!;
  const mat = dataset.materials.find((m) => m.id === line.materialId)!;
  const cur = dataset.suppliers.find((s) => s.id === result.current.supplierId)!;
  const alt = dataset.suppliers.find((s) => s.id === altSupplier)!;
  const comp = dataset.components.find((c) => c.id === preset.input.componentId)!;
  const candidates = dataset.suppliers.filter((s) => s.id !== cur.id && s.id !== "SUP-INT" && dataset.bomVersions.some((b) => b.lines.some((l) => l.supplierId === s.id && dataset.materials.find((m) => m.id === l.materialId)?.role === mat.role)));

  return (
    <div>
      <PageHeader
        eyebrow="Planning"
        title="Scenario analysis"
        subtitle="Compare sourcing options on landed cost and 45X credit preserved. The scenario re-runs the same rules engine on a modified BOM — no separate math."
      />
      <div className="mb-4 grid grid-cols-1 gap-2 lg:grid-cols-3">
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => choose(p.id)} className={cx("rounded-lg border px-4 py-3 text-left transition", p.id === presetId ? "border-ink bg-surface shadow-sm" : "border-line bg-subtle hover:border-line-strong")}>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-ink-3" />
              <Pill tone={p.horizon === "Forward-looking" ? "info" : "mute"} dot={false}>
                {p.horizon}
              </Pill>
            </div>
            <div className="mt-1.5 text-[12.5px] font-semibold">{p.title}</div>
            <div className="mt-0.5 text-[11.5px] text-ink-3">{p.description}</div>
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-[12.5px]">
          <span className="eyebrow">Scenario</span>
          <span className="font-semibold">
            Replace {cur.name} with {alt.name}
          </span>
          <span className="text-ink-3">
            · {comp.shortName} · BOM {bom.version} ({fmtRange(bom.effective.from, bom.effective.to)}) · {mat.name} · {fmtNum(result.unitsAffected)} units in scope
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader eyebrow="Current supplier" title={cur.name} subtitle={`${cur.facilities[0].city}, ${cur.facilities[0].country}`} />
          <div className="space-y-2 px-4 py-3 text-[12.5px]">
            <Row label="Cost / unit">{fmtUsd(result.current.unitCost)}</Row>
            <Row label="Tariff & freight / unit">
              <NumInput value={curAdders} onChange={setCurAdders} />
            </Row>
            <Row label="Landed cost / unit">{fmtUsd(result.current.landed, 3)}</Row>
            <Row label="PFE status">
              <PfePill status={cur.pfeStatusByYear[Number(bom.effective.from.slice(0, 4))] ?? "not_evaluated"} />
            </Row>
            <Row label="Ultimate parent">{cur.ultimateParent.value ?? <span className="text-bad">Unknown</span>}</Row>
            <Row label="MACR (supported, annual)">{fmtPct(result.current.macrSupported)}</Row>
            <Row label="Estimated credit impact">
              <span className={cx("font-semibold", result.current.atRiskFromLine ? "text-bad" : "text-ink")}>{result.current.atRiskFromLine ? `-${fmtMoney(result.current.atRiskFromLine)}` : "$0"}</span>
            </Row>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Alternative supplier" title={<Select label="Alternative supplier" value={altSupplier} onChange={setAltSupplier} options={candidates.map((s) => ({ value: s.id, label: s.name }))} className="h-7 max-w-full" />} subtitle={`${alt.facilities[0].city}, ${alt.facilities[0].country}`} />
          <div className="space-y-2 px-4 py-3 text-[12.5px]">
            <Row label="Cost / unit">
              <NumInput value={altCost} onChange={setAltCost} />
            </Row>
            <Row label="Tariff & freight / unit">
              <NumInput value={altAdders} onChange={setAltAdders} />
            </Row>
            <Row label="Landed cost / unit">{fmtUsd(result.alternative.landed, 3)}</Row>
            <Row label="PFE status">
              <PfePill status={alt.pfeStatusByYear[Number(bom.effective.from.slice(0, 4))] ?? "not_evaluated"} />
            </Row>
            <Row label="Ultimate parent">{alt.ultimateParent.value ?? <span className="text-bad">Unknown</span>}</Row>
            <Row label="MACR (supported, annual)">{fmtPct(result.alternative.macrSupported)}</Row>
            <Row label="Estimated credit impact">
              <span className={cx("font-semibold", result.alternative.atRiskFromLine ? "text-bad" : "text-ink")}>{result.alternative.atRiskFromLine ? `-${fmtMoney(result.alternative.atRiskFromLine)}` : "$0"}</span>
            </Row>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="Economic comparison" title="Net estimated impact" />
          <div className="space-y-2 px-4 py-3 text-[12.5px]">
            <Row label="Incremental purchase cost">
              <span className="num">{result.incrementalPurchaseCost >= 0 ? "+" : ""}{fmtMoney(result.incrementalPurchaseCost)}</span>
            </Row>
            <Row label="Credit preserved (supported)">
              <span className="text-ok num">{result.creditPreserved >= 0 ? "+" : ""}{fmtMoney(result.creditPreserved)}</span>
            </Row>
            <div className="border-t border-line pt-2">
              <Row label={<span className="font-semibold text-ink">Net estimated impact</span>}>
                <span className={cx("text-[18px] font-semibold num", result.netImpact >= 0 ? "text-ok" : "text-bad")}>
                  {result.netImpact >= 0 ? "+" : ""}
                  {fmtMoney(result.netImpact)}
                </span>
              </Row>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11.5px] text-ink-3">
              Supported credit {fmtMoney(result.current.supported)} <ArrowRight className="h-3 w-3" /> {fmtMoney(result.alternative.supported)}
            </div>
            <PrototypeNote>
              Mock economics. Credit preserved = change in supported {comp.shortName} credit after re-running the rules engine. Other pending issues on the same lots (e.g. other suppliers) still limit what a single swap can preserve. Qualification time, capacity and contract terms are not modeled.
            </PrototypeNote>
          </div>
        </Card>
      </div>

      <ThresholdOutlook />
    </div>
  );
}

function ThresholdOutlook() {
  const { analysis, dataset } = useWorkspace();
  const years = [2027, 2028, 2029, 2030];
  const rows = dataset.components
    .filter((c) => c.bomVersionIds.length)
    .map((c) => {
      const active = dataset.bomVersions.find((b) => b.componentId === c.id && b.effective.to === null)!;
      const w = analysis.macr[c.id].summary.windows.filter((x) => x.bomVersionId === active.id).at(-1);
      return { c, active, w };
    });
  return (
    <Card className="mt-4">
      <CardHeader title="Threshold outlook — current BOMs" subtitle="Supported MACR of each active BOM version against the scheduled thresholds (diligence-paper values; placeholder). Suppliers acceptable this year may fail later." />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Active BOM</th>
              <th className="r">Supported MACR</th>
              {years.map((y) => (
                <th key={y} className="text-center">
                  {y} · {fmtPct(macrThreshold(y), 0)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, active, w }) => (
              <tr key={c.id}>
                <td className="font-medium">{c.shortName}</td>
                <td>{active.version}</td>
                <td className="r num">{w ? fmtPct(w.supportedRatio) : "—"}</td>
                {years.map((y) => {
                  const t = macrThreshold(y);
                  const ok = w && w.supportedRatio >= t;
                  const margin = w ? w.supportedRatio - t : 0;
                  return (
                    <td key={y} className="text-center">
                      {w ? <Pill tone={ok ? (margin < 0.03 ? "warn" : "ok") : "bad"}>{ok ? (margin < 0.03 ? `Pass · ${fmtPct(margin)} margin` : "Pass") : `Short ${fmtPct(-margin)}`}</Pill> : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      $
      <input
        type="number"
        step="0.001"
        min="0"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-7 w-20 rounded border border-line-strong px-1.5 text-right text-[12.5px] num outline-none focus:border-info"
      />
    </span>
  );
}
