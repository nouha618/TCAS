# 🛫 TCAS AI — Détection de risque de collision

Système simplifié inspiré du **TCAS (Traffic Collision Avoidance System)**, qui utilise un modèle de Machine Learning (Random Forest) pour évaluer le niveau de risque de collision entre deux aéronefs à partir de paramètres de vol.

Ce projet fait partie d'une suite de 4 modules formant un **système intelligent de sécurité de vol et de navigation autonome** :
1. **Détection de risque de collision TCAS** *(ce projet)*
2. Classification de stabilité longitudinale
3. Prédiction de trajectoire de vol
4. Module de décision d'évitement de collision

---

## 📋 Description

Le modèle prédit un niveau de risque (**Low / Medium / High**) à partir de 5 paramètres :
- Distance entre les aéronefs (NM)
- Différence d'altitude (ft)
- Vitesse relative (knots)
- Niveau de carburant (%)
- Conditions météo (clear / cloudy / rain / storm)

Le dataset est **synthétique**, généré selon une logique de score pondéré combinant ces variables, avec un bruit aléatoire pour simuler la variabilité réelle.

---

## 📂 Structure du projet

```
tcas/
├── generate_dataset.py     # Génère le dataset synthétique (flight_data.csv)
├── train_model.py          # Entraîne le modèle Random Forest
├── predict.py               # Prédiction en ligne de commande (exemple)
├── app.py                   # Interface web interactive (Streamlit)
├── flight_data.csv          # Dataset généré (créé après exécution)
├── models/                  # Modèle et encoders sauvegardés
│   ├── tcas_model.pkl
│   ├── weather_encoder.pkl
│   └── risk_encoder.pkl
├── requirements.txt
└── README.md
```

---

## ⚙️ Installation

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd tcas
```

### 2. Créer et activer l'environnement virtuel

**Windows (PowerShell) :**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux :**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

---

## 🚀 Utilisation

Exécuter les étapes dans l'ordre :

### 1. Générer le dataset
```bash
python generate_dataset.py
```
→ Crée `flight_data.csv` (500 échantillons).

### 2. Entraîner le modèle
```bash
python train_model.py
```
→ Affiche l'accuracy et sauvegarde le modèle + encoders dans `models/`.

### 3. Tester une prédiction en ligne de commande
```bash
python predict.py
```
→ Exemple de prédiction pour un vol donné (modifiable dans le script).

### 4. Lancer l'interface web
```bash
streamlit run app.py
```
→ Ouvre une interface interactive dans le navigateur avec sliders, graphique de probabilités et importance des variables.

---

## 🧠 Modèle

- **Algorithme :** Random Forest Classifier (scikit-learn)
- **Variables d'entrée :** distance, altitude_diff, relative_speed, fuel, weather (encodé)
- **Variable cible :** risk (Low / Medium / High)
- **Split :** 80% train / 20% test

---

## 📦 Dépendances

```
pandas
numpy
scikit-learn
joblib
streamlit
```

(voir `requirements.txt`)

---

## 📌 Notes

- Le dataset étant synthétique, ce projet a une visée **pédagogique et exploratoire**, et ne reproduit pas la logique réelle et certifiée d'un système TCAS embarqué.
- Le dossier `models/` est généré automatiquement par `train_model.py` — il n'est pas nécessaire de le créer manuellement.

