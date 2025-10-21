# ~/Desktop/wasedaai-rag/build_embeddings_faculty_rules.py
import os, json
import numpy as np
from pathlib import Path
from tqdm import tqdm
from openai import OpenAI
import shutil

RAG_ROOT = Path.cwd()
RECORDS_JSON = RAG_ROOT / "outputs/faculty_rules/records.json"
EMB_NPZ = RAG_ROOT / "outputs/faculty_rules/embeddings.npz"

# web 側の同期先
WEB_DATA_DIR = Path.home() / "Desktop/wasedaai-web/data/faculty_rules"

MODEL = "text-embedding-3-small"  # 安価・十分な精度
BATCH = 64

def embed_texts(client, texts):
    # OpenAI SDKは最大トークン数に注意。ここは単純に1テキスト=1コール
    vecs = []
    for t in tqdm(texts, desc="埋め込み生成"):
        emb = client.embeddings.create(model=MODEL, input=t)
        vecs.append(emb.data[0].embedding)
    return np.array(vecs, dtype=np.float32)

def l2_normalize(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True) + 1e-8
    return mat / norms

def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY が未設定です。'export OPENAI_API_KEY=...' を実行してください。")

    if not RECORDS_JSON.exists():
        raise SystemExit(f"{RECORDS_JSON} がありません。先に extract_faculty_rules_from_pdfs.py を実行してください。")

    with open(RECORDS_JSON, "r", encoding="utf-8") as f:
        records = json.load(f)

    texts = [r.get("content","") for r in records]
    client = OpenAI()

    vecs = embed_texts(client, texts)
    vecs = l2_normalize(vecs)

    np.savez_compressed(EMB_NPZ, arr_0=vecs)
    print(f"✅ 保存: {EMB_NPZ}  shape={vecs.shape}")

    # web 側へ同期（records.json / embeddings.npz の2点）
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(RECORDS_JSON, WEB_DATA_DIR / "records.json")
    shutil.copy2(EMB_NPZ,      WEB_DATA_DIR / "embeddings.npz")
    print(f"🔄 同期: {WEB_DATA_DIR}")

    print("🎉 完了：wasedaai-web 側で dev を再起動すれば RAG に反映されます。")

if __name__ == "__main__":
    main()
