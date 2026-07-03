import streamlit as st
import joblib
import pandas as pd

# Configuration de la page
st.set_page_config(page_title="TCAS AI - Détection de risque", page_icon="🛫", layout="centered")

# Chargement du modèle et des encoders (une seule fois, mis en cache)
@st.cache_resource
def load_model():
    model = joblib.load("tcas_model.pkl")
    weather_encoder = joblib.load("weather_encoder.pkl")
    risk_encoder = joblib.load("risk_encoder.pkl")
    return model, weather_encoder, risk_encoder

model, weather_encoder, risk_encoder = load_model()

# --- En-tête ---
st.title("🛫 TCAS AI — Détection de risque de collision")
st.write("Système simplifié inspiré du **Traffic Collision Avoidance System**, basé sur un modèle Random Forest.")

st.divider()

# --- Formulaire d'entrée ---
st.subheader("Paramètres du vol")

col1, col2 = st.columns(2)

with col1:
    distance = st.slider("Distance (NM)", 0.5, 25.0, 5.0, step=0.1)
    altitude_diff = st.slider("Différence d'altitude (ft)", 50, 2500, 500, step=10)
    relative_speed = st.slider("Vitesse relative (knots)", 40, 300, 150, step=5)

with col2:
    fuel = st.slider("Niveau de carburant (%)", 20.0, 100.0, 60.0, step=1.0)
    weather = st.selectbox("Conditions météo", ["clear", "cloudy", "rain", "storm"])

st.divider()

# --- Prédiction ---
if st.button("🔍 Analyser le risque", type="primary", use_container_width=True):
    weather_encoded = weather_encoder.transform([weather])[0]
    new_flight = [[distance, altitude_diff, relative_speed, fuel, weather_encoded]]

    prediction = model.predict(new_flight)
    risk_label = risk_encoder.inverse_transform(prediction)[0]

    proba = model.predict_proba(new_flight)[0]
    proba_dict = dict(zip(risk_encoder.inverse_transform(model.classes_), proba))

    # Affichage coloré selon le niveau de risque
    if risk_label == "High":
        st.error(f"⚠️ Niveau de risque : **{risk_label}**")
    elif risk_label == "Medium":
        st.warning(f"⚡ Niveau de risque : **{risk_label}**")
    else:
        st.success(f"✅ Niveau de risque : **{risk_label}**")

    # Graphique des probabilités par classe
    st.subheader("Probabilités par catégorie")
    proba_df = pd.DataFrame.from_dict(proba_dict, orient="index", columns=["Probabilité"])
    st.bar_chart(proba_df)

    # Importance des variables
    st.subheader("Importance des variables dans la décision")
    feature_names = ["distance", "altitude_diff", "relative_speed", "fuel", "weather"]
    importance_df = pd.DataFrame({
        "Variable": feature_names,
        "Importance": model.feature_importances_
    }).sort_values("Importance", ascending=False)
    st.bar_chart(importance_df.set_index("Variable"))

st.divider()
st.caption("Projet pédagogique — PFE Détection IA pour systèmes anti-collision (TCAS)")