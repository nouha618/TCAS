"""
Génère un dataset synthétique réaliste pour le projet TCAS (Traffic Collision Avoidance System).
Logique : le risque dépend de la distance, de la différence d'altitude, de la vitesse relative,
du carburant et des conditions météo, avec un peu de bruit aléatoire pour rester réaliste.
"""

import numpy as np
import pandas as pd

np.random.seed(42)
N = 500

weather_options = ["clear", "cloudy", "rain", "storm"]
weather_risk_weight = {"clear": 0, "cloudy": 1, "rain": 2, "storm": 3}

rows = []
for _ in range(N):
    distance = np.round(np.random.uniform(0.5, 25), 2)
    altitude_diff = np.round(np.random.uniform(50, 2500), 0)
    relative_speed = np.round(np.random.uniform(40, 300), 0)
    fuel = np.round(np.random.uniform(20, 100), 1)
    weather = np.random.choice(weather_options)

    score = 0
    score += (25 - distance) * 1.5
    score += (2500 - altitude_diff) * 0.02
    score += relative_speed * 0.3
    score += weather_risk_weight[weather] * 10
    score -= fuel * 0.05
    score += np.random.normal(0, 8)

    if score > 116:
        risk = "High"
    elif score > 90:
        risk = "Medium"
    else:
        risk = "Low"

    rows.append([distance, altitude_diff, relative_speed, fuel, weather, risk])

df = pd.DataFrame(rows, columns=["distance", "altitude_diff", "relative_speed", "fuel", "weather", "risk"])

print("Répartition des classes de risque :")
print(df["risk"].value_counts())

df.to_csv("flight_data.csv", index=False)
print("\nDataset sauvegardé : flight_data.csv (500 lignes)")