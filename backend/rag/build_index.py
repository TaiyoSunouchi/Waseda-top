import os, pandas as pd, faiss, numpy as np, json
from dotenv import load_dotenv
from openai import OpenAI

# APIキーを.envから読み込む
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CSV_PATH = "waseda_law_syllabus.csv"
INDEX_PATH = "index.faiss"
META_PATH  = "meta.jsonl"

MODEL = "text-embedding-3-small"  # 安い＆高品質

def row_to_content(r):
    parts = [
        f"[year] {r.get('year','')}",
        f"[faculty] {r.get('faculty','')}",
        f"[code] {r.get('code','')}",
        f"[name] {r.get('name','')}",
        f"[instructor] {r.get('instractur','')}",  # CSVではinstractur
        f"[time] {r.get('time','')}",
        f"[campus] {r.get('campus','')}",
        f"[description] {r.get('description','')}",
        f"[goal] {r.get('goal','')}",
        f"[textbook] {r.get('textbook','')}",
        f"[cf] {r.get('cf','')}",
        f"[grading] {r.get('grading','')}",
        f"[notes] {r.get('else','')}",
    ]
    return "\n".join([p for p in parts if p and not str(p).isspace()])

def embed_texts(texts):
    res = client.embeddings.create(model=MODEL, input=texts)
    return np.array([d.embedding for d in res.data], dtype="float32")

def main():
    df = pd.read_csv(CSV_PATH)
    docs = []
    for i, r in df.iterrows():
        content = row_to_content(r)
        meta = {
            "id": i,
            "code": r.get("code",""),
            "name": r.get("name",""),
            "instructor": r.get("instractur",""),
            "semester_time": r.get("time",""),
            "faculty": r.get("faculty",""),
            "campus": r.get("campus",""),
            "grading": r.get("grading",""),
            "content": content,
        }
        docs.append(meta)

    texts = [d["content"] for d in docs]
    embs  = embed_texts(texts)

    dim = embs.shape[1]
    index = faiss.IndexFlatIP(dim)
    faiss.normalize_L2(embs)
    index.add(embs)

    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")

    print(f"✅ Saved {INDEX_PATH} and {META_PATH} with {len(docs)} items.")

if __name__ == "__main__":
    main()


