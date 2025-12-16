from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import sys
import os

from google import genai
from google.genai import types
from utils.file_parser import extract_text

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = Flask(__name__, template_folder="templates", static_folder="static")

# Store document text globally (simple version)
DOCUMENT_TEXT = ""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload():
    global DOCUMENT_TEXT

    file = request.files["file"]
    path = "temp.pdf"
    file.save(path)

    DOCUMENT_TEXT = extract_text(path)

    if not DOCUMENT_TEXT.strip():
        return jsonify({"message": "No readable text found in document"}), 400

    return jsonify({"message": "Document uploaded successfully"})

@app.route("/ask", methods=["POST"])
def ask():
    question = request.json.get("question")

    if not question:
        return jsonify({"answer": "Please ask a question."})

    # 🧠 If document exists, include it
    if DOCUMENT_TEXT:
        prompt = f"""
You are a helpful assistant.

Here is a document provided by the user:
{DOCUMENT_TEXT[:12000]}

Question:
{question}

Answer the question. Use the provided document if it contains relevant information.
If the answer is not found in the document, use your general knowledge to answer helpfuly.
"""
    else:
        prompt = question

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="Be clear and simple"
        )
    )

    return jsonify({"answer": response.text})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
