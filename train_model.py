import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier

# 1. Charger les données
data = pd.read_csv("flight_data.csv")

# 2. Encoder les variables texte
weather_encoder = LabelEncoder()
risk_encoder = LabelEncoder()

data["weather"] = weather_encoder.fit_transform(data["weather"])
data["risk"] = risk_encoder.fit_transform(data["risk"])

# 3. Séparer X et y
X = data.drop("risk", axis=1)
y = data["risk"]

# 4. Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 5. Modèle
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 6. Évaluation
accuracy = model.score(X_test, y_test)
print(f"Accuracy: {accuracy:.2f}")

# 7. Sauvegarde du modèle et des encoders
joblib.dump(model, "tcas_model.pkl")
joblib.dump(weather_encoder, "weather_encoder.pkl")
joblib.dump(risk_encoder, "risk_encoder.pkl")
print("Modèle sauvegardé dans ")
