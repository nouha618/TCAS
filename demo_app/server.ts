import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// Preloaded high-quality TCAS codebase files (7 nodes)
const DEFAULT_FILES = [
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

// Helper to check if API Key is configured
app.get("/api/config", (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({
    geminiActive: isConfigured,
    message: isConfigured 
      ? "Gemini API successfully connected." 
      : "No LLM backend configured; keeping Community N placeholders. Set an API key in Secrets panel."
  });
});

// Community clustering algorithm: Connected Components & distance-based resolution
function performClustering(nodes: any[], edges: any[], targetResolution: number = 4) {
  // Simple & stable modularity / Connected Components group assignment
  // Let's build an adjacency list
  const adj: { [key: string]: string[] } = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => {
    if (adj[e.source] && adj[e.target]) {
      adj[e.source].push(e.target);
      adj[e.target].push(e.source);
    }
  });

  // For 3 edges (Initial log-compatible state):
  // tcas_core -> advisory_gen, advisory_gen -> audio_alert, radar_stream -> alt_detector
  // This naturally splits into 4 connected components:
  // 1: tcas_core, advisory_gen, audio_alert
  // 2: radar_stream, alt_detector
  // 3: display_panel
  // 4: config_loader
  
  // We can run a Breadth First Search to find connected components
  const visited = new Set<string>();
  const components: string[][] = [];

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const comp: string[] = [];
      const queue = [node.id];
      visited.add(node.id);
      
      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);
        adj[curr].forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
      components.push(comp);
    }
  });

  // Assign community IDs based on components
  const nodeCommunityMap: { [key: string]: number } = {};
  components.forEach((comp, idx) => {
    comp.forEach(nodeId => {
      nodeCommunityMap[nodeId] = idx + 1;
    });
  });

  // If target resolution is smaller than actual components, we can merge smaller components,
  // or if target resolution is larger, we can split components.
  // Let's support arbitrary target resolution by grouping components or splitting based on degree
  let finalCommunities = components.map((nodesInComp, index) => ({
    id: index + 1,
    nodes: nodesInComp
  }));

  if (targetResolution < finalCommunities.length) {
    // Merge components until we hit targetResolution
    while (finalCommunities.length > targetResolution) {
      // Sort by size ascending and merge the smallest two
      finalCommunities.sort((a, b) => a.nodes.length - b.nodes.length);
      const smallest = finalCommunities.shift()!;
      finalCommunities[0].nodes.push(...smallest.nodes);
    }
  } else if (targetResolution > finalCommunities.length) {
    // Split largest component if needed
    while (finalCommunities.length < targetResolution) {
      finalCommunities.sort((a, b) => b.nodes.length - a.nodes.length);
      const largest = finalCommunities[0];
      if (largest.nodes.length <= 1) break; // Can't split further

      const splitIdx = Math.floor(largest.nodes.length / 2);
      const splitNodes = largest.nodes.splice(splitIdx);
      finalCommunities.push({
        id: finalCommunities.length + 1,
        nodes: splitNodes
      });
    }
  }

  // Re-map community IDs back to 1-indexed integers
  const nodeCommunityFinalMap: { [key: string]: number } = {};
  finalCommunities.forEach((comm, idx) => {
    comm.nodes.forEach(nodeId => {
      nodeCommunityFinalMap[nodeId] = idx + 1;
    });
  });

  return nodeCommunityFinalMap;
}

// Endpoint to run dependency scanner and cluster files
app.post("/api/analyze", (req, res) => {
  const { files = DEFAULT_FILES, useSparseEdges = false, resolution = 4 } = req.body;

  // 1. Extract nodes (files)
  const nodes = files.map((f: any) => ({
    id: f.path,
    label: f.path,
    size: f.content.length,
    language: f.path.endsWith(".py") ? "python" : f.path.endsWith(".ts") ? "typescript" : "javascript"
  }));

  // 2. Extract edges
  let edges: any[] = [];
  if (useSparseEdges) {
    // Match the exact 3 edges in the user's initial graph
    edges = [
      { source: "tcas_core.py", target: "advisory_gen.py", type: "import" },
      { source: "advisory_gen.py", target: "audio_alert.py", type: "import" },
      { source: "radar_stream.py", target: "alt_detector.py", type: "import" }
    ];
  } else {
    // Real static code analyzer! Scan each file for import lines
    files.forEach((file: any) => {
      const lines = file.content.split("\n");
      lines.forEach((line: string) => {
        // Python style: import name, from name import ...
        // JS/TS style: import ... from 'name', require('name')
        const pyImportMatch = line.match(/^\s*import\s+([\w_]+)/);
        const pyFromImportMatch = line.match(/^\s*from\s+([\w_]+)\s+import/);
        const jsImportMatch = line.match(/import\s+.*\s+from\s+['"]\.?\/([\w_-]+)(\.py|\.ts|\.js)?['"]/);
        const jsRequireMatch = line.match(/require\(['"]\.?\/([\w_-]+)(\.py|\.ts|\.js)?['"]\)/);

        let targetModule = "";
        if (pyImportMatch) targetModule = pyImportMatch[1];
        else if (pyFromImportMatch) targetModule = pyFromImportMatch[1];
        else if (jsImportMatch) targetModule = jsImportMatch[1];
        else if (jsRequireMatch) targetModule = jsRequireMatch[1];

        if (targetModule) {
          // Check if this module matches one of our files (ignoring extension or matching exactly)
          const targetFile = files.find((f: any) => 
            f.path === targetModule || 
            f.path.startsWith(targetModule + ".")
          );
          if (targetFile && targetFile.path !== file.path) {
            // Avoid duplicate edges
            const exists = edges.some(e => e.source === file.path && e.target === targetFile.path);
            if (!exists) {
              edges.push({
                source: file.path,
                target: targetFile.path,
                type: "import"
              });
            }
          }
        }
      });
    });
  }

  // 3. Cluster communities
  const communityMap = performClustering(nodes, edges, resolution);

  // Attach community IDs to nodes
  const nodesWithCommunities = nodes.map((n: any) => ({
    ...n,
    community: communityMap[n.id] || 1
  }));

  // Unique list of community IDs
  const communityIds = Array.from(new Set(Object.values(communityMap))) as number[];

  res.json({
    nodes: nodesWithCommunities,
    edges,
    communitiesCount: communityIds.length,
    files
  });
});

// Endpoint to label communities using Gemini
app.post("/api/label-communities", async (req, res) => {
  const { nodes, edges, files } = req.body;

  // Group node paths and their code contents into community slots
  const communityGroups: { [key: number]: { files: string[]; codeSnippet: string } } = {};
  
  nodes.forEach((node: any) => {
    const commId = node.community;
    if (!communityGroups[commId]) {
      communityGroups[commId] = { files: [], codeSnippet: "" };
    }
    communityGroups[commId].files.push(node.id);
    
    // Find file content
    const matchedFile = files.find((f: any) => f.path === node.id);
    if (matchedFile) {
      communityGroups[commId].codeSnippet += `\n--- File: ${node.id} ---\n${matchedFile.content.slice(0, 400)}\n`;
    }
  });

  const activeClient = getGeminiClient();

  if (!activeClient) {
    // FALLBACK / No LLM Backend simulation (identical placeholder structure)
    const fallbackLabels = Object.keys(communityGroups).map(commIdStr => {
      const commId = parseInt(commIdStr);
      const group = communityGroups[commId];
      
      // Basic heuristic-based labeling depending on file names inside
      let label = `Community ${commId}`;
      let summary = `Placeholder summary for Community ${commId} containing files: ${group.files.join(", ")}.`;
      
      if (group.files.some(f => f.includes("core") || f.includes("threat") || f.includes("advisory"))) {
        label = "Threat Solver & Advisory Engine";
        summary = "Core subsystem that computes airspace separation metrics, evaluates potential intruder hazards, and triggers Resolution Advisories.";
      } else if (group.files.some(f => f.includes("radar") || f.includes("stream") || f.includes("alt"))) {
        label = "Telemetry & Sensor Fusion";
        summary = "Processes incoming transponder and ADS-B signals, tracks coordinate paths, and cleans pressure altitude streams.";
      } else if (group.files.some(f => f.includes("display") || f.includes("panel") || f.includes("pfd"))) {
        label = "Cockpit Presentation Systems";
        summary = "Manages human-machine interactions by rendering real-time radar positions and alerts on navigation screens.";
      } else if (group.files.some(f => f.includes("config") || f.includes("loader"))) {
        label = "System Configuration & Bounds";
        summary = "Central repository loading safety envelopes, altitude thresholds, and alert volume states.";
      }

      return {
        id: commId,
        label,
        summary,
        isAI: false
      };
    });

    return res.json({
      success: true,
      labeledCommunities: fallbackLabels,
      aiLabeled: false,
      warning: "No LLM backend configured; keeping Community N placeholders/heuristics. Set an API key (e.g. GEMINI_API_KEY) in Secrets panel."
    });
  }

  // GEMINI AI PATH
  try {
    const promptInput = `
You are an expert software architect and dependency graph visualizer called "Graphify AI".
We have analyzed a codebase and clustered files into communities.
Your task is to analyze the files and code snippets in each community below, then return a high-quality human-readable Label and a 2-sentence Summary of what that subsystem does.

Communities structure to analyze:
${Object.entries(communityGroups).map(([commId, data]) => `
Community ID: ${commId}
Included Files: ${data.files.join(", ")}
Code Samples:
${data.codeSnippet}
`).join("\n\n")}

Please return the response as a JSON array matching this exact schema:
[
  {
    "id": number, // Community ID (e.g. 1, 2, etc.)
    "label": "string", // A crisp, highly professional architectural system name (e.g., 'Threat Resolution Advisory Logic')
    "summary": "string" // A clear 2-sentence architectural summary explaining its role and key files.
  }
]
`;

    const response = await activeClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptInput,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              label: { type: Type.STRING, description: "Crisp architectural name for this system." },
              summary: { type: Type.STRING, description: "2-sentence functional summary of the community's files." }
            },
            required: ["id", "label", "summary"]
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "[]");
    
    // Merge labeled results
    const labeledCommunities = parsedData.map((item: any) => ({
      ...item,
      isAI: true
    }));

    res.json({
      success: true,
      labeledCommunities,
      aiLabeled: true
    });
  } catch (error: any) {
    console.error("Gemini labeling error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to contact Gemini API for community labeling."
    });
  }
});

// Endpoint to generate GRAPH_REPORT.md content
app.post("/api/generate-report", (req, res) => {
  const { nodes, edges, labeledCommunities, useSparseEdges } = req.body;

  // Let's create a beautiful markdown report content
  const timestamp = new Date().toISOString();
  
  let report = `# Graphify Report - Codebase Architecture & Modularity
Generated on ${timestamp.split("T")[0]} at ${timestamp.split("T")[1].slice(0,8)} UTC

## Executive Summary
This report analyzes the dependency structure of the codebase using **Graphify**. By evaluating module relationships and imports, we identified cohesive modules and clustered them into architectural communities.

- **Total Analyzed Nodes**: ${nodes.length} files
- **Total Dependency Edges**: ${edges.length} connections
- **Modularity State**: ${useSparseEdges ? "Sparse (Initial Configuration)" : "Fully Discovered Dependencies"}
- **Identified Subsystems**: ${labeledCommunities.length} communities

---

## Architectural Subsystems

`;

  labeledCommunities.forEach((comm: any) => {
    const filesInComm = nodes.filter((n: any) => n.community === comm.id).map((n: any) => n.id);
    report += `### 📦 Subsystem ${comm.id}: ${comm.label}\n`;
    report += `> **Role**: ${comm.summary}\n\n`;
    report += `**Included Files**:\n`;
    filesInComm.forEach((f: string) => {
      report += `- \`${f}\`\n`;
    });
    report += `\n**Subsystem Neighbors & Ingress Edges**:\n`;
    const inEdges = edges.filter((e: any) => {
      const sNode = nodes.find((n: any) => n.id === e.source);
      const tNode = nodes.find((n: any) => n.id === e.target);
      return (sNode?.community === comm.id && tNode?.community !== comm.id) || 
             (tNode?.community === comm.id && sNode?.community !== comm.id);
    });
    
    if (inEdges.length === 0) {
      report += `_Fully decoupled system. No external dependencies._\n`;
    } else {
      inEdges.forEach((e: any) => {
        report += `- Connection: \`${e.source}\` ➔ \`${e.target}\`\n`;
      });
    }
    report += `\n---\n\n`;
  });

  report += `
## Modularity Recommendations

1. **Config Loader Decoupling**: \`config_loader.py\` is connected to multiple files across different subsystems. Consider converting it into an immutable singleton pattern or utilizing dependency injection to avoid excessive coupling.
2. **Cohesive Interfaces**: The relationship between \`tcas_core.py\` and \`advisory_gen.py\` is high-affinity. Keep them co-located in the same architectural boundary to minimize inter-system chatter.
3. **Display Layer Separation**: Cockpit presentations (\`display_panel.py\`) should communicate strictly with processed stream abstractions rather than directly pulling from raw sensory inputs.

_Generated by Graphify Workspace with Gemini AI integration._
`;

  res.json({
    reportMarkdown: report,
    jsonState: {
      nodes,
      edges,
      communities: labeledCommunities,
      useSparseEdges,
      timestamp
    }
  });
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
