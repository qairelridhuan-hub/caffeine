import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import Svg, { Path, Rect, Defs, ClipPath } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Coffee,
  Target,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function AnimatedCoffeeCup({
  fillAnim,
  stroke = "white",
  fill = "rgba(255,255,255,0.85)",
  clipId = "cupInterior",
  size = 90,
}: {
  fillAnim: Animated.Value;
  stroke?: string;
  fill?: string;
  clipId?: string;
  size?: number;
}) {
  const INTERIOR_TOP = 46;
  const INTERIOR_BOTTOM = 84;
  const INTERIOR_H = INTERIOR_BOTTOM - INTERIOR_TOP;

  const fillHeight = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, INTERIOR_H] });
  const fillY      = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [INTERIOR_BOTTOM, INTERIOR_TOP] });

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          <Path d="M 22 46 Q 22 44 24 44 L 66 44 Q 68 44 68 46 L 68 82 Q 68 86 64 86 L 26 86 Q 22 86 22 82 Z" />
        </ClipPath>
      </Defs>

      {/* Coffee fill */}
      <AnimatedRect x={22} y={fillY} width={46} height={fillHeight} fill={fill} clipPath={`url(#${clipId})`} />

      {/* Cup body — rounded rect */}
      <Path
        d="M 20 44 Q 20 42 22 42 L 68 42 Q 70 42 70 44 L 70 82 Q 70 88 64 88 L 26 88 Q 20 88 20 82 Z"
        stroke={stroke} strokeWidth={2.2} fill="none"
      />

      {/* Handle */}
      <Path
        d="M 70 54 C 88 54 88 76 70 76"
        stroke={stroke} strokeWidth={2.2} fill="none" strokeLinecap="round"
      />

      {/* Steam wisps */}
      <Path d="M 34 37 Q 30 31 34 25 Q 38 19 34 13" stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
      <Path d="M 45 35 Q 41 29 45 23 Q 49 17 45 11" stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
      <Path d="M 56 37 Q 52 31 56 25 Q 60 19 56 13" stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
    </Svg>
  );
}

// ── Per-slide animated icons ─────────────────────────────

function AnimatedZap({ animKey, color }: { animKey: number; color: string }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.5); opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 5, stiffness: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      // double flash — feels like an electric zap
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 70, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 70, useNativeDriver: true }),
        Animated.delay(120),
        Animated.timing(opacity, { toValue: 0.2, duration: 70, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 70, useNativeDriver: true }),
      ]).start();
    });
  }, [animKey]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Zap color={color} size={42} strokeWidth={1.2} />
    </Animated.View>
  );
}

function AnimatedTarget({ animKey, color }: { animKey: number; color: string }) {
  const scale = useRef(new Animated.Value(1.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(-45)).current;

  useEffect(() => {
    scale.setValue(1.6); opacity.setValue(0); rotate.setValue(-45);
    Animated.parallel([
      Animated.spring(scale,  { toValue: 1, damping: 12, stiffness: 140, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(rotate,  { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [animKey]);

  const spin = rotate.interpolate({ inputRange: [-45, 0], outputRange: ['-45deg', '0deg'] });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: spin }], opacity }}>
      <Target color={color} size={42} strokeWidth={1.2} />
    </Animated.View>
  );
}

function AnimatedTrendingUp({ animKey, color }: { animKey: number; color: string }) {
  const translateY = useRef(new Animated.Value(22)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scaleX     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(22); opacity.setValue(0); scaleX.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 11, stiffness: 160, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(scaleX,     { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start();
  }, [animKey]);

  return (
    <Animated.View style={{ transform: [{ translateY }, { scaleX }], opacity }}>
      <TrendingUp color={color} size={42} strokeWidth={1.2} />
    </Animated.View>
  );
}

function AnimatedCoffeeBean({ animKey }: { animKey: number; color: string }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate  = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    scale.setValue(0); opacity.setValue(0); rotate.setValue(-30);
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, damping: 7, stiffness: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(rotate,  { toValue: 0, damping: 10, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, [animKey]);

  const rotateDeg = rotate.interpolate({ inputRange: [-30, 0], outputRange: ["-30deg", "0deg"] });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: rotateDeg }], opacity }}>
      <Svg width={42} height={42} viewBox="0 0 100 100">
        {/* Bean filled black */}
        <Path
          d="M50 5 C25 5 8 25 8 50 C8 75 25 95 50 95 C75 95 92 75 92 50 C92 25 75 5 50 5 Z"
          fill="#000"
          stroke="#000"
          strokeWidth={2}
        />
        {/* Centre crease white */}
        <Path
          d="M50 14 C36 28 36 72 50 86"
          fill="none"
          stroke="#fff"
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}


function CountUpStat({ target, prefix, suffix, animKey, style }: {
  target: number; prefix: string; suffix: string; animKey: number; style?: object;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    setDisplay(0);
    const duration = 900;
    const steps = Math.min(target, 60);
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += Math.ceil(target / steps);
      if (current >= target) { setDisplay(target); clearInterval(timer); }
      else { setDisplay(current); }
    }, interval);
    return () => clearInterval(timer);
  }, [animKey]);

  return <Text style={style}>{prefix}{display}{suffix}</Text>;
}

const SLIDES = [
  {
    id: "1",
    Icon: Coffee,
    tag: "WELCOME",
    statCount: 400, statPrefix: "", statSuffix: "mg",
    statLabel: "daily safe limit",
    title: "Your caffeine\ncompanion",
    sub: "Caffeine is the world's most used stimulant. This app helps you stay informed and in control of your daily intake.",
  },
  {
    id: "2",
    Icon: Zap,
    tag: "LOG",
    statCount: 1, statPrefix: "", statSuffix: " tap",
    statLabel: "to log a drink",
    title: "Log every\ndrink instantly",
    sub: "From espresso to energy drinks — search or tap to add any beverage. We've got the caffeine numbers ready for you.",
  },
  {
    id: "3",
    Icon: Target,
    tag: "LIMITS",
    statCount: 200, statPrefix: "", statSuffix: "+",
    statLabel: "drinks in database",
    title: "Know your\nsafe limit",
    sub: "Health experts recommend no more than 400 mg of caffeine per day. We'll track where you are against that limit in real time.",
  },
  {
    id: "4",
    Icon: TrendingUp,
    tag: "INSIGHTS",
    statCount: 7, statPrefix: "", statSuffix: " days",
    statLabel: "of history tracked",
    title: "Spot your\npatterns",
    sub: "See how your intake changes day to day. Understand your habits so you can make smarter choices without giving up what you love.",
  },
  {
    id: "5",
    Icon: Coffee,
    tag: "HEALTH",
    statCount: 30, statPrefix: "−", statSuffix: "%",
    statLabel: "better sleep reported",
    title: "Feel better,\ndrink smarter",
    sub: "Too much caffeine causes anxiety, poor sleep, and crashes. Track it, manage it, and feel the difference.",
  },
];

type Phase = "slides" | "splash";

export default function Onboarding() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("slides");
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [iconAnimKey, setIconAnimKey] = useState(0);
  const busy = useRef(false);
  const dirRef = useRef<1 | -1>(1);

  // Outgoing layer
  const outX = useRef(new Animated.Value(0)).current;
  const outO = useRef(new Animated.Value(1)).current;
  // Incoming layer
  const inX  = useRef(new Animated.Value(0)).current;
  const inO  = useRef(new Animated.Value(0)).current;

  // Per-element entry anims
  const tagY = useRef(new Animated.Value(-16)).current;
  const tagO = useRef(new Animated.Value(0)).current;
  const iconS = useRef(new Animated.Value(0.75)).current;
  const iconO = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;
  const textO = useRef(new Animated.Value(0)).current;

  // Slide 1 coffee fill
  const slideFillAnim = useRef(new Animated.Value(0)).current;

  // Splash animations
  const logoScale    = useRef(new Animated.Value(0.4)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity   = useRef(new Animated.Value(0)).current;
  const btnTranslate = useRef(new Animated.Value(20)).current;
  const fillAnim     = useRef(new Animated.Value(0)).current;
  const cupSpin      = useRef(new Animated.Value(0)).current;
  const cupSwapO     = useRef(new Animated.Value(1)).current;
  const beanSwapO    = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(1)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;
  const taglineY     = useRef(new Animated.Value(16)).current;
  const taglineO     = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(24)).current;
  const titleO       = useRef(new Animated.Value(0)).current;

  function resetEntry() {
    tagY.setValue(-16); tagO.setValue(0);
    iconS.setValue(0.75); iconO.setValue(0);
    textY.setValue(20); textO.setValue(0);
  }

  function playEntry() {
    setIconAnimKey(k => k + 1);
    Animated.stagger(50, [
      Animated.parallel([
        Animated.timing(tagY,  { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(tagO,  { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(iconS, { toValue: 1, damping: 14, stiffness: 160, useNativeDriver: true }),
        Animated.timing(iconO, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textY, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(textO, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]),
    ]).start();
  }

  // Mount: show slide 0 + play entry + start fill
  useEffect(() => {
    inO.setValue(1);
    resetEntry();
    playEntry();
    Animated.timing(slideFillAnim, { toValue: 1, duration: 1000, delay: 400, useNativeDriver: false }).start();
  }, []);

  // Start transition after prevIndex is set
  useEffect(() => {
    if (prevIndex === null) return;
    const dir = dirRef.current;
    const DIST = width;

    outX.setValue(0); outO.setValue(1);
    inX.setValue(dir * DIST); inO.setValue(1);
    resetEntry();

    Animated.parallel([
      Animated.timing(outX, { toValue: dir * -DIST, duration: 300, useNativeDriver: true }),
      Animated.timing(inX,  { toValue: 0,           duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setPrevIndex(null);
      busy.current = false;
      playEntry();
      if (index === 0) {
        slideFillAnim.setValue(0);
        Animated.timing(slideFillAnim, { toValue: 1, duration: 1000, delay: 150, useNativeDriver: false }).start();
      }
    });
  }, [prevIndex]);

  function goTo(next: number, dir: 1 | -1) {
    if (busy.current) return;
    busy.current = true;
    dirRef.current = dir;
    setPrevIndex(index);
    setIndex(next);
  }

  function handlePrev() {
    if (index > 0) goTo(index - 1, -1);
  }

  function handleNext() {
    if (index < SLIDES.length - 1) {
      goTo(index + 1, 1);
    } else {
      setPhase("splash");
    }
  }


  useEffect(() => {
    if (phase !== "splash") return;

    fillAnim.setValue(0);
    cupSpin.setValue(0);
    cupSwapO.setValue(1);
    beanSwapO.setValue(0);
    ringScale.setValue(1);
    ringOpacity.setValue(0);
    titleY.setValue(24); titleO.setValue(0);
    taglineY.setValue(16); taglineO.setValue(0);

    // fade in background
    Animated.timing(splashOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // logo scales in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, damping: 14, stiffness: 160, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    // fill cup → spin → swap to logo → pulse ring → title → tagline → button
    Animated.sequence([
      Animated.timing(fillAnim, { toValue: 1, duration: 650, delay: 150, useNativeDriver: false }),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(cupSpin,  { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(cupSwapO, { toValue: 0, duration: 180, delay: 120, useNativeDriver: true }),
        Animated.timing(beanSwapO,{ toValue: 1, duration: 220, delay: 160, useNativeDriver: true }),
      ]),
      Animated.delay(60),
      // ring pulse
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1.45, damping: 6, stiffness: 120, useNativeDriver: true }),
      ]),
      Animated.timing(ringOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      // title rises
      Animated.parallel([
        Animated.timing(titleO, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, damping: 14, stiffness: 160, useNativeDriver: true }),
      ]),
      // tagline rises
      Animated.parallel([
        Animated.timing(taglineO, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(taglineY, { toValue: 0, damping: 14, stiffness: 160, useNativeDriver: true }),
      ]),
      // button rises
      Animated.parallel([
        Animated.timing(btnOpacity,   { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(btnTranslate, { toValue: 0, damping: 14, stiffness: 160, useNativeDriver: true }),
      ]),
    ]).start();
  }, [phase]);

  async function finish() {
    await AsyncStorage.setItem("onboarded", "1");
    router.replace("/(tabs)");
  }

  const slide = SLIDES[index];

  if (phase === "slides") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />

        {/* Header — step counter + skip */}
        <View style={styles.arrowRow}>
          <Text style={styles.stepCounter}>{index + 1} / {SLIDES.length}</Text>
          <TouchableOpacity onPress={() => setPhase("splash")} activeOpacity={0.6}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slide layers */}
        <View style={styles.slideArea}>
          {/* Outgoing slide */}
          {prevIndex !== null && (() => {
            const prev = SLIDES[prevIndex];
            const PrevIcon = prev.Icon;
            return (
              <Animated.View style={[styles.slideAbsolute, styles.slideInner, { transform: [{ translateX: outX }] }]}>
                <View style={styles.illustrationCard}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{prev.tag}</Text>
                  </View>
                  <CountUpStat target={prev.statCount} prefix={prev.statPrefix} suffix={prev.statSuffix} animKey={0} style={styles.statNumber} />
                  <Text style={styles.statLabel}>{prev.statLabel}</Text>
                  <View style={styles.iconWrap}>
                    {prevIndex === 0
                      ? <AnimatedCoffeeCup fillAnim={slideFillAnim} stroke="#000" fill="#000" clipId="slideCupOut" size={100} />
                      : <PrevIcon color="#000" size={72} strokeWidth={1} />}
                  </View>
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.title}>{prev.title}</Text>
                  <Text style={styles.sub}>{prev.sub}</Text>
                </View>
              </Animated.View>
            );
          })()}

          {/* Incoming slide */}
          <Animated.View style={[styles.slideAbsolute, styles.slideInner, { transform: [{ translateX: inX }] }]}>
            <View style={styles.illustrationCard}>
              <Animated.View style={[styles.tagPill, { opacity: tagO, transform: [{ translateY: tagY }] }]}>
                <Text style={styles.tagPillText}>{slide.tag}</Text>
              </Animated.View>
              <Animated.View style={{ opacity: textO }}>
                <CountUpStat target={slide.statCount} prefix={slide.statPrefix} suffix={slide.statSuffix} animKey={iconAnimKey} style={styles.statNumber} />
              </Animated.View>
              <Animated.Text style={[styles.statLabel, { opacity: textO }]}>{slide.statLabel}</Animated.Text>
              <Animated.View style={[styles.iconWrap, { opacity: iconO, transform: [{ scale: iconS }] }]}>
                {index === 0 && <AnimatedCoffeeCup fillAnim={slideFillAnim} stroke="#000" fill="#000" clipId="slideCup" size={100} />}
                {index === 1 && <AnimatedZap animKey={iconAnimKey} color="#000" />}
                {index === 2 && <AnimatedTarget animKey={iconAnimKey} color="#000" />}
                {index === 3 && <AnimatedTrendingUp animKey={iconAnimKey} color="#000" />}
                {index === 4 && <AnimatedCoffeeBean animKey={iconAnimKey} color="#000" />}
              </Animated.View>
            </View>
            <Animated.View style={[styles.textBlock, { opacity: textO, transform: [{ translateY: textY }] }]}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.sub}>{slide.sub}</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Bottom — dots + next button */}
        <View style={styles.bottom}>
          <TouchableOpacity style={[styles.navBtn, index === 0 && styles.navBtnDisabled]} onPress={handlePrev} activeOpacity={0.85} disabled={index === 0}>
            <ChevronLeft color={index === 0 ? "#ccc" : "#000"} size={22} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <ChevronRight color="#fff" size={22} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function goBackToSlides() {
    setIndex(0);
    setPhase("slides");
  }

  // Splash
  return (
    <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
      <StatusBar style="light" />

      {/* back arrow */}
      <TouchableOpacity style={styles.splashBack} onPress={goBackToSlides} activeOpacity={0.7}>
        <ChevronLeft color="rgba(255,255,255,0.6)" size={22} strokeWidth={2} />
      </TouchableOpacity>

      {/* logo + ring pulse */}
      <View style={styles.splashLogoWrap}>
        {/* pulsing ring behind logo */}
        <Animated.View
          style={[
            styles.splashRing,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
          <View style={styles.splashLogoCircle}>
            <Animated.View
              style={{
                position: "absolute",
                opacity: cupSwapO,
                transform: [{
                  rotate: cupSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }),
                }],
              }}
            >
              <AnimatedCoffeeCup fillAnim={fillAnim} size={72} />
            </Animated.View>
            <Animated.View style={{ position: "absolute", opacity: beanSwapO }}>
              <View style={{ width: 110, height: 110, borderRadius: 55, overflow: "hidden" }}>
                <Image
                  source={require("../assets/logo.png")}
                  style={{ width: 110, height: 110 }}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* app name */}
      <Animated.View style={{ alignItems: "center", opacity: titleO, transform: [{ translateY: titleY }] }}>
        <Text style={styles.splashTitle}>caffeine</Text>
        <View style={styles.splashDivider} />
      </Animated.View>

      {/* tagline */}
      <Animated.View style={{ alignItems: "center", opacity: taglineO, transform: [{ translateY: taglineY }] }}>
        <Text style={styles.splashSub}>Know what you drink.</Text>
        <Text style={styles.splashSub2}>Track your daily caffeine intake.</Text>
      </Animated.View>

      {/* button */}
      <Animated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnTranslate }], width: "100%", marginTop: 16 }}>
        <TouchableOpacity style={styles.continueBtn} onPress={finish} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  stepCounter: { fontSize: 13, fontWeight: "600", color: "#bbb", letterSpacing: 0.5 },
  skipText: { fontSize: 14, fontWeight: "500", color: "#999" },

  slideArea: { flex: 1, overflow: "hidden" },
  slideAbsolute: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  slideInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
    justifyContent: "center",
  },

  illustrationCard: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f4f4f4",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  tagPill: {
    position: "absolute",
    top: 18,
    left: 18,
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagPillText: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 1.5 },
  statNumber: { fontSize: 52, fontWeight: "800", color: "#000", letterSpacing: -2, marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: "500", color: "#999", letterSpacing: 0.3, marginBottom: 16 },
  iconWrap: { alignItems: "center", justifyContent: "center" },

  textBlock: { gap: 10, paddingHorizontal: 4 },
  title: { fontSize: 30, fontWeight: "800", color: "#000", letterSpacing: -0.8, lineHeight: 36 },
  sub: { fontSize: 14, color: "#666", lineHeight: 22 },

  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e0e0e0" },
  dotActive: { width: 22, backgroundColor: "#000", borderRadius: 3 },
  navBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { borderColor: "#f0f0f0" },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  splash: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  splashWords: { alignItems: "center", gap: 6 },
  splashBack: {
    position: "absolute",
    top: 56,
    left: 24,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogoWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
  },
  splashRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  splashLogoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  splashTitle: { fontSize: 42, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  splashDivider: { width: 32, height: 2, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, marginTop: 10 },
  splashSub: { fontSize: 15, color: "rgba(255,255,255,0.55)", letterSpacing: 0.2, textAlign: "center" },
  splashSub2: { fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 0.2, marginTop: 4, textAlign: "center" },
  continueBtn: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: { fontSize: 16, fontWeight: "700", color: "#000", letterSpacing: 0.3 },
});
