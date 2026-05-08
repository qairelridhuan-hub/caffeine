import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Modal, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { X, ChevronLeft } from "lucide-react-native";
import { supabase } from "@/utils/supabase";
import coffeeData from "@/constants/coffee_data.json";

// ── Constants ────────────────────────────────────────────────
const W = Dimensions.get("window").width;
const LABEL_W = 110;
const BAR_AREA = W - 32 - LABEL_W - 36;

// ── Types ────────────────────────────────────────────────────
type Mode      = "min" | "typical" | "max";
type ChartType = "bar" | "dot" | "table";

type Drink = {
  id: string;
  name: string;
  description: string;
  caffeine_mg: { min: number; typical: number; max: number };
  serving_ml: number;
  caffeine_level: string;
  served_hot: boolean;
  served_iced: boolean;
  milk: boolean;
};

// ── Data ─────────────────────────────────────────────────────
const ALL_DRINKS: Drink[] = (coffeeData as any).categories.flatMap(
  (c: any) => c.drinks
);

// ── Helpers ──────────────────────────────────────────────────
function accent(mg: number, limit: number) {
  if (mg > 300)   return "#ef4444";
  if (mg > limit) return "#f59e0b";
  return "#111";
}

function timesLabel(mg: number, limit: number) {
  const x = Math.floor(limit / mg);
  return x <= 0 ? "Exceeds your limit" : `×${x} before your limit`;
}

// ── Component ────────────────────────────────────────────────
export default function CompareScreen() {
  const router = useRouter();
  const [mode,       setMode]       = useState<Mode>("typical");
  const [chart,      setChart]      = useState<ChartType>("bar");
  const [limit,      setLimit]      = useState(400);
  const [selected,   setSelected]   = useState<Drink | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles").select("daily_limit_mg")
        .eq("id", session.user.id).single();
      if (data?.daily_limit_mg) setLimit(data.daily_limit_mg);
    })();
  }, []));

  const drinks = useMemo(
    () => [...ALL_DRINKS].sort((a, b) => b.caffeine_mg[mode] - a.caffeine_mg[mode]),
    [mode]
  );

  const maxMg   = drinks[0]?.caffeine_mg[mode] ?? 400;
  const limitPx = LABEL_W + (limit / maxMg) * BAR_AREA;

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={18} color="#111" strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Compare</Text>
          <Text style={s.sub}>44 drinks · tap any row for details</Text>
        </View>
        <View style={s.controls}>
          <SegmentControl
            options={["Min", "Avg", "Max"]}
            values={["min", "typical", "max"]}
            active={mode}
            onChange={v => setMode(v as Mode)}
          />
          <SegmentControl
            options={["Bar", "Dot", "List"]}
            values={["bar", "dot", "table"]}
            active={chart}
            onChange={v => setChart(v as ChartType)}
          />
        </View>
      </View>

      {/* ── Zone key ── */}
      <View style={s.zoneRow}>
        {[
          { color: "#111",    label: "Within limit" },
          { color: "#f59e0b", label: "Over limit"   },
          { color: "#ef4444", label: "300 mg+"      },
        ].map(z => (
          <View key={z.label} style={s.zoneItem}>
            <View style={[s.zoneDot, { backgroundColor: z.color }]} />
            <Text style={s.zoneLbl}>{z.label}</Text>
          </View>
        ))}
        <View style={s.zoneItem}>
          <View style={s.zoneDash} />
          <Text style={s.zoneLbl}>Your limit</Text>
        </View>
      </View>

      {/* ── Chart ── */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {chart === "bar" && (
          <View style={s.chartWrap}>
            <LimitLine x={limitPx} />
            {drinks.map(d => {
              const mg = d.caffeine_mg[mode];
              const bw = Math.max(3, (mg / maxMg) * BAR_AREA);
              const color = accent(mg, limit);
              return (
                <TouchableOpacity key={d.id} style={s.row} onPress={() => setSelected(d)} activeOpacity={0.55}>
                  <Text style={s.rowLbl} numberOfLines={1}>{d.name}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.bar, { width: bw, backgroundColor: color + "20" }]}>
                      <View style={[s.barAccent, { backgroundColor: color }]} />
                    </View>
                    <Text style={[s.rowMg, { color }]}>{mg}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {chart === "dot" && (
          <View style={s.chartWrap}>
            <LimitLine x={limitPx} />
            {drinks.map(d => {
              const mg    = d.caffeine_mg[mode];
              const dotX  = (mg / maxMg) * BAR_AREA;
              const color = accent(mg, limit);
              return (
                <TouchableOpacity key={d.id} style={s.row} onPress={() => setSelected(d)} activeOpacity={0.55}>
                  <Text style={s.rowLbl} numberOfLines={1}>{d.name}</Text>
                  <View style={s.dotTrack}>
                    <View style={s.dotRail} />
                    <View style={[s.dot, { left: dotX, backgroundColor: color }]} />
                    <Text style={[s.rowMg, { color, position: "absolute", left: dotX + 12 }]}>{mg}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {chart === "table" && (
          <View style={s.tableWrap}>
            <View style={s.tableHead}>
              {["Drink", "Min", "Avg", "Max"].map(h => (
                <Text key={h} style={[s.th, h === "Drink" && { flex: 3, textAlign: "left" }]}>{h}</Text>
              ))}
            </View>
            {drinks.map(d => (
              <TouchableOpacity key={d.id} onPress={() => setSelected(d)} activeOpacity={0.55}>
                <View style={s.tableRow}>
                  <Text style={[s.td, { flex: 3, textAlign: "left", color: "#111", fontWeight: "600" }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={[s.td, { color: accent(d.caffeine_mg.min,     limit) }]}>{d.caffeine_mg.min}</Text>
                  <Text style={[s.td, { color: accent(d.caffeine_mg.typical, limit), fontWeight: "700" }]}>{d.caffeine_mg.typical}</Text>
                  <Text style={[s.td, { color: accent(d.caffeine_mg.max,     limit) }]}>{d.caffeine_mg.max}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      {/* ── Detail modal ── */}
      {selected && (
        <DrinkModal drink={selected} limit={limit} onClose={() => setSelected(null)} />
      )}

    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────

function SegmentControl({ options, values, active, onChange }: {
  options: string[]; values: string[]; active: string; onChange: (v: string) => void;
}) {
  return (
    <View style={seg.wrap}>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={values[i]} activeOpacity={0.8}
          style={[seg.btn, active === values[i] && seg.btnActive]}
          onPress={() => onChange(values[i])}
        >
          <Text style={[seg.txt, active === values[i] && seg.txtActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LimitLine({ x }: { x: number }) {
  return (
    <View style={[ll.line, { left: x }]} pointerEvents="none">
      <Text style={ll.lbl}>limit</Text>
    </View>
  );
}

function DrinkModal({ drink, limit, onClose }: { drink: Drink; limit: number; onClose: () => void }) {
  const meta = [
    drink.served_hot  && "Hot",
    drink.served_iced && "Iced",
    drink.milk        && "Milk",
  ].filter(Boolean).join(" · ");

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={md.sheet}>
        <View style={md.handle} />

        {/* Name + close */}
        <View style={md.top}>
          <Text style={md.name}>{drink.name}</Text>
          <TouchableOpacity onPress={onClose} style={md.close}>
            <X size={14} color="#888" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <Text style={md.desc}>{drink.description}</Text>

        {/* mg band */}
        <View style={md.band}>
          {(["min", "typical", "max"] as Mode[]).map((k, i) => (
            <React.Fragment key={k}>
              {i > 0 && <View style={md.bandDiv} />}
              <View style={md.bandCol}>
                <Text style={md.bandLbl}>{k === "typical" ? "Avg" : k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                <Text style={[md.bandVal, { color: accent(drink.caffeine_mg[k], limit) }]}>
                  {drink.caffeine_mg[k]}<Text style={md.bandUnit}> mg</Text>
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Insight */}
        <View style={md.insight}>
          <Text style={md.insightVal}>{timesLabel(drink.caffeine_mg.typical, limit)}</Text>
          <Text style={md.insightMeta}>{drink.serving_ml}ml · {drink.caffeine_level}{meta ? ` · ${meta}` : ""}</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f2f2f2" },

  header:   { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, gap: 10, flexDirection: "row", alignItems: "center" },
  backBtn:  { width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginRight: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  title:    { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.4 },
  sub:      { fontSize: 11, color: "#bbb", marginTop: 1 },
  controls: { flexDirection: "row", gap: 6 },

  zoneRow:  { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, marginBottom: 8 },
  zoneItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  zoneDot:  { width: 6, height: 6, borderRadius: 3 },
  zoneDash: { width: 10, height: 1.5, backgroundColor: "#777" },
  zoneLbl:  { fontSize: 10, color: "#bbb" },

  scroll:    { paddingBottom: 120 },
  chartWrap: { paddingHorizontal: 16, position: "relative" },

  row:      { flexDirection: "row", alignItems: "center", height: 26, marginBottom: 3 },
  rowLbl:   { width: LABEL_W, fontSize: 11, color: "#777", textAlign: "right", paddingRight: 8 },
  rowMg:    { fontSize: 10, fontWeight: "700", minWidth: 28 },

  barTrack: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  bar:      { height: 14, borderRadius: 3, overflow: "hidden" },
  barAccent:{ width: 3, height: "100%" as any },

  dotTrack: { flex: 1, height: 26, position: "relative", justifyContent: "center" },
  dotRail:  { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "#ddd", top: 13 },
  dot:      { position: "absolute", width: 8, height: 8, borderRadius: 4, top: 9 },

  tableWrap: { paddingHorizontal: 16 },
  tableHead: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
  th:        { flex: 1, fontSize: 10, fontWeight: "700", color: "#bbb", letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" },
  tableRow:  { flexDirection: "row", paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#f0f0f0" },
  td:        { flex: 1, fontSize: 12, color: "#aaa", textAlign: "center" },
});

const seg = StyleSheet.create({
  wrap:      { flexDirection: "row", backgroundColor: "#e4e4e4", borderRadius: 9, padding: 2 },
  btn:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  btnActive: { backgroundColor: "#111" },
  txt:       { fontSize: 11, fontWeight: "600", color: "#999" },
  txtActive: { color: "#fff" },
});

const ll = StyleSheet.create({
  line: { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: "#555", borderStyle: "dashed", zIndex: 5 },
  lbl:  { fontSize: 8, color: "#555", fontWeight: "700", position: "absolute", top: 0, left: 3 },
});

const md = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet:    { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 52, paddingTop: 14 },
  handle:   { width: 32, height: 3, borderRadius: 2, backgroundColor: "#e0e0e0", alignSelf: "center", marginBottom: 22 },

  top:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 },
  name:   { fontSize: 18, fontWeight: "800", color: "#111", letterSpacing: -0.3, flex: 1 },
  close:  { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center", marginLeft: 12 },
  desc:   { fontSize: 12, color: "#aaa", lineHeight: 17, marginBottom: 18 },

  band:     { flexDirection: "row", backgroundColor: "#f7f7f7", borderRadius: 14, paddingVertical: 14, marginBottom: 14 },
  bandCol:  { flex: 1, alignItems: "center" },
  bandDiv:  { width: StyleSheet.hairlineWidth, backgroundColor: "#e0e0e0" },
  bandLbl:  { fontSize: 10, color: "#bbb", fontWeight: "600", letterSpacing: 0.4, marginBottom: 4 },
  bandVal:  { fontSize: 20, fontWeight: "800" },
  bandUnit: { fontSize: 11, fontWeight: "500", color: "#bbb" },

  insight:     { backgroundColor: "#f7f7f7", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  insightVal:  { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 3 },
  insightMeta: { fontSize: 11, color: "#bbb" },
});
