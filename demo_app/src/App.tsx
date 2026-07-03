import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { 
  Network, 
  Code2, 
  Terminal as TerminalIcon, 
  Sliders, 
  FileCode, 
  Play, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Copy, 
  Plus, 
  Trash2, 
  Search, 
  Eye, 
  BookOpen, 
  Info,
  ExternalLink,
  Activity,
  Maximize2,
  Volume2,
  VolumeX,
  Compass,
  Shield,
  Radio,
  Navigation,
  Check,
  Pause
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Preloaded files for Traffic Collision Avoidance System (TCAS) Codebase
const PRELOADED_FILES = [
  {
    path: "tcas_core.py",
    content: `# TCAS Collision Avoidance - Core Logic
import advisory_gen
import config_loader

def evaluate_threat(intruder_altitude, own_altitude, range_nm):
    """Evaluate collision threat and compute advisory."""
    vertical_separation = abs(intruder_altitude - own_altitude)
    collision_threshold = config_loader.get_param("COLLISION_THRESHOLD_FT", 800)
    
    if range_nm < 1.5 and vertical_separation < collision_threshold:
        return advisory_gen.generate_advisory(intruder_altitude, own_altitude)
    return "CLEAR_OF_CONFLICT"`
  },
  {
    path: "advisory_gen.py",
    content: `# Resolution Advisory Generation Engine
import audio_alert

def generate_advisory(intruder_alt, own_alt):
    """Generate resolution advisory to maintain vertical separation."""
    if own_alt > intruder_alt:
        audio_alert.trigger_alert("CLIMB")
        return "CLIMB"
    else:
        audio_alert.trigger_alert("DESCEND")
        return "DESCEND"`
  },
  {
    path: "audio_alert.py",
    content: `# Speech Synthesizer and Audio Alert System
import config_loader

def trigger_alert(command):
    """Trigger dynamic auditory alerts in cockpit speakers."""
    volume = config_loader.get_param("ALERT_VOLUME", 80)
    print(f"[TCAS ALERT - {volume}%]: {command}! {command}!")`
  },
  {
    path: "radar_stream.py",
    content: `# Transponder and ADS-B Stream Processor
import alt_detector

def stream_intruder_positions():
    """Receive raw telemetry packets and parse intruder details."""
    raw_data = get_transponder_packets()
    for pkt in raw_data:
        alt = alt_detector.parse_altitude(pkt['alt_raw'])
        yield {
            'icao': pkt['icao'],
            'alt': alt,
            'range_nm': pkt['range_nm']
        }`
  },
  {
    path: "alt_detector.py",
    content: `# Altitude Sensor Processing and Noise Filtering
import config_loader

def parse_altitude(raw_val):
    """Filter raw pressure altitude using moving average smoothing."""
    noise_factor = config_loader.get_param("ALT_FILTER_NOISE", 0.05)
    return raw_val * (1 - noise_factor)`
  },
  {
    path: "display_panel.py",
    content: `# Cockpit Primary Traffic Display Renderer
import radar_stream

def render_cockpit_pfd():
    """Draw traffic advisory symbols and flight path vector overlays."""
    intruders = radar_stream.get_cached_intruders()
    for target in intruders:
        draw_symbol(target['x'], target['y'], target['threat_level'])`
  },
  {
    path: "config_loader.py",
    content: `# System Parameters & Threshold Profiles Loader
import json

def get_param(name, default_val):
    """Load config parameter safely from static flight profiles."""
    try:
        with open("tcas_config.json") as f:
            return json.load(f).get(name, default_val)
    except Exception:
        return default_val`
  }
];

// Aesthetic Community Color Palette
const COMMUNITY_COLORS = [
  "#2dd4bf", // 1: Teal
  "#f97316", // 2: Orange
  "#a855f7", // 3: Purple
  "#34d399", // 4: Emerald
  "#38bdf8", // 5: Sky
  "#e11d48", // 6: Rose
  "#eab308"  // 7: Yellow
];

export default function App() {
  // App States
  const [files, setFiles] = useState(PRELOADED_FILES);
  const [selectedFile, setSelectedFile] = useState(PRELOADED_FILES[0].path);
  const [fileContent, setFileContent] = useState(PRELOADED_FILES[0].content);
  
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [communitiesCount, setCommunitiesCount] = useState(4);
  const [useSparseEdges, setUseSparseEdges] = useState(true);
  const [resolution, setResolution] = useState(4);
  const [labeledCommunities, setLabeledCommunities] = useState<any[]>([]);
  
  // Interactive UI states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("tcas_core.py");
  const [searchQuery, setSearchQuery] = useState("");
  const [leftTab, setLeftTab] = useState<"code" | "config">("code");
  const [rightTab, setRightTab] = useState<"subsystems" | "report" | "json">("subsystems");
  
  // Gemini Configuration State
  const [geminiActive, setGeminiActive] = useState(false);
  const [configMsg, setConfigMsg] = useState("Checking backend integration status...");
  
  // Terminal emulator state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "Graphify Engine v1.4.2 Initialization completed.",
    "Type or select a command below to explore the codebase cluster graph."
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  
  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLabeling, setIsLabeling] = useState(false);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  
  // Export states
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [rawJsonState, setRawJsonState] = useState<any>(null);
  
  // DOM Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // --- TCAS COLLISION SIMULATOR STATES & RULES ---
  const [activeAppTab, setActiveAppTab] = useState<"graph" | "simulator">("simulator");
  const [intruderDist, setIntruderDist] = useState(12.0); // NM
  const [intruderAltDiff, setIntruderAltDiff] = useState(400); // feet
  const [intruderBearing, setIntruderBearing] = useState(15); // degrees bearing relative to nose (0 to 360)
  const [intruderTrend, setIntruderTrend] = useState<"climb" | "descend" | "stable">("stable");
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1.0); // speed multiplier
  
  // Custom thresholds synced with user request parameters
  const [tcasConfigThresholds] = useState({
    zone1Range: 20.0, // NM devant l'appareil
    zone2Range: 3.3,  // NM
    zone2Alt: 850,    // pieds
    zone3Range: 2.1,  // NM
    zone3Alt: 600,    // pieds
  });

  // NEW: Dynamic Flight Safety & Risk Fusion states
  const [closingRate, setClosingRate] = useState(380); // knots (Taux de rapprochement)
  const [trajectoryRisk, setTrajectoryRisk] = useState(0.15); // Trajectory prediction risk
  const [stabilityRisk, setStabilityRisk] = useState(0.12); // Aircraft stability risk
  const [riskHistory, setRiskHistory] = useState<{tcas: number, global: number}[]>(
    Array.from({ length: 25 }, (_, i) => ({ tcas: 0.05, global: 0.15 }))
  );

  // Sound generator using Web Audio API for immersive cockpit experience
  const playCockpitSound = (type: "beep" | "caution" | "warning") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === "beep") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === "caution") {
        // Double warning beep
        [0, 0.18].forEach(delay => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(950, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.12);
        });
      } else if (type === "warning") {
        // High-low alternating siren
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.setValueAtTime(750, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (err) {
      console.warn("Cockpit Audio failed to initialize:", err);
    }
  };

  const getTcasAlertState = (distance: number, altitudeDiff: number, bearing: number) => {
    const absAlt = Math.abs(altitudeDiff);
    const isAhead = bearing >= 270 || bearing <= 90;
    
    // Calculate Tau-based time to collision in seconds
    const tau = closingRate > 0 ? (distance * 3600) / closingRate : 9999;
    
    let score = 0;
    let tcasZoneLabel: "RA" | "TA" | "MONITOR" | "SAFE" = "SAFE";
    let recommendedAction = "NONE";

    // Piecewise calibration of risk score to match requested zones exactly:
    if (distance <= tcasConfigThresholds.zone3Range && absAlt <= tcasConfigThresholds.zone3Alt) {
      tcasZoneLabel = "RA";
      recommendedAction = altitudeDiff > 0 ? "DESCEND" : "CLIMB";
      
      // Zone 3: RA Alert. Target score: 0.80 -> 1.00
      const dFactor = 1 - (distance / tcasConfigThresholds.zone3Range); 
      const vFactor = 1 - (absAlt / tcasConfigThresholds.zone3Alt); 
      const tauFactor = tau <= 15 ? 1.0 : tau >= 45 ? 0.0 : 1 - ((tau - 15) / 30);
      
      score = 0.80 + 0.19 * (dFactor * 0.4 + vFactor * 0.4 + tauFactor * 0.2);
    } else if (distance <= tcasConfigThresholds.zone2Range && absAlt <= tcasConfigThresholds.zone2Alt) {
      tcasZoneLabel = "TA";
      recommendedAction = "MONITOR";
      
      // Zone 2: TA Alert. Target score: 0.50 -> 0.79
      const dFactor = 1 - ((distance - tcasConfigThresholds.zone3Range) / (tcasConfigThresholds.zone2Range - tcasConfigThresholds.zone3Range));
      const vFactor = 1 - ((absAlt - tcasConfigThresholds.zone3Alt) / (tcasConfigThresholds.zone2Alt - tcasConfigThresholds.zone3Alt));
      const tauFactor = tau <= 30 ? 1.0 : tau >= 60 ? 0.0 : 1 - ((tau - 30) / 30);
      
      score = 0.50 + 0.28 * (Math.max(0, dFactor) * 0.4 + Math.max(0, vFactor) * 0.4 + tauFactor * 0.2);
    } else if (distance <= tcasConfigThresholds.zone1Range && isAhead) {
      tcasZoneLabel = "MONITOR";
      recommendedAction = "TRAFFIC MONITOR";
      
      // Zone 1: Surveillance. Target score: 0.10 -> 0.49
      const dFactor = 1 - ((distance - tcasConfigThresholds.zone2Range) / (tcasConfigThresholds.zone1Range - tcasConfigThresholds.zone2Range));
      score = 0.10 + 0.38 * Math.max(0, dFactor);
    } else {
      tcasZoneLabel = "SAFE";
      recommendedAction = "MAINTAIN";
      
      // Safe zone. Target score: 0.00 -> 0.09
      score = Math.max(0, 0.09 * (1 - (distance / 35)));
    }

    const tcasRiskScore = parseFloat(Math.min(1.0, Math.max(0.0, score)).toFixed(2));
    
    // Construct structured status output object matching specifications
    const tcasStatusObj = {
      zone: tcasZoneLabel,
      tcas_risk_score: tcasRiskScore,
      distance_nm: parseFloat(distance.toFixed(2)),
      vertical_separation_ft: absAlt,
      recommended_action: recommendedAction
    };

    // Zone 3: Within 2.1 NM and altitude difference <= 600 ft
    if (tcasZoneLabel === "RA") {
      const instruction = altitudeDiff > 0 ? "DESCEND" : "CLIMB";
      return {
        zone: 3,
        level: "RA", // Resolution Advisory
        title: "Alerte de Résolution (RA) - ÉVITEMENT IMMÉDIAT !",
        color: "#f43f5e", // Rose/Red
        bgClass: "bg-rose-500/10 border-rose-500/20 text-rose-200",
        btnClass: "bg-rose-600 hover:bg-rose-500 text-white",
        iconColor: "text-rose-400 animate-bounce",
        badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        announcement: instruction === "CLIMB" ? "CLIMB, CLIMB !" : "DESCEND, DESCEND !",
        frenchInstruction: instruction === "CLIMB" 
          ? "MONTEZ IMMÉDIATEMENT ! Évitement par le haut" 
          : "DESCENDEZ IMMÉDIATEMENT ! Évitement par le bas",
        audioTone: "warning",
        desc: "DANGER DE COLLISION IMMINENT : Pénétration de la Zone 3 (< 2.1 NM et séparation verticale < 600 pieds). Le TCAS ordonne une manœuvre d'évitement verticale impérative.",
        tcas_risk_score: tcasRiskScore,
        tcas_status_obj: tcasStatusObj
      };
    }
    
    // Zone 2: Within 3.3 NM and altitude difference <= 850 ft
    if (tcasZoneLabel === "TA") {
      return {
        zone: 2,
        level: "TA", // Traffic Advisory
        title: "Alerte de Trafic (TA) - MISE EN GARDE",
        color: "#f97316", // Orange
        bgClass: "bg-orange-500/10 border-orange-500/20 text-orange-200",
        btnClass: "bg-orange-600 hover:bg-orange-500 text-white",
        iconColor: "text-orange-400 animate-pulse",
        badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
        announcement: "TRAFFIC, TRAFFIC !",
        frenchInstruction: "SURVEILLEZ VISUELLEMENT l'espace aérien. Préparez-vous à manœuvrer.",
        audioTone: "caution",
        desc: "ALERTE TRAFIC : Pénétration de la Zone 2 (< 3.3 NM et séparation verticale < 850 pieds). Mise en garde vocale cockpit activée.",
        tcas_risk_score: tcasRiskScore,
        tcas_status_obj: tcasStatusObj
      };
    }
    
    // Zone 1: Within 20 NM ahead of the aircraft ("devant l'avion")
    if (distance <= tcasConfigThresholds.zone1Range) {
      if (isAhead) {
        return {
          zone: 1,
          level: "MONITOR",
          title: "Intrus Signalé & Surveillé",
          color: "#06b6d4", // Cyan
          bgClass: "bg-cyan-500/10 border-cyan-500/25 text-cyan-200",
          btnClass: "bg-cyan-600 hover:bg-cyan-500 text-white",
          iconColor: "text-cyan-400",
          badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
          announcement: "TRAFFIC TRACKED",
          frenchInstruction: "Surveillance active en cours. Intrus localisé dans le secteur avant.",
          audioTone: "beep",
          desc: "CONTACT RADAR : Cible détectée dans la Zone 1 (< 20 NM devant l'avion). L'appareil est surveillé et affiché sur le display.",
          tcas_risk_score: tcasRiskScore,
          tcas_status_obj: tcasStatusObj
        };
      } else {
        // Within 20 NM but behind/sides (not in the 180° ahead sector)
        return {
          zone: 1,
          level: "MONITOR_SIDE",
          title: "Intrus Hors-Secteur Avant",
          color: "#64748b", // slate gray
          bgClass: "bg-slate-800/40 border-slate-700 text-slate-400",
          btnClass: "bg-slate-700 hover:bg-slate-600 text-white",
          iconColor: "text-slate-400",
          badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
          announcement: "STABLE",
          frenchInstruction: "Cible en secteur arrière ou latéral, hors du faisceau de menace avant de 20 NM.",
          audioTone: "none",
          desc: "CONTACT RADAR : Cible détectée à moins de 20 NM, mais en dehors du secteur de menace frontal.",
          tcas_risk_score: tcasRiskScore,
          tcas_status_obj: tcasStatusObj
        };
      }
    }
    
    // Out of range
    return {
      zone: 0,
      level: "SAFE",
      title: "Ciel Dégagé - Aucun Conflit",
      color: "#10b981", // green
      bgClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
      btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
      iconColor: "text-emerald-400",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      announcement: "CLEAR OF CONFLICT",
      frenchInstruction: "Vol normal. Aucun appareil menaçant détecté.",
      audioTone: "none",
      desc: "SÉCURITÉ : Aucun aéronef intrus identifié dans le périmètre de surveillance de 20 NM du TCAS.",
      tcas_risk_score: tcasRiskScore,
      tcas_status_obj: tcasStatusObj
    };
  };

  // Simulation convergence thread
  useEffect(() => {
    let interval: any;
    if (isSimPlaying) {
      interval = setInterval(() => {
        // Decrease distance toward own aircraft
        setIntruderDist(prev => {
          let next = prev - 0.15 * simSpeed;
          if (next <= 0.1) {
            // Loop scenario
            addTerminalLog("[TCAS SIM] Impact simulé ou évitement accompli. Réinitialisation à 22.0 NM.");
            return 22.0;
          }
          return parseFloat(next.toFixed(2));
        });

        // Fluctuating relative bearing slowly (around the nose)
        setIntruderBearing(prev => {
          let next = prev + (Math.sin(Date.now() / 2000) * 2 * simSpeed);
          if (next < 0) next += 360;
          if (next >= 360) next -= 360;
          return Math.round(next);
        });

        // Altitude changes
        setIntruderAltDiff(prev => {
          let change = 0;
          if (intruderTrend === "climb") {
            change = 12 * simSpeed;
          } else if (intruderTrend === "descend") {
            change = -12 * simSpeed;
          } else {
            // Stable - slight atmospheric drift
            change = Math.sin(Date.now() / 1500) * 3 * simSpeed;
          }
          let next = prev + change;
          if (next > 1500) next = 1500;
          if (next < -1500) next = -1500;
          return Math.round(next);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isSimPlaying, intruderTrend, simSpeed]);

  const lastLevelRef = useRef<string>("SAFE");
  const lastSoundTimeRef = useRef<number>(0);

  const activeAlertState = getTcasAlertState(intruderDist, intruderAltDiff, intruderBearing);

  // Extract continuous TCAS status parameters
  const tcasDetailed = activeAlertState.tcas_status_obj || {
    zone: "SAFE",
    tcas_risk_score: 0.05,
    distance_nm: intruderDist,
    vertical_separation_ft: Math.abs(intruderAltDiff),
    recommended_action: "MAINTAIN"
  };

  // Global Flight Risk Score Fusion: Probabilistic Copula (Union of independent risk events)
  const globalRisk = parseFloat(
    (1 - (1 - tcasDetailed.tcas_risk_score) * (1 - trajectoryRisk) * (1 - stabilityRisk)).toFixed(2)
  );

  // Dynamic risk history compilation hook
  useEffect(() => {
    setRiskHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.tcas === tcasDetailed.tcas_risk_score && last.global === globalRisk) {
        return prev; // deduplicate steady states to prevent infinite loops
      }
      return [...prev.slice(1), { tcas: tcasDetailed.tcas_risk_score, global: globalRisk }];
    });
  }, [tcasDetailed.tcas_risk_score, globalRisk]);

  useEffect(() => {
    const currentLevel = activeAlertState.level;
    const now = Date.now();
    
    // Play alert sound on state transition
    if (currentLevel !== lastLevelRef.current) {
      lastLevelRef.current = currentLevel;
      if (!isSoundMuted) {
        if (currentLevel === "RA") {
          playCockpitSound("warning");
        } else if (currentLevel === "TA") {
          playCockpitSound("caution");
        } else if (currentLevel === "MONITOR") {
          playCockpitSound("beep");
        }
      }
      addTerminalLog(`[TCAS ALERTE]: Transition vers l'état [${currentLevel}] - ${activeAlertState.title}`);
    } else {
      // Repeat beeps while active
      if (isSimPlaying) {
        if (currentLevel === "RA" && now - lastSoundTimeRef.current > 1800) {
          lastSoundTimeRef.current = now;
          if (!isSoundMuted) playCockpitSound("warning");
        } else if (currentLevel === "TA" && now - lastSoundTimeRef.current > 3000) {
          lastSoundTimeRef.current = now;
          if (!isSoundMuted) playCockpitSound("caution");
        }
      }
    }
  }, [intruderDist, intruderAltDiff, intruderBearing, isSoundMuted, isSimPlaying]);

  // Load Gemini Config on Mount
  useEffect(() => {
    checkGeminiStatus();
    runAnalysis(true, 4); // Initial Sparse Graph clustering on load
  }, []);

  // Update editor text when selected file changes
  useEffect(() => {
    const f = files.find(x => x.path === selectedFile);
    if (f) {
      setFileContent(f.content);
    }
  }, [selectedFile, files]);

  // Sync terminal scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  const checkGeminiStatus = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setGeminiActive(data.geminiActive);
      setConfigMsg(data.message);
    } catch (e) {
      setGeminiActive(false);
      setConfigMsg("Failed to connect to local server backend.");
    }
  };

  // Run Graphify Scanner and Community Detection
  const runAnalysis = async (sparse: boolean, resVal: number) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          useSparseEdges: sparse,
          resolution: resVal
        })
      });
      const data = await response.json();
      
      setNodes(data.nodes);
      setEdges(data.edges);
      setCommunitiesCount(data.communitiesCount);
      setUseSparseEdges(sparse);
      setResolution(resVal);

      // Auto-generate placeholder labels initially
      const placeholders = Array.from({ length: data.communitiesCount }).map((_, i) => {
        const id = i + 1;
        // Check heuristics
        const fileNames = data.nodes.filter((n: any) => n.community === id).map((n: any) => n.id);
        let label = `Community ${id}`;
        let summary = `Contains files: ${fileNames.join(", ")}.`;

        if (fileNames.some((f: string) => f.includes("core") || f.includes("threat") || f.includes("advisory"))) {
          label = "Threat Assessment & Advisory";
          summary = "Core subsystem that computes airspace separation metrics, evaluates hazard ranges, and triggers Resolution Advisories.";
        } else if (fileNames.some((f: string) => f.includes("radar") || f.includes("stream") || f.includes("alt"))) {
          label = "Sensor Stream & Filtering";
          summary = "Processes incoming transponder ADS-B signals, tracks coordinate paths, and cleans sensor flight altitude noise.";
        } else if (fileNames.some((f: string) => f.includes("display") || f.includes("panel") || f.includes("pfd"))) {
          label = "Display & Presentation Layer";
          summary = "Manages cockpit cockpit flight presentation screens by drawing visual hazard icons on navigation panels.";
        } else if (fileNames.some((f: string) => f.includes("config") || f.includes("loader"))) {
          label = "Parameters & Safety Profiles";
          summary = "Global static parameter repository containing safe altitude limits, alert levels, and flight thresholds.";
        }

        return {
          id,
          label,
          summary,
          isAI: false
        };
      });

      setLabeledCommunities(placeholders);
      
      // Update reports & JSON
      generateReportAndJson(data.nodes, data.edges, placeholders, sparse);

    } catch (err) {
      console.error("Scanner Error:", err);
      addTerminalLog("System Error during scanner parse: Connection failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Gemini Labeling Engine
  const labelCommunitiesWithAI = async () => {
    if (isLabeling) return;
    setIsLabeling(true);
    addTerminalLog("Initiating AI-Powered Community Labeling...");
    addTerminalLog("Scanning module contents and structural ingress boundaries...");

    try {
      const response = await fetch("/api/label-communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes,
          edges,
          files
        })
      });

      const data = await response.json();
      if (data.success) {
        setLabeledCommunities(data.labeledCommunities);
        
        if (data.aiLabeled) {
          addTerminalLog(`[graphify label] Gemini AI labeled ${data.labeledCommunities.length} communities successfully.`);
        } else {
          addTerminalLog(`[graphify label] no LLM backend configured; keeping Community N placeholders. Set an API key (e.g. GOOGLE_API_KEY) or pass --backend.`);
        }
        
        // Regenerate report with new labels
        generateReportAndJson(nodes, edges, data.labeledCommunities, useSparseEdges);
      } else {
        addTerminalLog(`[graphify label] Failed: ${data.error}`);
      }
    } catch (err: any) {
      addTerminalLog(`[graphify label] Error calling LLM: ${err.message || "Request timed out"}`);
    } finally {
      setIsLabeling(false);
    }
  };

  // Generate Report and JSON
  const generateReportAndJson = async (currentNodes: any[], currentEdges: any[], currentLabels: any[], sparse: boolean) => {
    setIsReportGenerating(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: currentNodes,
          edges: currentEdges,
          labeledCommunities: currentLabels,
          useSparseEdges: sparse
        })
      });
      const data = await response.json();
      setReportMarkdown(data.reportMarkdown);
      setRawJsonState(data.jsonState);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReportGenerating(false);
    }
  };

  // Add customized lines to retro terminal
  const addTerminalLog = (log: string) => {
    setTerminalLogs(prev => [...prev, log]);
  };

  // Terminal actions simulator
  const handleTerminalCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;
    
    addTerminalLog(`$ ${trimmed}`);
    setTerminalInput("");

    if (trimmed.startsWith("graphify cluster-only")) {
      addTerminalLog("Loading existing graph...");
      addTerminalLog(`Graph: ${PRELOADED_FILES.length} nodes, 3 edges`);
      addTerminalLog("Re-clustering...");
      addTerminalLog("Labeling communities...");
      
      setTimeout(() => {
        runAnalysis(true, 4);
        if (geminiActive) {
          addTerminalLog("[graphify label] AI backend online. Querying Google Gemini...");
          labelCommunitiesWithAI();
        } else {
          addTerminalLog("[graphify label] no LLM backend configured; keeping Community N placeholders. Set an API key (e.g. GOOGLE_API_KEY) or pass --backend.");
          addTerminalLog("Done - 4 communities. GRAPH_REPORT.md, graph.json and graph.html updated.");
        }
      }, 800);

    } else if (trimmed.startsWith("graphify analyze")) {
      addTerminalLog("Scanning codebase workspace in real time...");
      addTerminalLog(`Found ${files.length} code files. Extracting imports & symbols...`);
      
      setTimeout(() => {
        runAnalysis(false, resolution);
        addTerminalLog(`Discovered ${nodes.length} nodes and ${edges.length} high-affinity dependency edges.`);
        addTerminalLog(`Applying community detection algorithm (Resolution = ${resolution})...`);
        addTerminalLog("Done - Code network mapped. GRAPH_REPORT.md and graph.json generated.");
      }, 1000);

    } else if (trimmed === "graphify label") {
      labelCommunitiesWithAI();

    } else if (trimmed === "help") {
      addTerminalLog("Available Commands:");
      addTerminalLog("  graphify cluster-only [path]   - Quick cluster 7 nodes, 3 edges (Matches log)");
      addTerminalLog("  graphify analyze [path]        - Fully scan the file contents to auto-detect edges");
      addTerminalLog("  graphify label                 - Trigger AI labeling of communities using Gemini");
      addTerminalLog("  clear                          - Clear the terminal console logs");

    } else if (trimmed === "clear") {
      setTerminalLogs([]);
    } else {
      addTerminalLog(`Unknown command: '${trimmed}'. Type 'help' for instructions.`);
    }
  };

  // File management
  const handleSaveFileContent = (newContent: string) => {
    setFileContent(newContent);
    const updatedFiles = files.map(f => f.path === selectedFile ? { ...f, content: newContent } : f);
    setFiles(updatedFiles);
    addTerminalLog(`Updated content of file '${selectedFile}'. Run 'graphify analyze' to re-scan dependency tree.`);
  };

  const handleAddNewFile = () => {
    const name = prompt("Enter new filename (e.g. anti_collision_gui.py):");
    if (!name) return;
    if (files.some(f => f.path === name)) {
      alert("File already exists!");
      return;
    }
    const newFile = {
      path: name,
      content: `# ${name} - Code Module\n# Add imports here to connect to the dependency network.\n\nimport tcas_core\n`
    };
    const updated = [...files, newFile];
    setFiles(updated);
    setSelectedFile(name);
    setFileContent(newFile.content);
    addTerminalLog(`Created new module file '${name}' in codebase. Scan imports to re-cluster.`);
  };

  const handleDeleteFile = (pathToDelete: string) => {
    if (files.length <= 3) {
      alert("Cannot delete below 3 files. Codebase must maintain core modules.");
      return;
    }
    const updated = files.filter(f => f.path !== pathToDelete);
    setFiles(updated);
    if (selectedFile === pathToDelete) {
      setSelectedFile(updated[0].path);
      setFileContent(updated[0].content);
    }
    addTerminalLog(`Removed file '${pathToDelete}' from workspace.`);
  };

  // Render D3 Graph Visualizer
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 600;
    const containerHeight = svgRef.current.parentElement?.clientHeight || 450;

    // Deep copy data for D3 to mutate freely
    const d3Nodes = nodes.map(n => ({ ...n }));
    const d3Links = edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type
    }));

    // Setup Simulation
    const simulation = d3.forceSimulation<any, any>(d3Nodes)
      .force("link", d3.forceLink<any, any>(d3Links).id(d => d.id).distance(110))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force("collision", d3.forceCollide().radius(45));

    // Setup arrowheads
    svgElement.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 26) // Distance from node center
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    // Draw lines
    const link = svgElement.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(d3Links)
      .enter().append("line")
      .attr("stroke", (d: any) => {
        // Highlight active connections of selected node
        if (selectedNodeId) {
          const isSource = typeof d.source === "object" ? d.source.id === selectedNodeId : d.source === selectedNodeId;
          const isTarget = typeof d.target === "object" ? d.target.id === selectedNodeId : d.target === selectedNodeId;
          return (isSource || isTarget) ? "#38bdf8" : "#334155";
        }
        return "#1e293b";
      })
      .attr("stroke-width", (d: any) => {
        if (selectedNodeId) {
          const isSource = typeof d.source === "object" ? d.source.id === selectedNodeId : d.source === selectedNodeId;
          const isTarget = typeof d.target === "object" ? d.target.id === selectedNodeId : d.target === selectedNodeId;
          return (isSource || isTarget) ? 3 : 1.5;
        }
        return 1.8;
      })
      .attr("marker-end", "url(#arrowhead)")
      .attr("opacity", (d: any) => {
        if (selectedNodeId) {
          const isSource = typeof d.source === "object" ? d.source.id === selectedNodeId : d.source === selectedNodeId;
          const isTarget = typeof d.target === "object" ? d.target.id === selectedNodeId : d.target === selectedNodeId;
          return (isSource || isTarget) ? 1.0 : 0.3;
        }
        return 0.75;
      });

    // Draw node container groups
    const node = svgElement.append("g")
      .attr("class", "nodes")
      .selectAll(".node-group")
      .data(d3Nodes)
      .enter().append("g")
      .attr("class", "node-group")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (event: any, d: any) => {
        setSelectedNodeId(d.id);
        // Highlight corresponding file in the list if exists
        if (files.some(f => f.path === d.id)) {
          setSelectedFile(d.id);
        }
      });

    // Outer glow for selected node
    node.append("circle")
      .attr("r", 22)
      .attr("fill", "transparent")
      .attr("stroke", (d: any) => d.id === selectedNodeId ? "#38bdf8" : "transparent")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,3")
      .attr("class", "animate-[spin_20s_linear_infinite]");

    // Primary circle represent node
    node.append("circle")
      .attr("r", 15)
      .attr("fill", (d: any) => COMMUNITY_COLORS[(d.community - 1) % COMMUNITY_COLORS.length])
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .attr("class", "cursor-pointer hover:scale-110 transition-transform duration-150")
      .style("filter", (d: any) => `drop-shadow(0 0 8px ${COMMUNITY_COLORS[(d.community - 1) % COMMUNITY_COLORS.length]}dd)`);

    // File icon or type letter
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-family", "monospace")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "#0f172a")
      .text((d: any) => d.id.endsWith(".py") ? "Py" : "TS")
      .attr("class", "pointer-events-none select-none");

    // File name text label
    node.append("text")
      .attr("dx", 20)
      .attr("dy", 4)
      .text((d: any) => d.id)
      .attr("fill", (d: any) => d.id === selectedNodeId ? "#38bdf8" : "#cbd5e1")
      .attr("font-size", "11px")
      .attr("font-weight", (d: any) => d.id === selectedNodeId ? "bold" : "normal")
      .attr("font-family", "monospace")
      .attr("class", "pointer-events-none select-none drop-shadow-md");

    // Simulation forces tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };

  }, [nodes, edges, selectedNodeId, files]);

  // Handle copying outputs
  const handleCopyText = (text: string, logMsg: string) => {
    navigator.clipboard.writeText(text);
    addTerminalLog(logMsg);
  };

  // Trigger downloading files
  const handleDownloadFile = (filename: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addTerminalLog(`Successfully exported file '${filename}' to downloads folder.`);
  };

  const filteredNodes = nodes.filter(n => n.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans antialiased selection:bg-slate-700 selection:text-white">
      {/* Visual Header */}
      <header className="border-b border-[#1e293b] bg-[#0d1324]/85 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Network className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Graphify Workspace
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Directory Network Community Clustering & AI Labelling Engine
            </p>
          </div>
        </div>

        {/* Server & API Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 border ${
            geminiActive 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }`}>
            <span className={`h-2 w-2 rounded-full ${geminiActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {geminiActive ? "Gemini AI Active" : "Local Heuristic Mode"}
          </div>

          <div className="text-slate-500 text-xs font-mono">
            Location: <span className="text-slate-300">C:\TCAS_CODE_ONLY</span>
          </div>
        </div>
      </header>

      {/* Navigation sub-header for tab switching */}
      <div className="bg-[#0b0f19] border-b border-[#1e293b]/60 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveAppTab("simulator");
              addTerminalLog("[TCAS SIM]: Mode Simulateur de Collision Activé.");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all border ${
              activeAppTab === "simulator"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-lg shadow-rose-500/5"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900"
            }`}
          >
            <Radio className="h-4 w-4 text-rose-400 animate-pulse" />
            📡 Simulateur TCAS (3 Zones)
          </button>
          <button
            onClick={() => {
              setActiveAppTab("graph");
              addTerminalLog("[TCAS WORKSPACE]: Mode Dépendance Graphify Activé.");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all border ${
              activeAppTab === "graph"
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 shadow-lg shadow-indigo-500/5"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900"
            }`}
          >
            <Network className="h-4 w-4 text-indigo-400" />
            🗂️ Codebase Workspace (Graphify)
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Shield className={`h-3.5 w-3.5 ${activeAlertState.zone >= 2 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`} />
          État Système :{" "}
          <span
            className="font-bold px-2.5 py-0.5 rounded border text-[10px]"
            style={{
              backgroundColor: `${activeAlertState.color}15`,
              borderColor: `${activeAlertState.color}35`,
              color: activeAlertState.color,
            }}
          >
            {activeAlertState.level === "RA"
              ? "RA - Évitement"
              : activeAlertState.level === "TA"
              ? "TA - Mise en Garde"
              : "Surveillance Active"}
          </span>
        </div>
      </div>

      {activeAppTab === "graph" ? (
        /* Main Workspace Layout */
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 p-5 overflow-hidden">
          
          {/* LEFT COLUMN: Code Explorer & File Editor (xl:col-span-4) */}
          <div className="xl:col-span-4 flex flex-col bg-[#0e1628]/95 border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0d1222] px-4 py-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => setLeftTab("code")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    leftTab === "code" 
                      ? "bg-slate-800 text-slate-100 border border-slate-700" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                  Code Files
                </button>
                <button 
                  onClick={() => setLeftTab("config")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    leftTab === "config" 
                      ? "bg-slate-800 text-slate-100 border border-slate-700" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  Scanner Controls
                </button>
              </div>

              {leftTab === "code" && (
                <button 
                  onClick={handleAddNewFile}
                  className="p-1.5 text-xs font-mono bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-md flex items-center gap-1 transition-all"
                  title="Create New File"
                >
                  <Plus className="h-3 w-3" />
                  Add File
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {leftTab === "code" ? (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  {/* File selectors */}
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1.5 bg-[#0a0f1d] border border-slate-800 rounded-lg">
                    {files.map((file) => (
                      <div 
                        key={file.path}
                        className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-md text-xs font-mono border transition-all cursor-pointer ${
                          selectedFile === file.path 
                            ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/35" 
                            : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                        onClick={() => setSelectedFile(file.path)}
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        <span>{file.path}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.path);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-all"
                          title="Delete File"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Micro Editor Canvas */}
                  <div className="flex-1 flex flex-col bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden relative min-h-[250px]">
                    <div className="flex items-center justify-between bg-[#080c16] px-4 py-2 border-b border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        Editing: <span className="text-slate-300">{selectedFile}</span>
                      </span>
                      <button 
                        onClick={() => handleSaveFileContent(fileContent)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded font-mono transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="flex-1 w-full bg-transparent p-4 font-mono text-xs text-slate-300 leading-relaxed outline-none resize-none overflow-y-auto"
                      spellCheck={false}
                    />
                    <div className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-500 pointer-events-none">
                      UTF-8 | Python/TypeScript syntax
                    </div>
                  </div>
                </div>
              ) : (
                // Scanner configuration Tab
                <div className="flex flex-col gap-5 p-2 overflow-y-auto">
                  {/* Dependency Mapping Options */}
                  <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl">
                    <h3 className="text-sm font-semibold font-mono text-indigo-400 mb-1 flex items-center gap-1.5">
                      <Activity className="h-4 w-4" /> Import Scanning Modes
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Toggle whether Graphify parses all code files to extract real import links, or loads the initial sparse graph state.
                    </p>

                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        onClick={() => {
                          setUseSparseEdges(true);
                          runAnalysis(true, resolution);
                        }}
                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                          useSparseEdges 
                            ? "bg-indigo-500/5 text-indigo-300 border-indigo-500/40" 
                            : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold font-mono">Sparse Graph State (Initial Log)</div>
                        <div className="text-[11px] mt-1 text-slate-400">7 nodes, 3 connections. Replicates the baseline terminal log state perfectly.</div>
                      </button>

                      <button
                        onClick={() => {
                          setUseSparseEdges(false);
                          runAnalysis(false, resolution);
                        }}
                        className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                          !useSparseEdges 
                            ? "bg-indigo-500/5 text-indigo-300 border-indigo-500/40" 
                            : "bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold font-mono">Real-time Code Analyzer</div>
                        <div className="text-[11px] mt-1 text-slate-400">Scans all files, parsing imported statements dynamically to construct real-time topology (7 connections).</div>
                      </button>
                    </div>
                  </div>

                  {/* Modularity resolution slider */}
                  <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold font-mono text-indigo-400 flex items-center gap-1.5">
                        <Sliders className="h-4 w-4" /> Clustering Resolution
                      </h3>
                      <span className="text-xs font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                        {resolution} Communities
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                      Adjust target community density (modularity split partition parameters). Dynamic algorithms will group modules.
                    </p>

                    <input
                      type="range"
                      min="2"
                      max="5"
                      value={resolution}
                      onChange={(e) => {
                        const resVal = parseInt(e.target.value);
                        setResolution(resVal);
                        runAnalysis(useSparseEdges, resVal);
                      }}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />

                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
                      <span>Low modularity (2)</span>
                      <span>High modularity (5)</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[11px] leading-relaxed text-slate-400 flex gap-2.5">
                    <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-200 font-semibold">Mathematical Note:</span> With 3 edges configured, Graphify naturally splits the 7-node network into exactly 4 connected components matching the baseline terminal outputs!
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CENTER COLUMN: Interactive Network Graph & Retro Terminal (xl:col-span-5) */}
          <div className="xl:col-span-5 flex flex-col gap-5 overflow-hidden">
            
            {/* Node graph visualization canvas */}
            <div className="flex-1 bg-[#0e1628]/95 border border-[#1e293b] rounded-xl overflow-hidden flex flex-col shadow-2xl min-h-[400px] relative">
              
              {/* Visual controls */}
              <div className="border-b border-[#1e293b] bg-[#0d1222] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-indigo-400 animate-pulse" />
                  <span className="text-xs font-bold font-mono tracking-wide uppercase text-slate-200">
                    Interactive Network Topography
                  </span>
                </div>

                {/* Quick Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search file node..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-800 focus:border-indigo-500/50 text-slate-200 text-[11px] font-mono pl-8 pr-3 py-1.5 rounded-md outline-none w-[160px] transition-all"
                  />
                </div>
              </div>

              {/* D3 canvas container */}
              <div className="flex-1 relative bg-[#060a13] flex items-center justify-center overflow-hidden">
                <svg 
                  ref={svgRef} 
                  className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
                />

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-[#060a13]/85 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                    <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-xs font-mono text-slate-300">Scanning codebase imports...</p>
                  </div>
                )}

                {/* Graph Legend overlay */}
                <div className="absolute bottom-3 left-3 bg-[#0c1222]/85 border border-slate-800/80 p-2.5 rounded-lg text-[10px] font-mono leading-relaxed backdrop-blur flex flex-col gap-1 text-slate-400">
                  <div className="font-bold text-slate-300 mb-1">Subsystems (Community colors):</div>
                  {labeledCommunities.map((comm) => (
                    <div key={comm.id} className="flex items-center gap-1.5">
                      <span 
                        className="h-2 w-2 rounded-full shadow-md" 
                        style={{ backgroundColor: COMMUNITY_COLORS[(comm.id - 1) % COMMUNITY_COLORS.length] }} 
                      />
                      <span className="text-slate-300 truncate max-w-[140px]">{comm.label}</span>
                    </div>
                  ))}
                </div>

                {/* Node Inspector overlay */}
                {selectedNodeId && (
                  <div className="absolute top-3 right-3 bg-[#0c1222]/90 border border-indigo-500/20 shadow-xl p-3.5 rounded-lg text-xs font-mono backdrop-blur w-[220px] max-w-full text-slate-300">
                    <div className="flex justify-between items-start mb-2 border-b border-slate-800 pb-1.5">
                      <div className="font-bold text-indigo-400 truncate pr-2">{selectedNodeId}</div>
                      <button 
                        onClick={() => setSelectedNodeId(null)}
                        className="text-slate-500 hover:text-slate-300 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {(() => {
                      const nodeDetails = nodes.find(n => n.id === selectedNodeId);
                      if (!nodeDetails) return null;
                      const cColor = COMMUNITY_COLORS[(nodeDetails.community - 1) % COMMUNITY_COLORS.length];
                      const imports = edges.filter(e => e.source === selectedNodeId).map(e => e.target);
                      const importedBy = edges.filter(e => e.target === selectedNodeId).map(e => e.source);
                      
                      return (
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Subsystem:</span>
                            <span className="font-semibold" style={{ color: cColor }}>
                              {labeledCommunities.find(c => c.id === nodeDetails.community)?.label || `Community ${nodeDetails.community}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">File Size:</span>
                            <span className="text-slate-400 font-bold">{(nodeDetails.size / 1024).toFixed(2)} KB</span>
                          </div>

                          <div className="pt-1.5">
                            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Imports ({imports.length}):</div>
                            {imports.length === 0 ? <div className="text-slate-600 italic">None</div> : (
                              <div className="flex flex-wrap gap-1">
                                {imports.map(imp => (
                                  <span key={imp} className="bg-slate-900 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded text-slate-300">{imp}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="pt-1.5">
                            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Imported By ({importedBy.length}):</div>
                            {importedBy.length === 0 ? <div className="text-slate-600 italic">None</div> : (
                              <div className="flex flex-wrap gap-1">
                                {importedBy.map(imp => (
                                  <span key={imp} className="bg-slate-900 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded text-slate-300">{imp}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Retro terminal emulator shell */}
            <div className="h-[200px] bg-[#050811] border border-[#1e293b] rounded-xl flex flex-col overflow-hidden font-mono text-xs shadow-2xl">
              <div className="bg-[#0b0f19] px-4 py-2 border-b border-[#1e293b] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                  <span className="text-slate-300 text-[11px] font-bold">Graphify Terminal Sandbox</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Scrollable logs area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-emerald-400 leading-relaxed scrollbar-thin">
                {terminalLogs.map((log, index) => {
                  let colorClass = "text-emerald-400";
                  if (log.startsWith("$")) colorClass = "text-indigo-300 font-semibold";
                  else if (log.includes("no LLM backend configured") || log.includes("Error")) colorClass = "text-amber-400 font-bold";
                  else if (log.includes("successfully") || log.includes("Done")) colorClass = "text-emerald-300 font-semibold";
                  
                  return (
                    <div key={index} className={`${colorClass} text-[11px] break-all`}>
                      {log}
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>

              {/* Terminal control bar presets */}
              <div className="border-t border-[#1e293b] bg-[#0b0f19] px-3 py-2 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleTerminalCommand("graphify cluster-only ./")}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                  >
                    <Play className="h-2.5 w-2.5" />
                    Run cluster-only
                  </button>
                  <button
                    onClick={() => handleTerminalCommand("graphify analyze ./")}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    Run analyze --all
                  </button>
                  <button
                    onClick={() => handleTerminalCommand("graphify label")}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    Run AI Labeler
                  </button>
                </div>

                {/* Manual prompt input */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTerminalCommand(terminalInput);
                  }}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-900 rounded px-2 py-0.5"
                >
                  <span className="text-indigo-400 text-[11px] font-bold">$</span>
                  <input
                    type="text"
                    placeholder="Enter command..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    className="bg-transparent border-none text-[11px] text-slate-300 outline-none w-[110px] focus:w-[150px] transition-all"
                  />
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Subsystem Communities & Reports (xl:col-span-3) */}
          <div className="xl:col-span-3 flex flex-col bg-[#0e1628]/95 border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex border-b border-[#1e293b] bg-[#0d1222] p-1 gap-1">
              <button 
                onClick={() => setRightTab("subsystems")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                  rightTab === "subsystems" 
                    ? "bg-slate-800 text-slate-100 border border-slate-700" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                Subsystems
              </button>
              <button 
                onClick={() => setRightTab("report")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                  rightTab === "report" 
                    ? "bg-slate-800 text-slate-100 border border-slate-700" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                Report
              </button>
              <button 
                onClick={() => setRightTab("json")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-mono font-medium transition-all ${
                  rightTab === "json" 
                    ? "bg-slate-800 text-slate-100 border border-slate-700" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                graph.json
              </button>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {rightTab === "subsystems" && (
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                  {/* AI Labeling Trigger Header */}
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold font-mono text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        Gemini Auto-Labeler
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {geminiActive ? "API Ready" : "Local Mode"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Uses AI to analyze module files inside each cluster and synthesize custom descriptive names.
                    </p>
                    
                    <button
                      onClick={labelCommunitiesWithAI}
                      disabled={isLabeling}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                    >
                      {isLabeling ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Analyzing via Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Label Subsystems with Gemini
                        </>
                      )}
                    </button>
                  </div>

                  {/* Subsystem list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
                    {labeledCommunities.map((comm) => {
                      const matchedColor = COMMUNITY_COLORS[(comm.id - 1) % COMMUNITY_COLORS.length];
                      const filesInComm = nodes.filter(n => n.community === comm.id);

                      return (
                        <div 
                          key={comm.id}
                          className="p-3.5 bg-[#0a0f1d] border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span 
                                className="h-3 w-3 rounded-full" 
                                style={{ backgroundColor: matchedColor }} 
                              />
                              <h4 className="text-xs font-bold font-mono text-slate-200">
                                {comm.label}
                              </h4>
                            </div>

                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              comm.isAI 
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                : "bg-slate-800 text-slate-500 border-slate-700"
                            }`}>
                              {comm.isAI ? "AI Labeled" : "Heuristics"}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                            {comm.summary}
                          </p>

                          <div className="mt-1">
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Clustered Modules:</div>
                            <div className="flex flex-wrap gap-1">
                              {filesInComm.map(f => (
                                <span 
                                  key={f.id}
                                  onClick={() => {
                                    setSelectedNodeId(f.id);
                                    setSelectedFile(f.id);
                                  }}
                                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-[10px] font-mono px-2 py-0.5 rounded text-slate-300 cursor-pointer"
                                >
                                  {f.id}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {rightTab === "report" && (
                <div className="flex-1 flex flex-col overflow-hidden gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-indigo-400">GRAPH_REPORT.md</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleCopyText(reportMarkdown, "Copied GRAPH_REPORT.md content to clipboard.")}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition-all"
                        title="Copy Markdown"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile("GRAPH_REPORT.md", reportMarkdown)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition-all"
                        title="Download File"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isReportGenerating ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#0a0f1d] border border-slate-850 rounded-xl">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                      <p className="text-xs font-mono text-slate-400">Synthesizing report metadata...</p>
                    </div>
                  ) : (
                    <div className="flex-1 bg-[#0a0f1d] p-4 border border-slate-800 rounded-xl overflow-y-auto text-xs font-mono text-slate-300 leading-relaxed scrollbar-thin">
                      <pre className="whitespace-pre-wrap select-text">{reportMarkdown}</pre>
                    </div>
                  )}
                </div>
              )}

              {rightTab === "json" && (
                <div className="flex-1 flex flex-col overflow-hidden gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-indigo-400">graph.json</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleCopyText(JSON.stringify(rawJsonState, null, 2), "Copied graph.json state to clipboard.")}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition-all"
                        title="Copy JSON"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile("graph.json", JSON.stringify(rawJsonState, null, 2))}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition-all"
                        title="Download JSON"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-[#0a0f1d] p-4 border border-slate-800 rounded-xl overflow-y-auto text-xs font-mono text-indigo-300 leading-relaxed scrollbar-thin">
                    <pre className="whitespace-pre-wrap select-text">{JSON.stringify(rawJsonState, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TCAS Interactive Collision Simulator View */
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 p-5 overflow-y-auto xl:overflow-hidden">
          
          {/* SIMULATOR LEFT PANEL: Controls & Scenarios */}
          <div className="xl:col-span-4 flex flex-col bg-[#0e1628]/95 border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
            <div className="border-b border-[#1e293b] bg-[#0d1222] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-bold font-mono tracking-wide uppercase text-slate-200">
                  Contrôles de Télémétrie
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Aérodynamique TCAS II
              </span>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-5">
              {/* Distance Slider */}
              <div className="space-y-2 bg-[#060a13] p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-slate-300">Distance de l'Intrus :</span>
                  <span className="text-xs font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded">
                    {intruderDist.toFixed(1)} NM
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="25.0" 
                  step="0.1"
                  value={intruderDist} 
                  onChange={(e) => {
                    setIntruderDist(parseFloat(e.target.value));
                    setIsSimPlaying(false); // pause on manual tweak
                  }}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>Proche (0.1 NM)</span>
                  <span className="text-rose-500">RA (2.1)</span>
                  <span className="text-orange-500">TA (3.3)</span>
                  <span className="text-cyan-500">Surv. (20.0)</span>
                  <span>Max (25.0 NM)</span>
                </div>
              </div>

              {/* Altitude Slider */}
              <div className="space-y-2 bg-[#060a13] p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-slate-300">Différence d'Altitude :</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                    Math.abs(intruderAltDiff) <= 600 
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/25" 
                      : Math.abs(intruderAltDiff) <= 850
                      ? "text-orange-400 bg-orange-500/10 border-orange-500/25"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                  }`}>
                    {intruderAltDiff >= 0 ? "+" : ""}{intruderAltDiff} pieds
                  </span>
                </div>
                <input 
                  type="range" 
                  min="-1500" 
                  max="1500" 
                  step="50"
                  value={intruderAltDiff} 
                  onChange={(e) => {
                    setIntruderAltDiff(parseInt(e.target.value));
                    setIsSimPlaying(false);
                  }}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>En dessous (-1500 ft)</span>
                  <span className="text-rose-500">RA (±600)</span>
                  <span className="text-orange-500">TA (±850)</span>
                  <span>Au dessus (+1500 ft)</span>
                </div>
              </div>

              {/* Bearing / Angle Slider */}
              <div className="space-y-2 bg-[#060a13] p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-slate-300">Angle / Gisement Relatif :</span>
                  <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Compass className="h-3 w-3" />
                    {intruderBearing}° {intruderBearing >= 270 || intruderBearing <= 90 ? "(Devant)" : "(Derrière)"}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="359" 
                  value={intruderBearing} 
                  onChange={(e) => {
                    setIntruderBearing(parseInt(e.target.value));
                    setIsSimPlaying(false);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>Devant (0°)</span>
                  <span>Droite (90°)</span>
                  <span>Arrière (180°)</span>
                  <span>Gauche (270°)</span>
                </div>
              </div>

              {/* NEW: Closing Speed / Rate Slider */}
              <div className="space-y-2 bg-[#060a13] p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-slate-300">Vitesse de Rapprochement (Closing Rate) :</span>
                  <span className="text-xs font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded">
                    {closingRate} kts (Nœuds)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="900" 
                  step="10"
                  value={closingRate} 
                  onChange={(e) => {
                    setClosingRate(parseInt(e.target.value));
                  }}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>Lent (100 kts)</span>
                  <span>Moyen (450 kts)</span>
                  <span>Supersonique (900 kts)</span>
                </div>
              </div>

              {/* Vertical Trend & Simulation Speed */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#060a13] p-3 rounded-xl border border-slate-800/60 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 block">Tendance d'Altitude :</span>
                  <div className="flex gap-1">
                    {([
                      { value: "stable", label: "Stable ▬" },
                      { value: "climb", label: "Montée ▲" },
                      { value: "descend", label: "Descente ▼" }
                    ] as const).map(item => (
                      <button
                        key={item.value}
                        onClick={() => setIntruderTrend(item.value)}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded font-mono border transition-all ${
                          intruderTrend === item.value
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#060a13] p-3 rounded-xl border border-slate-800/60 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 block">Vitesse du rapprochement :</span>
                  <div className="flex gap-1">
                    {[1.0, 2.0, 4.0].map(speed => (
                      <button
                        key={speed}
                        onClick={() => setSimSpeed(speed)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded font-mono border transition-all ${
                          simSpeed === speed
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                            : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* NEW: Flight Risk Trajectory Engine & Stability Fusion Slider Panel */}
              <div className="p-4 bg-[#0a1125] border border-indigo-500/20 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-1.5">
                  <Shield className="h-4 w-4 text-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-bold font-mono tracking-wider text-slate-200 uppercase">
                    Flight Risk Engines & Fusion
                  </span>
                </div>

                {/* Trajectory Prediction Risk */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Trajectory Prediction Risk:</span>
                    <span className="font-bold text-indigo-400">{(trajectoryRisk * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05"
                    value={trajectoryRisk} 
                    onChange={(e) => setTrajectoryRisk(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Aircraft Stability Risk */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Aircraft Stability Risk:</span>
                    <span className="font-bold text-indigo-400">{(stabilityRisk * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05"
                    value={stabilityRisk} 
                    onChange={(e) => setStabilityRisk(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Simulation Engine Controls */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setIsSimPlaying(!isSimPlaying)}
                  className={`flex-1 py-3 px-4 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                    isSimPlaying 
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20" 
                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20"
                  }`}
                >
                  {isSimPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
                  {isSimPlaying ? "PAUSE SIMULATION" : "LANCER SIMULATION"}
                </button>

                <button
                  onClick={() => {
                    setIsSoundMuted(!isSoundMuted);
                    playCockpitSound("beep");
                  }}
                  className={`px-3 py-3 border rounded-xl transition-all ${
                    isSoundMuted 
                      ? "bg-slate-900/60 border-slate-800 text-slate-500" 
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                  }`}
                  title={isSoundMuted ? "Activer l'audio" : "Désactiver l'audio"}
                >
                  {isSoundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>

              {/* PRESETS TRAINING SCENARIOS */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-xs font-bold font-mono text-indigo-400 block mb-2.5">
                  Scénarios d'Entraînement Didactiques :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIntruderDist(15.0);
                      setIntruderAltDiff(1100);
                      setIntruderBearing(15);
                      setIntruderTrend("stable");
                      setIsSimPlaying(false);
                      addTerminalLog("[TCAS SIM]: Scénario Zone 1 chargé : Intrus lointain stable.");
                    }}
                    className="p-2.5 bg-slate-900/40 hover:bg-[#0a101f] border border-slate-800 hover:border-cyan-500/30 rounded-lg text-left transition-all"
                  >
                    <div className="text-[10px] font-bold font-mono text-cyan-400 uppercase">Zone 1 : Surveillance</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">15 NM, +1100 ft, angle 15° (Frontal)</div>
                  </button>

                  <button
                    onClick={() => {
                      setIntruderDist(3.1);
                      setIntruderAltDiff(750);
                      setIntruderBearing(345);
                      setIntruderTrend("stable");
                      setIsSimPlaying(false);
                      addTerminalLog("[TCAS SIM]: Scénario Zone 2 chargé : Alerte de Trafic (TA) active.");
                    }}
                    className="p-2.5 bg-slate-900/40 hover:bg-[#0a101f] border border-slate-800 hover:border-orange-500/30 rounded-lg text-left transition-all"
                  >
                    <div className="text-[10px] font-bold font-mono text-orange-400 uppercase">Zone 2 : Alerte TA</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">3.1 NM, +750 ft, alerte sonore cockpit</div>
                  </button>

                  <button
                    onClick={() => {
                      setIntruderDist(1.8);
                      setIntruderAltDiff(-450);
                      setIntruderBearing(5);
                      setIntruderTrend("climb");
                      setIsSimPlaying(false);
                      addTerminalLog("[TCAS SIM]: Scénario Zone 3 chargé : Alerte d'Évitement RA active !");
                    }}
                    className="p-2.5 bg-slate-900/40 hover:bg-[#0a101f] border border-slate-800 hover:border-rose-500/30 rounded-lg text-left transition-all"
                  >
                    <div className="text-[10px] font-bold font-mono text-rose-400 uppercase">Zone 3 : Évitement RA</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">1.8 NM, -450 ft, instruction CLIMB !</div>
                  </button>

                  <button
                    onClick={() => {
                      setIntruderDist(1.4);
                      setIntruderAltDiff(1200);
                      setIntruderBearing(18);
                      setIntruderTrend("stable");
                      setIsSimPlaying(false);
                      addTerminalLog("[TCAS SIM]: Scénario Séparation chargée : Proche mais sécurisé.");
                    }}
                    className="p-2.5 bg-slate-900/40 hover:bg-[#0a101f] border border-slate-800 hover:border-emerald-500/30 rounded-lg text-left transition-all"
                  >
                    <div className="text-[10px] font-bold font-mono text-emerald-400 uppercase">Proche mais SÉCURISÉ</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">1.4 NM, séparation verticale 1200 ft</div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE PANEL: Primary TCAS Radar Scope (xl:col-span-5) */}
          <div className="xl:col-span-5 flex flex-col bg-[#0e1628]/95 border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl min-h-[420px] relative">
            <div className="border-b border-[#1e293b] bg-[#0d1222] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-400 animate-pulse" />
                <span className="text-xs font-bold font-mono tracking-wide uppercase text-slate-200">
                  Écran Radar Cockpit (ND / TCAS)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-mono text-slate-400">Balayage ADS-B Actif</span>
              </div>
            </div>

            <div className="flex-1 bg-[#040811] flex items-center justify-center overflow-hidden relative p-6">
              
              {/* Radar sweep glow ring effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_75%)] pointer-events-none" />

              <svg 
                viewBox="0 0 400 400" 
                className="w-full max-w-[370px] h-auto select-none"
              >
                <defs>
                  {/* Sweep gradient */}
                  <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#040811" stopOpacity="0" />
                  </radialGradient>
                  
                  {/* Front Zone 1 sector glow */}
                  <linearGradient id="frontSectorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Shaded surveillance sweep devant l'appareil (Sector from 270° to 90°, 180° front sector) */}
                <path 
                  d="M 200 200 L 20 200 A 180 180 0 0 1 380 200 Z" 
                  fill="url(#frontSectorGlow)" 
                  opacity="0.1" 
                />

                {/* Compass Circular Grids */}
                <circle cx="200" cy="200" r="180" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                <circle cx="200" cy="200" r="135" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                
                {/* 3.3 NM (Zone 2 Limit) */}
                <circle cx="200" cy="200" r="100" fill="none" stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="5,4" />
                {/* 2.1 NM (Zone 3 Limit) */}
                <circle cx="200" cy="200" r="55" fill="none" stroke="#f43f5e" strokeWidth="2" strokeOpacity="0.55" strokeDasharray="3,2" />

                {/* Scope axes */}
                <line x1="200" y1="20" x2="200" y2="380" stroke="#1e293b" strokeWidth="0.8" opacity="0.5" />
                <line x1="20" y1="200" x2="380" y2="200" stroke="#1e293b" strokeWidth="0.8" opacity="0.5" />

                {/* Range Ring text identifiers */}
                <text x="200" y="35" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">000° (DEVANT)</text>
                <text x="365" y="203" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="start" fontFamily="monospace">90°</text>
                <text x="200" y="375" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">180°</text>
                <text x="35" y="203" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">270°</text>

                {/* Safety limit labels */}
                <text x="200" y="215" fill="#475569" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">OWN</text>
                <text x="200" y="315" fill="#06b6d4" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.65" fontFamily="monospace">20.0 NM (Zone 1)</text>
                <text x="200" y="285" fill="#f97316" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.65" fontFamily="monospace">3.3 NM (Zone 2)</text>
                <text x="200" y="240" fill="#f43f5e" fontSize="8" fontWeight="bold" textAnchor="middle" opacity="0.65" fontFamily="monospace">2.1 NM (Zone 3)</text>

                {/* Own Aircraft representation */}
                <g transform="translate(200, 200)">
                  <polygon points="0,-12 -9,6 -3,6 -3,11 3,11 3,6 9,6" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="3.5" fill="#10b981" />
                </g>

                {/* Intruder Plotted Node */}
                {(() => {
                  // Map physical distance (NM) to SVG radius pixels (piecewise resolution scale)
                  const radius = intruderDist <= 3.3 
                    ? (intruderDist * (100 / 3.3)) 
                    : (100 + (intruderDist - 3.3) * (80 / (20.0 - 3.3)));

                  // Projected coordinates from bearing (North is UP)
                  const rad = (intruderBearing - 90) * (Math.PI / 180);
                  const ix = 200 + radius * Math.cos(rad);
                  const iy = 200 + radius * Math.sin(rad);

                  const alert = activeAlertState;
                  
                  // Decide visual node glyph
                  let symbolNode = null;
                  if (alert.level === "RA") {
                    // Flashing red warning square
                    symbolNode = (
                      <rect 
                        x={ix - 7} 
                        y={iy - 7} 
                        width="14" 
                        height="14" 
                        fill="#f43f5e" 
                        stroke="#0f172a" 
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    );
                  } else if (alert.level === "TA") {
                    // Amber warning circle
                    symbolNode = (
                      <circle 
                        cx={ix} 
                        cy={iy} 
                        r="7.5" 
                        fill="#f97316" 
                        stroke="#0f172a" 
                        strokeWidth="1.5" 
                      />
                    );
                  } else if (alert.level === "MONITOR") {
                    // Cyan monitoring diamond
                    symbolNode = (
                      <polygon 
                        points={`${ix},${iy - 8} ${ix + 8},${iy} ${ix},${iy + 8} ${ix - 8},${iy}`} 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="2.5" 
                      />
                    );
                  } else {
                    // Slate gray small diamond
                    symbolNode = (
                      <polygon 
                        points={`${ix},${iy - 6} ${ix + 6},${iy} ${ix},${iy + 6} ${ix - 6},${iy}`} 
                        fill="none" 
                        stroke="#64748b" 
                        strokeWidth="1.5" 
                      />
                    );
                  }

                  const altValueHundreds = Math.round(intruderAltDiff / 100);
                  const altValueLabel = (altValueHundreds >= 0 ? "+" : "-") + Math.abs(altValueHundreds).toString().padStart(2, "0");
                  const activeColor = alert.color;

                  return (
                    <g key="active-intruder-target">
                      {/* Range warning halo rings */}
                      {alert.zone >= 2 && (
                        <circle 
                          cx={ix} 
                          cy={iy} 
                          r="18" 
                          fill="none" 
                          stroke={activeColor} 
                          strokeWidth="1.2" 
                          strokeDasharray="2,3"
                          className="animate-[spin_8s_linear_infinite]"
                          opacity="0.85"
                        />
                      )}

                      {/* Dynamic core transponder glyph */}
                      {symbolNode}

                      {/* Altitude indicator text tag */}
                      <text 
                        x={ix + 12} 
                        y={iy + 4} 
                        fill={activeColor} 
                        fontSize="11" 
                        fontWeight="bold" 
                        fontFamily="monospace"
                        className="drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]"
                      >
                        {altValueLabel}
                      </text>

                      {/* Vertical trend speed indicator arrow */}
                      {intruderTrend !== "stable" && (
                        <text 
                          x={ix + 12} 
                          y={iy - 6} 
                          fill={activeColor} 
                          fontSize="9.5" 
                          fontWeight="bold"
                        >
                          {intruderTrend === "climb" ? "▲" : "▼"}
                        </text>
                      )}

                      {/* Live distance overlay */}
                      <text 
                        x={ix} 
                        y={iy + 19} 
                        fill="#94a3b8" 
                        fontSize="8" 
                        textAnchor="middle" 
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="drop-shadow-sm opacity-90"
                      >
                        {intruderDist.toFixed(1)} NM
                      </text>
                    </g>
                  );
                })()}
              </svg>

              {/* Subtitle indicators overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-900/90 border border-slate-800/80 px-3 py-1.5 rounded-lg backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span>Zone 1 (&lt; 20 NM devant)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  <span>Zone 2 (&lt; 3.3 NM, 850 ft)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>Zone 3 (&lt; 2.1 NM, 600 ft)</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Dynamic Alerts, Pilot Instructions & Code Correlation (xl:col-span-3) */}
          <div className="xl:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1 h-full max-h-[calc(100vh-140px)] scrollbar-thin">
            
            {/* Live TCAS Cockpit Alert Box */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 ${activeAlertState.bgClass}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-slate-400">
                    SÉCURITÉ COCKPIT ALERTE
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold ${
                    activeAlertState.level === "RA" 
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                      : activeAlertState.level === "TA"
                      ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {activeAlertState.level} ALERT
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold font-mono text-slate-200">
                    {activeAlertState.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {activeAlertState.desc}
                  </p>
                </div>

                {activeAlertState.level !== "SAFE" && (
                  <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-lg font-mono">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Synthèse Vocale Cockpit :
                    </div>
                    <div className="text-base font-black tracking-widest text-slate-100 flex items-center gap-2 animate-pulse">
                      <Radio className="h-4 w-4 text-indigo-400" />
                      &quot;{activeAlertState.announcement}&quot;
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/60">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                  Consigne Opérationnelle Pilote (RA/TA) :
                </div>
                <div className={`p-2.5 rounded-lg text-xs font-bold font-mono text-center border ${
                  activeAlertState.level === "RA"
                    ? "bg-rose-500/20 border-rose-500/30 text-rose-300 animate-pulse"
                    : activeAlertState.level === "TA"
                    ? "bg-orange-500/20 border-orange-500/30 text-orange-300"
                    : "bg-slate-900/60 border-slate-800 text-emerald-400"
                }`}>
                  {activeAlertState.frenchInstruction}
                </div>
              </div>
            </div>

            {/* NEW: Dynamic Risk Fusion & Continuous Telemetry Cockpit */}
            <div className="bg-[#0b1329] border border-[#1e293b] rounded-xl p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-rose-400 animate-pulse" />
                  <span className="text-[10px] font-bold font-mono tracking-wide uppercase text-slate-200">
                    FUSION DES RISQUES TEMPS RÉEL
                  </span>
                </div>
                <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  Bayesian Copula
                </span>
              </div>

              {/* Real-time Risk Meters */}
              <div className="grid grid-cols-2 gap-3">
                {/* TCAS Score Meter */}
                <div className="bg-[#050a14] p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Risk Score TCAS</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black font-mono ${
                      tcasDetailed.tcas_risk_score >= 0.8 
                        ? "text-rose-500" 
                        : tcasDetailed.tcas_risk_score >= 0.5 
                        ? "text-orange-500" 
                        : tcasDetailed.tcas_risk_score >= 0.1 
                        ? "text-cyan-400" 
                        : "text-emerald-400"
                    }`}>
                      {tcasDetailed.tcas_risk_score.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">/ 1.0</span>
                  </div>
                  {/* Miniature progress bar */}
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        tcasDetailed.tcas_risk_score >= 0.8 
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
                          : tcasDetailed.tcas_risk_score >= 0.5 
                          ? "bg-orange-500" 
                          : tcasDetailed.tcas_risk_score >= 0.1 
                          ? "bg-cyan-400" 
                          : "bg-emerald-400"
                      }`}
                      style={{ width: `${tcasDetailed.tcas_risk_score * 100}%` }}
                    />
                  </div>
                </div>

                {/* Global Unified Score Meter */}
                <div className="bg-[#050a14] p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Risque Global</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black font-mono ${
                      globalRisk >= 0.8 
                        ? "text-rose-500 animate-pulse" 
                        : globalRisk >= 0.5 
                        ? "text-orange-500" 
                        : "text-indigo-400"
                    }`}>
                      {globalRisk.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">/ 1.0</span>
                  </div>
                  {/* Miniature progress bar */}
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        globalRisk >= 0.8 
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
                          : globalRisk >= 0.5 
                          ? "bg-orange-500" 
                          : "bg-indigo-400"
                      }`}
                      style={{ width: `${globalRisk * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Color Mapping Status Band */}
              <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-center">
                <div className={`py-1 rounded border ${globalRisk < 0.1 ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold" : "bg-slate-900/40 border-slate-800/50 text-slate-500"}`}>
                  SÉCU
                </div>
                <div className={`py-1 rounded border ${globalRisk >= 0.1 && globalRisk < 0.5 ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 font-bold" : "bg-slate-900/40 border-slate-800/50 text-slate-500"}`}>
                  SURV
                </div>
                <div className={`py-1 rounded border ${globalRisk >= 0.5 && globalRisk < 0.8 ? "bg-orange-500/15 border-orange-500/30 text-orange-400 font-bold" : "bg-slate-900/40 border-slate-800/50 text-slate-500"}`}>
                  TA
                </div>
                <div className={`py-1 rounded border ${globalRisk >= 0.8 ? "bg-rose-500/15 border-rose-500/30 text-rose-400 font-bold animate-pulse" : "bg-slate-900/40 border-slate-800/50 text-slate-500"}`}>
                  RA
                </div>
              </div>

              {/* SVG Risk Evolution Timeline Chart */}
              <div className="bg-[#050a14] p-3 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400 text-[9px]">Évolution Temporelle</span>
                  <div className="flex items-center gap-2 text-[8px]">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> TCAS</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Global</span>
                  </div>
                </div>

                <div className="h-20 w-full relative">
                  <svg viewBox="0 0 200 100" className="w-full h-full" preserveAspectRatio="none">
                    {/* Gridlines */}
                    <line x1="0" y1="20" x2="200" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="0" y1="50" x2="200" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                    <line x1="0" y1="80" x2="200" y2="80" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />

                    {/* Plot TCAS Risk line */}
                    {(() => {
                      if (riskHistory.length < 2) return null;
                      const points = riskHistory.map((item, idx) => {
                        const x = (idx / (riskHistory.length - 1)) * 200;
                        const y = 100 - (item.tcas * 90 + 5); 
                        return `${x},${y}`;
                      }).join(" ");
                      return (
                        <polyline
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          points={points}
                          className="transition-all duration-300"
                        />
                      );
                    })()}

                    {/* Plot Global Risk line */}
                    {(() => {
                      if (riskHistory.length < 2) return null;
                      const points = riskHistory.map((item, idx) => {
                        const x = (idx / (riskHistory.length - 1)) * 200;
                        const y = 100 - (item.global * 90 + 5); 
                        return `${x},${y}`;
                      }).join(" ");
                      return (
                        <polyline
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="1.8"
                          points={points}
                          className="transition-all duration-300"
                        />
                      );
                    })()}
                  </svg>
                  <div className="absolute top-0 left-1 text-[7px] font-mono text-slate-500">1.0</div>
                  <div className="absolute bottom-0 left-1 text-[7px] font-mono text-slate-500">0.0</div>
                </div>
              </div>

              {/* JSON Structured Output Panel */}
              <div className="bg-[#050a14] rounded-lg border border-slate-800/80 overflow-hidden font-mono text-[9px]">
                <div className="bg-[#0d152c] px-3 py-1.5 border-b border-slate-800 flex justify-between items-center text-indigo-300 text-[9px]">
                  <span>SORTIE STRUCTUREE (TCAS II JSON)</span>
                  <span className="text-[7.5px] px-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">evaluate_threat()</span>
                </div>
                <div className="p-2.5 bg-slate-950/80 overflow-x-auto text-cyan-300 scrollbar-none">
                  <pre className="whitespace-pre">{JSON.stringify({
                    zone: tcasDetailed.zone,
                    tcas_risk_score: tcasDetailed.tcas_risk_score,
                    distance_nm: tcasDetailed.distance_nm,
                    vertical_separation_ft: tcasDetailed.vertical_separation_ft,
                    recommended_action: tcasDetailed.recommended_action
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Code Correlation / Rules Panel */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col overflow-hidden shrink-0">
              <h4 className="text-xs font-bold font-mono text-indigo-400 mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Cpu className="h-4 w-4" /> Règles Logiques Simulées (TCAS)
              </h4>
              
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-[11px] font-mono leading-relaxed">
                <p className="text-slate-400">
                  Les 3 zones de risques définies dans le cahier des charges sont évaluées en temps réel par notre algorithme :
                </p>

                {/* Zone 3 Rule Info */}
                <div className={`p-2.5 rounded-lg border transition-colors ${
                  activeAlertState.zone === 3 ? "bg-rose-500/5 border-rose-500/30" : "bg-slate-900/40 border-slate-800"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-rose-400 text-[10px]">ZONE 3 : Résolution d'Évitement (RA)</span>
                    {activeAlertState.zone === 3 && <Check className="h-3 w-3 text-rose-400" />}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-rose-400">Règle :</span> Dist &le; 2.1 NM <span className="text-slate-500">&amp;</span> Alt &le; 600 pieds.
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    Déclenche l'alerte d'évitement verticale directive (&quot;CLIMB&quot; ou &quot;DESCEND&quot;) en cockpit.
                  </p>
                </div>

                {/* Zone 2 Rule Info */}
                <div className={`p-2.5 rounded-lg border transition-colors ${
                  activeAlertState.zone === 2 ? "bg-orange-500/5 border-orange-500/30" : "bg-slate-900/40 border-slate-800"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-orange-400 text-[10px]">ZONE 2 : Alerte de Trafic (TA)</span>
                    {activeAlertState.zone === 2 && <Check className="h-3 w-3 text-orange-400" />}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-orange-400">Règle :</span> Dist &le; 3.3 NM <span className="text-slate-500">&amp;</span> Alt &le; 850 pieds.
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    Génère l'avertissement verbal cockpit &quot;TRAFFIC, TRAFFIC&quot; sans consigne d'évitement.
                  </p>
                </div>

                {/* Zone 1 Rule Info */}
                <div className={`p-2.5 rounded-lg border transition-colors ${
                  activeAlertState.zone === 1 ? "bg-cyan-500/5 border-cyan-500/30" : "bg-slate-900/40 border-slate-800"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-cyan-400 text-[10px]">ZONE 1 : Signalement &amp; Surveillance</span>
                    {activeAlertState.zone === 1 && <Check className="h-3 w-3 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-cyan-400">Règle :</span> Dist &le; 20.0 NM <span className="text-slate-500">&amp;</span> secteur avant (Devant).
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1">
                    L'intrus est affiché comme diamant de proximité sur l'écran du pilote pour surveillance active.
                  </p>
                </div>

                <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-800/80">
                  <span>Note d'implémentation :</span> Ce comportement correspond directement à la fonction <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">evaluate_threat()</code> de notre module <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">tcas_core.py</code>.
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Decorative footer status bar */}
      <footer className="border-t border-[#1e293b] bg-[#0d1324] px-6 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dev Server: port 3000 online</span>
          </div>
          <div>•</div>
          <div>Workspace: 7 standard files loaded</div>
        </div>

        <div>
          Graphify Workspace Engine • Crafted via AI Studio Build
        </div>
      </footer>
    </div>
  );
}
