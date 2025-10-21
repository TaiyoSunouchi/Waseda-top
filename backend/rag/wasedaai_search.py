#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, json, argparse, pickle
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--index_dir", default="./wasedaai_index", help="インデックス保存先ディレクトリ")
    ap.add_argument("--query", required=True, help="検索クエリ（日本語OK）")
    ap.add_argument("--k", type=int, default=5, help="上位いくつ返すか")
    args = ap.parse_args()

    # 読み込み
    index = faiss.read_index(os.path.join(args.index_dir, "index.faiss"))
    with open(os.path.join(args.index_dir, "metadatas.pkl"), "rb") as f:
        metadatas = pickle.load(f)
    with open(os.path.join(args.index_dir, "docs.pkl"), "rb") as f:
        docs = pickle.load(f)
    with open(os.path.join(args.index_dir, "config.json"), "r", encoding="utf-8") as f:
        cfg = json.load(f)

    model_name = cfg.get("model_name", "intfloat/multilingual-e5-base")
    model = SentenceTransformer(model_name)

    # e5はクエリ側に "query: " を付けると精度UP
    q_emb = model.encode([f"query: {args.query}"], normalize_embeddings=True)
    D, I = index.search(np.asarray(q_emb, dtype="float32"), args.k)
    I = I[0]; D = D[0]

    print("=== 検索結果 ===")
    for rank, (idx, score) in enumerate(zip(I, D), start=1):
        md = metadatas[idx]
        snippet = docs[idx][:200].replace("\n"," ")
        syllabus_url = md.get('備考・関連URL','')
        
        print(f"[{rank}] score={score:.3f}  科目名={md.get('科目名','')}  担当={md.get('担当教員','')}  時限={md.get('学期曜日時限','')}")
        if syllabus_url:
            print(f"シラバスURL: {syllabus_url}")
        else:
            print("シラバスURL: 未設定")
        print(f"内容: {snippet}...")
        print("-"*80)

if __name__ == "__main__":
    main()
