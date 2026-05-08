import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Modal, FlatList, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X, Heart, Shuffle, Check, ArrowLeft, ChevronDown } from "lucide-react-native";
import { supabase } from "@/utils/supabase";
import coffeeData from "@/constants/coffee_data.json";
import { useRouter } from "expo-router";

const W = Dimensions.get("window").width;

type Drink = {
  id: string; name: string; description: string;
  caffeine_mg: { min: number; max: number; typical: number };
  serving_ml: number; serving_oz: number;
  caffeine_level: string; pct_daily_limit: number;
  served_hot: boolean; served_iced: boolean;
  milk: boolean; origin: string | null;
};

const ALL_DRINKS: Drink[] = (coffeeData as any).categories.flatMap((c: any) => c.drinks);
const LEVELS = ["very low", "low", "moderate", "high", "very high", "extreme"];
const ORIGINS = Array.from(new Set(ALL_DRINKS.map(d => d.origin).filter(Boolean))) as string[];

const LEVEL_LABEL: Record<string, string> = {
  "very low": "Very Low", "low": "Low", "moderate": "Moderate",
  "high": "High", "very high": "Very High", "extreme": "Extreme",
};

// ── Drink Detail Modal ───────────────────────────────────────
function DrinkModal({ drink, visible, onClose, onLog, favourites, onToggleFav }: {
  drink: Drink | null; visible: boolean; onClose: () => void;
  onLog: (d: Drink) => void; favourites: Set<string>; onToggleFav: (id: string) => void;
}) {
  if (!drink) return null;
  const isFav = favourites.has(drink.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={md.sheet}>
        <View style={md.handle} />

        <View style={md.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={md.name}>{drink.name}</Text>
            <Text style={md.origin}>{drink.origin ?? "Unknown origin"}</Text>
          </View>
          <TouchableOpacity onPress={() => onToggleFav(drink.id)} style={md.iconBtn} activeOpacity={0.7}>
            <Heart size={19} color="#111" fill={isFav ? "#111" : "none"} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={md.iconBtn} activeOpacity={0.7}>
            <X size={19} color="#aaa" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* Caffeine bar */}
          <View style={md.cafCard}>
            <View style={md.cafItem}>
              <Text style={md.cafNum}>{drink.caffeine_mg.min}</Text>
              <Text style={md.cafLbl}>min</Text>
            </View>
            <View style={md.cafSep} />
            <View style={[md.cafItem, { flex: 1.4 }]}>
              <Text style={[md.cafNum, { fontSize: 32 }]}>{drink.caffeine_mg.typical}</Text>
              <Text style={md.cafLbl}>typical mg</Text>
            </View>
            <View style={md.cafSep} />
            <View style={md.cafItem}>
              <Text style={md.cafNum}>{drink.caffeine_mg.max}</Text>
              <Text style={md.cafLbl}>max</Text>
            </View>
          </View>

          {/* Meta rows */}
          <View style={md.metaCard}>
            {[
              ["Caffeine level", LEVEL_LABEL[drink.caffeine_level]],
              ["Serving", `${drink.serving_ml} ml`],
              ["Temperature", [drink.served_hot && "Hot", drink.served_iced && "Iced"].filter(Boolean).join(", ")],
              ["Milk", drink.milk ? "Yes" : "No"],
              ["Daily limit", `${drink.pct_daily_limit}% of 400mg`],
              ...(drink.origin ? [["Origin", drink.origin]] : []),
            ].map(([k, v], i, arr) => (
              <View key={k} style={[md.metaRow, i < arr.length - 1 && md.metaRowBorder]}>
                <Text style={md.metaKey}>{k}</Text>
                <Text style={md.metaVal}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <Text style={md.desc}>{drink.description}</Text>

          {/* Log */}
          <TouchableOpacity style={md.logBtn} onPress={() => { onLog(drink); onClose(); }} activeOpacity={0.85}>
            <Text style={md.logBtnTxt}>Add to today's log</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Compare Modal ────────────────────────────────────────────
function CompareModal({ drinks, visible, onClose }: {
  drinks: Drink[]; visible: boolean; onClose: () => void;
}) {
  const rows: { label: string; get: (d: Drink) => string }[] = [
    { label: "Caffeine", get: d => `${d.caffeine_mg.typical}mg` },
    { label: "Range", get: d => `${d.caffeine_mg.min}–${d.caffeine_mg.max}mg` },
    { label: "Serving", get: d => `${d.serving_ml}ml` },
    { label: "Level", get: d => LEVEL_LABEL[d.caffeine_level] },
    { label: "Hot", get: d => d.served_hot ? "Yes" : "No" },
    { label: "Iced", get: d => d.served_iced ? "Yes" : "No" },
    { label: "Milk", get: d => d.milk ? "Yes" : "No" },
    { label: "Origin", get: d => d.origin ?? "—" },
    { label: "% of limit", get: d => `${d.pct_daily_limit}%` },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={[md.sheet, { maxHeight: "85%" }]}>
        <View style={md.handle} />
        <View style={md.topRow}>
          <Text style={md.name}>Compare</Text>
          <TouchableOpacity onPress={onClose} style={md.iconBtn}><X size={18} color="#aaa" /></TouchableOpacity>
        </View>
        <View style={cm.headerRow}>
          <View style={{ width: 80 }} />
          {drinks.map(d => <Text key={d.id} style={cm.colHead} numberOfLines={2}>{d.name}</Text>)}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.map((r, i) => (
            <View key={i} style={[cm.row, i % 2 === 0 && cm.rowShade]}>
              <Text style={cm.rowLabel}>{r.label}</Text>
              {drinks.map(d => <Text key={d.id} style={cm.cell}>{r.get(d)}</Text>)}
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Picker Modal ─────────────────────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string; options: string[];
  selected: string | null; onSelect: (v: string | null) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={pk.sheet}>
        <Text style={pk.title}>{title}</Text>
        <ScrollView>
          <TouchableOpacity style={pk.row} onPress={() => { onSelect(null); onClose(); }}>
            <Text style={[pk.rowTxt, !selected && pk.rowActive]}>All</Text>
            {!selected && <Check size={13} color="#111" />}
          </TouchableOpacity>
          {options.map(o => (
            <TouchableOpacity key={o} style={pk.row} onPress={() => { onSelect(o); onClose(); }}>
              <Text style={[pk.rowTxt, selected === o && pk.rowActive]}>{o}</Text>
              {selected === o && <Check size={13} color="#111" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Drink Card ───────────────────────────────────────────────
function DrinkCard({ drink, onPress, selected, onToggle }: {
  drink: Drink; onPress: () => void; selected: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={[dc.card, selected && dc.cardSel]} onPress={onPress} activeOpacity={0.8}>
      <TouchableOpacity style={dc.checkWrap} onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={[dc.check, selected && dc.checkActive]}>
          {selected && <Check size={9} color="#fff" strokeWidth={3} />}
        </View>
      </TouchableOpacity>

      <Text style={dc.name} numberOfLines={2}>{drink.name}</Text>

      <Text style={dc.mg}>{drink.caffeine_mg.typical}<Text style={dc.mgUnit}> mg</Text></Text>

      <View style={dc.footer}>
        <Text style={dc.level}>{LEVEL_LABEL[drink.caffeine_level]}</Text>
        <Text style={dc.temp}>{drink.served_hot && drink.served_iced ? "Both" : drink.served_hot ? "Hot" : "Iced"}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ───────────────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();

  const [query,        setQuery]        = useState("");
  const [tab,          setTab]          = useState<"all" | "fav">("all");
  const [tempFilter,   setTempFilter]   = useState<"hot" | "iced" | null>(null);
  const [levelFilter,  setLevelFilter]  = useState<string[]>([]);
  const [milkFilter,   setMilkFilter]   = useState<boolean | null>(null);
  const [originFilter, setOriginFilter] = useState<string | null>(null);
  const [sort,         setSort]         = useState<"caffeine_desc" | "caffeine_asc" | "name" | "origin">("caffeine_desc");
  const [showOrigin,   setShowOrigin]   = useState(false);
  const [showSort,     setShowSort]     = useState(false);

  const [favourites,   setFavourites]   = useState<Set<string>>(new Set());
  const [userId,       setUserId]       = useState<string | null>(null);
  const [session,      setSession]      = useState<any>(null);
  const [compareList,  setCompareList]  = useState<Drink[]>([]);
  const [activeDrink,  setActiveDrink]  = useState<Drink | null>(null);
  const [showDetail,   setShowDetail]   = useState(false);
  const [showCompare,  setShowCompare]  = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) return;
      setSession(s); setUserId(s.user.id);
      supabase.from("favourites").select("drink_id").eq("user_id", s.user.id).then(({ data }) => {
        if (data) setFavourites(new Set(data.map((r: any) => r.drink_id)));
      });
    });
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    if (!userId) return;
    const next = new Set(favourites);
    if (next.has(id)) {
      next.delete(id);
      await supabase.from("favourites").delete().eq("user_id", userId).eq("drink_id", id);
    } else {
      next.add(id);
      await supabase.from("favourites").insert({ user_id: userId, drink_id: id });
    }
    setFavourites(next);
  }, [userId, favourites]);

  const logDrink = useCallback(async (drink: Drink) => {
    if (!session) return;
    await supabase.from("daily_logs").insert({
      user_id: session.user.id, drink_name: drink.name,
      caffeine_mg: drink.caffeine_mg.typical, quantity: 1,
      consumed_at: new Date().toISOString(),
    });
  }, [session]);

  const filtered = useMemo(() => {
    let list = tab === "fav" ? ALL_DRINKS.filter(d => favourites.has(d.id)) : ALL_DRINKS;
    if (query.trim()) { const q = query.toLowerCase(); list = list.filter(d => d.name.toLowerCase().includes(q)); }
    if (tempFilter === "hot")  list = list.filter(d => d.served_hot);
    if (tempFilter === "iced") list = list.filter(d => d.served_iced);
    if (levelFilter.length)    list = list.filter(d => levelFilter.includes(d.caffeine_level));
    if (milkFilter !== null)   list = list.filter(d => d.milk === milkFilter);
    if (originFilter)          list = list.filter(d => d.origin === originFilter);
    if (sort === "caffeine_desc") return [...list].sort((a, b) => b.caffeine_mg.typical - a.caffeine_mg.typical);
    if (sort === "caffeine_asc")  return [...list].sort((a, b) => a.caffeine_mg.typical - b.caffeine_mg.typical);
    if (sort === "name")          return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "origin")        return [...list].sort((a, b) => (a.origin ?? "").localeCompare(b.origin ?? ""));
    return list;
  }, [query, tempFilter, levelFilter, milkFilter, originFilter, sort, tab, favourites]);

  const hasFilters = !!(query || tempFilter || levelFilter.length || milkFilter !== null || originFilter);

  const toggleCompare = (drink: Drink) => {
    setCompareList(prev =>
      prev.find(d => d.id === drink.id)
        ? prev.filter(d => d.id !== drink.id)
        : prev.length < 3 ? [...prev, drink] : prev
    );
  };

  const surpriseMe = () => {
    if (!filtered.length) return;
    const d = filtered[Math.floor(Math.random() * filtered.length)];
    setActiveDrink(d); setShowDetail(true);
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={18} color="#111" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.title}>Explore</Text>
        <TouchableOpacity onPress={surpriseMe} style={s.surpriseBtn} activeOpacity={0.8}>
          <Shuffle size={13} color="#111" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === "all" && s.tabActive]} onPress={() => setTab("all")} activeOpacity={0.8}>
          <Text style={[s.tabTxt, tab === "all" && s.tabTxtActive]}>All  <Text style={s.tabCount}>{ALL_DRINKS.length}</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === "fav" && s.tabActive]} onPress={() => setTab("fav")} activeOpacity={0.8}>
          <Text style={[s.tabTxt, tab === "fav" && s.tabTxtActive]}>Saved  <Text style={s.tabCount}>{favourites.size}</Text></Text>
        </TouchableOpacity>
      </View>

      {/* Search + sort */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={14} color="#bbb" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search…"
            placeholderTextColor="#ccc"
            value={query}
            onChangeText={setQuery}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={13} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.sortBtn} onPress={() => setShowSort(true)} activeOpacity={0.8}>
          <Text style={s.sortBtnTxt}>Sort</Text>
          <ChevronDown size={12} color="#555" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chipRow}>
        {(["hot", "iced"] as const).map(t => (
          <TouchableOpacity key={t} style={[s.chip, tempFilter === t && s.chipOn]} onPress={() => setTempFilter(tempFilter === t ? null : t)} activeOpacity={0.75}>
            <Text style={[s.chipTxt, tempFilter === t && s.chipTxtOn]}>{t === "hot" ? "Hot" : "Iced"}</Text>
          </TouchableOpacity>
        ))}
        {LEVELS.map(l => (
          <TouchableOpacity key={l} style={[s.chip, levelFilter.includes(l) && s.chipOn]} onPress={() => setLevelFilter(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])} activeOpacity={0.75}>
            <Text style={[s.chipTxt, levelFilter.includes(l) && s.chipTxtOn]}>{LEVEL_LABEL[l]}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.chip, milkFilter === true && s.chipOn]} onPress={() => setMilkFilter(milkFilter === true ? null : true)} activeOpacity={0.75}>
          <Text style={[s.chipTxt, milkFilter === true && s.chipTxtOn]}>Milk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.chip, milkFilter === false && s.chipOn]} onPress={() => setMilkFilter(milkFilter === false ? null : false)} activeOpacity={0.75}>
          <Text style={[s.chipTxt, milkFilter === false && s.chipTxtOn]}>No milk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.chip, !!originFilter && s.chipOn, { flexDirection: "row", gap: 3 }]} onPress={() => setShowOrigin(true)} activeOpacity={0.75}>
          <Text style={[s.chipTxt, !!originFilter && s.chipTxtOn]}>{originFilter ?? "Origin"}</Text>
          <ChevronDown size={10} color={originFilter ? "#fff" : "#777"} />
        </TouchableOpacity>
        {hasFilters && (
          <TouchableOpacity style={s.clearChip} onPress={() => { setQuery(""); setTempFilter(null); setLevelFilter([]); setMilkFilter(null); setOriginFilter(null); }} activeOpacity={0.75}>
            <Text style={s.clearChipTxt}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Compare bar */}
      {compareList.length > 0 && (
        <View style={s.compareBar}>
          <Text style={s.compareBarTxt}>{compareList.length} selected</Text>
          {compareList.length >= 2 && (
            <TouchableOpacity style={s.compareBarBtn} onPress={() => setShowCompare(true)} activeOpacity={0.85}>
              <Text style={s.compareBarBtnTxt}>Compare</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setCompareList([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={13} color="#aaa" />
          </TouchableOpacity>
        </View>
      )}

      {/* Count */}
      <View style={s.countRow}>
        <Text style={s.countTxt}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</Text>
        {!compareList.length && <Text style={s.compareTip}>Hold to compare</Text>}
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        numColumns={2}
        contentContainerStyle={s.grid}
        columnWrapperStyle={{ gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={s.empty}>No drinks match</Text>}
        renderItem={({ item }) => (
          <DrinkCard
            drink={item}
            onPress={() => { setActiveDrink(item); setShowDetail(true); }}
            selected={!!compareList.find(d => d.id === item.id)}
            onToggle={() => toggleCompare(item)}
          />
        )}
      />

      <DrinkModal
        drink={activeDrink} visible={showDetail}
        onClose={() => setShowDetail(false)}
        onLog={logDrink} favourites={favourites} onToggleFav={toggleFav}
      />
      <CompareModal drinks={compareList} visible={showCompare} onClose={() => setShowCompare(false)} />
      <PickerModal visible={showOrigin} title="Origin" options={ORIGINS} selected={originFilter} onSelect={setOriginFilter} onClose={() => setShowOrigin(false)} />
      <PickerModal
        visible={showSort} title="Sort by"
        options={["Caffeine ↓", "Caffeine ↑", "Name A–Z", "Origin"]}
        selected={{ caffeine_desc: "Caffeine ↓", caffeine_asc: "Caffeine ↑", name: "Name A–Z", origin: "Origin" }[sort] ?? null}
        onSelect={v => {
          const map: Record<string, typeof sort> = { "Caffeine ↓": "caffeine_desc", "Caffeine ↑": "caffeine_asc", "Name A–Z": "name", "Origin": "origin" };
          if (v && map[v]) setSort(map[v]);
        }}
        onClose={() => setShowSort(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:    { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#efefef", marginRight: 10 },
  title:      { flex: 1, fontSize: 18, fontWeight: "800", color: "#111", letterSpacing: -0.4 },
  surpriseBtn:{ width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#efefef" },

  tabRow:       { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: "#ebebeb", borderRadius: 12, padding: 3 },
  tab:          { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabActive:    { backgroundColor: "#fff" },
  tabTxt:       { fontSize: 13, fontWeight: "600", color: "#aaa" },
  tabTxtActive: { color: "#111" },
  tabCount:     { fontWeight: "400", color: "#ccc" },

  searchRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput:{ flex: 1, fontSize: 14, color: "#111", padding: 0 },
  sortBtn:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  sortBtnTxt:{ fontSize: 13, fontWeight: "600", color: "#333" },

  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipRow:    { paddingHorizontal: 16, gap: 6, flexDirection: "row", alignItems: "center" },
  chip:       { backgroundColor: "#ebebeb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn:     { backgroundColor: "#111" },
  chipTxt:    { fontSize: 12, fontWeight: "600", color: "#555" },
  chipTxtOn:  { color: "#fff" },
  clearChip:  { backgroundColor: "#ebebeb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  clearChipTxt:{ fontSize: 12, fontWeight: "600", color: "#aaa" },

  compareBar:     { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 8, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  compareBarTxt:  { flex: 1, fontSize: 13, fontWeight: "600", color: "#111" },
  compareBarBtn:  { backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  compareBarBtnTxt:{ fontSize: 12, fontWeight: "700", color: "#fff" },

  countRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 },
  countTxt:   { fontSize: 12, color: "#bbb", fontWeight: "500" },
  compareTip: { fontSize: 11, color: "#ddd" },

  grid:  { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { textAlign: "center", color: "#ccc", fontSize: 13, marginTop: 48, fontWeight: "500" },
});

// Card
const dc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardSel:   { borderWidth: 1.5, borderColor: "#111" },
  checkWrap: { position: "absolute", top: 10, right: 10 },
  check:     { width: 17, height: 17, borderRadius: 5, borderWidth: 1.5, borderColor: "#ddd", alignItems: "center", justifyContent: "center" },
  checkActive:{ backgroundColor: "#111", borderColor: "#111" },
  name:      { fontSize: 13, fontWeight: "700", color: "#111", lineHeight: 18, marginBottom: 8, paddingRight: 22 },
  mg:        { fontSize: 24, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  mgUnit:    { fontSize: 12, fontWeight: "500", color: "#bbb" },
  footer:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  level:     { fontSize: 10, fontWeight: "600", color: "#999" },
  temp:      { fontSize: 10, fontWeight: "500", color: "#ccc" },
});

// Modal
const md = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet:    { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "88%" },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: "#e8e8e8", alignSelf: "center", marginBottom: 20 },
  topRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  name:     { fontSize: 20, fontWeight: "800", color: "#111", letterSpacing: -0.4, lineHeight: 26 },
  origin:   { fontSize: 12, color: "#bbb", fontWeight: "500", marginTop: 3 },
  iconBtn:  { width: 34, height: 34, alignItems: "center", justifyContent: "center" },

  cafCard:  { flexDirection: "row", alignItems: "center", backgroundColor: "#f8f8f8", borderRadius: 16, padding: 18, marginBottom: 14 },
  cafItem:  { flex: 1, alignItems: "center", gap: 4 },
  cafSep:   { width: 1, height: 30, backgroundColor: "#efefef" },
  cafNum:   { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  cafLbl:   { fontSize: 10, color: "#bbb", fontWeight: "500" },

  metaCard:    { backgroundColor: "#f8f8f8", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  metaRow:     { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  metaRowBorder:{ borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  metaKey:     { fontSize: 13, color: "#aaa", fontWeight: "500" },
  metaVal:     { fontSize: 13, color: "#111", fontWeight: "600" },

  desc:   { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 20 },
  logBtn: { height: 50, borderRadius: 14, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  logBtnTxt:{ fontSize: 14, fontWeight: "700", color: "#fff" },
});

// Compare
const cm = StyleSheet.create({
  headerRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", marginBottom: 4 },
  colHead:   { flex: 1, fontSize: 11, fontWeight: "700", color: "#111", textAlign: "center" },
  row:       { flexDirection: "row", paddingVertical: 10 },
  rowShade:  { backgroundColor: "#fafafa" },
  rowLabel:  { width: 80, fontSize: 12, color: "#999", fontWeight: "500" },
  cell:      { flex: 1, fontSize: 12, fontWeight: "600", color: "#111", textAlign: "center" },
});

// Picker
const pk = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "55%" },
  title: { fontSize: 15, fontWeight: "800", color: "#111", marginBottom: 14 },
  row:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  rowTxt:   { fontSize: 14, color: "#444" },
  rowActive:{ fontWeight: "700", color: "#111" },
});
