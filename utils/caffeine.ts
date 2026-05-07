import AsyncStorage from "@react-native-async-storage/async-storage";
import coffeeData from "@/constants/coffee_data.json";

// Build lookup map from JSON: name (lowercase) → typical caffeine mg
const COFFEE_DB: Record<string, number> = {};
for (const category of coffeeData.categories) {
  for (const drink of category.drinks) {
    COFFEE_DB[drink.name.toLowerCase()] = drink.caffeine_mg.typical;
  }
}

export async function getCaffeineMg(drinkName: string): Promise<number> {
  const normalized = drinkName.toLowerCase().trim();

  // 1. Check local DB
  for (const key of Object.keys(COFFEE_DB)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return COFFEE_DB[key];
    }
  }

  // 2. Check AsyncStorage cache
  const cacheKey = `caffeine:${normalized}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached !== null) return parseInt(cached);

  // 3. Fallback: call Claude API via fetch
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "YOUR_API_KEY_HERE",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: `How much caffeine in mg is in a standard single serving of "${drinkName}"? Reply with ONLY a number. If it is not a coffee or tea drink, reply 0.`,
          },
        ],
      }),
    });
    const data = await res.json();
    const mg = parseInt(data.content?.[0]?.text?.trim()) || 0;
    await AsyncStorage.setItem(cacheKey, String(mg));
    return mg;
  } catch {
    return 0;
  }
}

export interface LogEntry {
  id: string;
  drink: string;
  mg: number;
  timestamp: number;
}

const LOG_KEY = "caffeine_log";

export async function getLogs(): Promise<LogEntry[]> {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addLog(drink: string, mg: number): Promise<LogEntry> {
  const logs = await getLogs();
  const entry: LogEntry = { id: Date.now().toString(), drink, mg, timestamp: Date.now() };
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify([entry, ...logs]));
  return entry;
}

export async function deleteLog(id: string): Promise<void> {
  const logs = await getLogs();
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(logs.filter((l) => l.id !== id)));
}
