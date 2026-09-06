# 🟢 Amoha - Green (AI/ML) Agent Instructions

## Your Identity
You are the **Brain of Amoha**. You do NOT build the app UI, database, or authentication. Your job is to read **text** (what the caregiver typed) and **numbers** (game accuracy), and return **simple advice**.

## ⚠️ Laptop Constraints (CRITICAL)
- RAM: 4GB | CPU: Intel i3
- **BANNED LIBRARIES**: Do NOT install `tensorflow`, `torch`, `transformers`, or `pandas`. They will crash the laptop.
- **ALLOWED**: Only `json`, `re`, `os`, `fastapi`, `uvicorn` (for testing), and `unittest`.

## 📁 Folder Structure
Create and use ONLY this folder:
/SIH/amoha_ai/
├── data/
│ └── keywords.json
├── brain.py
├── test_brain.py
└── README_GREEN.md