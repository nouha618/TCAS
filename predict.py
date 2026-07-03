import joblib
import numpy as np

# Charger le modèle et les encoders sauvegardés
model = joblib.load("models/tcas_model.pkl")
weather_encoder = joblib.load("models/weather_encoder.pkl")
risk_encoder = joblib.load("models/risk_encoder.pkl")

def predict_risk(distance, altitude_diff, relative_speed, fuel, weather):
    weather_encoded = weather_encoder.transform([weather])[0]
    new_flight = [[distance, altitude_diff, relative_speed, fuel, weather_encoded]]
    prediction = model.predict(new_flight)
    return risk_encoder.inverse_transform(prediction)[0]

if __name__ == "__main__":
    result = predict_risk(
        distance=2,
        altitude_diff=300,
        relative_speed=180,
        fuel=50,
        weather="storm"
    )
    print("Risk level:", result)