import os, json, faiss, numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL_EMB = "text-embedding-3-small"
MODEL_CHAT = "gpt-4o-mini"

INDEX_PATH = "index.faiss"
META_PATH  = "meta.jsonl"

def load_meta():
    items = []
    with open(META_PATH, "r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line))
    return items

def embed_query(q):
    e = client.embeddings.create(model=MODEL_EMB, input=[q])
    v = np.array(e.data[0].embedding, dtype="float32")
    faiss.normalize_L2(v.reshape(1,-1))
    return v

def retrieve(query, k=5):
    index = faiss.read_index(INDEX_PATH)
    meta  = load_meta()
    qv = embed_query(query)
    D, I = index.search(qv.reshape(1,-1), k)
    hits = [meta[i] for i in I[0] if 0 <= i < len(meta)]
    return hits

def answer(query, hits):
    # RAGの候補を箇条書きでLLMに渡す
    lines = []
    for h in hits:
        lines.append(
            f"- {h.get('name','不明')}（教員: {h.get('instructor','不明')} / 開講: {h.get('semester_time','不明')} / 学部: {h.get('faculty','不明')}）\n"
            f"  評価方法: {h.get('grading','不明')}\n"
            f"  抜粋:\n{h.get('content','')[:400]}..."
        )
    context = "\n\n".join(lines)

    system = (
        "あなたは早稲田大学のシラバス情報に基づいて回答するアシスタントです。\n"
        "\n"
        "【回答の基本方針】\n"
        "- 提供された検索結果のみを根拠として回答してください\n"
        "- 検索結果にない情報は推測せず、『情報が見つかりませんでした』と答えてください\n"
        "- 正確性を最優先し、不確実な情報は提供しないでください\n"
        "\n"
        "【回答形式】\n"
        "- 簡潔で分かりやすい日本語で回答してください\n"
        "- 授業の基本情報（科目名、担当教員、時限）を最初に示してください\n"
        "- シラバスURLが提供されている場合は、必ず言及してください\n"
        "- 関連する複数の授業がある場合は、それぞれを整理して提示してください\n"
        "\n"
        "【情報の優先順位】\n"
        "1. 科目名と担当教員\n"
        "2. 開講時限とキャンパス\n"
        "3. 授業概要と到達目標\n"
        "4. 成績評価方法\n"
        "5. 教科書・参考文献\n"
        "6. シラバスURL（利用可能な場合）\n"
        "\n"
        "学生の履修計画に役立つ実用的な情報を提供することを心がけてください。"
    )
    
    user_message = f"質問: {query}\n\n関連する授業情報:\n{context}"
    
    response = client.chat.completions.create(
        model=MODEL_CHAT,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message}
        ],
        temperature=0.1,
        max_tokens=1000
    )
    
    return response.choices[0].message.content

def main():
    query = input("検索したい授業について質問してください: ")
    hits = retrieve(query)
    
    if not hits:
        print("該当する授業が見つかりませんでした。")
        return
    
    print(f"\n検索結果: {len(hits)}件の授業が見つかりました\n")
    answer_text = answer(query, hits)
    print(answer_text)

if __name__ == "__main__":
    main()

