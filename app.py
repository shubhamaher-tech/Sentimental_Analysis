import os
import re
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Base directory paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "sentiment_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "tfidf_vectorizer.pkl")

# Load the pre-trained model and vectorizer
try:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    print("✓ Model and vectorizer loaded successfully.")
except Exception as e:
    print(f"Error loading artifacts: {e}")
    model = None
    vectorizer = None

def clean_tweet(text: str) -> str:
    """Standard preprocessing logic for tweet sentiment analysis."""
    if not isinstance(text, str):
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove mentions (@username)
    text = re.sub(r'@[A-Za-z0-9_]+', '', text)
    # Remove URLs
    text = re.sub(r'https?://[A-Za-z0-9./]+', '', text)
    # Remove hashtags and special symbols
    text = re.sub(r'#[A-Za-z0-9_]+', '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    # Strip excess whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

@app.route("/predict", methods=["POST"])
def predict():
    if model is None or vectorizer is None:
        return jsonify({"error": "Model or vectorizer is not loaded on the server."}), 500

    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Invalid request. 'text' field is required."}), 400

    raw_text = data["text"]
    cleaned = clean_tweet(raw_text)

    if not cleaned:
        return jsonify({"error": "Text contains no valid words after preprocessing."}), 400

    # Vectorize and compute class probabilities
    features = vectorizer.transform([cleaned])
    probabilities = model.predict_proba(features)[0]
    classes = [str(c).lower() for c in model.classes_]

    # Map probability scores to class names
    prob_dict = {
        cls: round(float(prob) * 100, 2)
        for cls, prob in zip(classes, probabilities)
    }

    # Ensure negative, neutral, positive are keyed consistently
    for standard_label in ["negative", "neutral", "positive"]:
        if standard_label not in prob_dict:
            prob_dict[standard_label] = 0.0

    predicted_sentiment = max(prob_dict, key=prob_dict.get)

    return jsonify({
        "text": raw_text,
        "sentiment": predicted_sentiment,
        "confidence": prob_dict
    }), 200

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)