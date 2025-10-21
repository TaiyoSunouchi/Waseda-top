#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, re, json, argparse, pickle
import pandas as pd
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import glob

# ====== 設定（日本語に強い多言語モデル：無料・API不要） ======
MODEL_NAME = "intfloat/multilingual-e5-base"  # 日本語RAGで相性◎
EMBED_BATCH = 64

# ====== どの列を使うか（法学部CSVの23列に対応） ======
SHORT_COLS = ["科目名","担当教員","学期曜日時限","キャンパス","使用教室","配当年次","単位数","科目区分","授業方法区分","授業で使用する言語","レベル","授業形態","副題"]
LONG_COLS  = ["授業概要","授業の到達目標","事前・事後学習の内容","授業計画","教科書","参考文献","成績評価方法","備考・関連URL"]

def normalize(text: str) -> str:
    if not isinstance(text, str):
        return ""
    # 軽い正規化（空白/改行）
    t = text.replace("\r", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return t

def build_doc_text(row: Dict[str, Any]) -> str:
    """1件の講座を検索しやすい形に連結"""
    header_parts = []
    for c in SHORT_COLS:
        v = normalize(row.get(c, ""))
        if v:
            header_parts.append(f"{c}: {v}")
    header = " / ".join(header_parts)

    body_parts = []
    for c in LONG_COLS:
        v = normalize(row.get(c, ""))
        if v:
            body_parts.append(f"{c}\n{v}")
    body = "\n\n".join(body_parts)

    # 先頭に短い情報、後ろに本文
    text = (header + "\n\n" + body).strip()
    return text

def split_chunks(text: str, max_chars: int = 900, overlap: int = 120) -> List[str]:
    """
    シンプルなチャンク分割（文字数ベース）。
    - まずはセクション見出しや改行で切りやすく
    - 長ければ固定長でスライド分割
    """
    text = normalize(text)
    if len(text) <= max_chars:
        return [text]

    # セクションっぽいところで一回分割（完全でなくてもOK）
    parts = re.split(r"\n(?=[^\n]{0,40}：|^第[一二三四五六七八九十0-9]+回|^授業計画|^教科書|^参考文献|^成績評価方法)", text, flags=re.M)
    refined = []
    for part in parts:
        part = part.strip()
        if not part: 
            continue
        if len(part) <= max_chars:
            refined.append(part)
        else:
            # 固定長スライス（オーバーラップ付き）
            start = 0
            while start < len(part):
                end = start + max_chars
                refined.append(part[start:end])
                if end >= len(part): break
                start = max(0, end - overlap)
    return refined

def embed_texts(model: SentenceTransformer, texts: List[str]) -> np.ndarray:
    # e5はクエリ/ドキュメントでプレフィックス推奨（改善したければ付ける）
    # ここではドキュメントのみなので "passage: " を付与して埋め込み
    prefixed = [f"passage: {t}" for t in texts]
    embs = model.encode(prefixed, batch_size=EMBED_BATCH, show_progress_bar=True, normalize_embeddings=True)
    return np.asarray(embs, dtype="float32")

def process_csv_files(csv_dir: str) -> tuple[List[str], List[Dict[str, Any]]]:
    """複数のCSVファイルを処理してドキュメントとメタデータを生成"""
    csv_files = glob.glob(os.path.join(csv_dir, "*.csv"))
    print(f"[INFO] 見つかったCSVファイル: {len(csv_files)}個")
    
    all_docs = []
    all_metadatas = []
    
    for csv_file in csv_files:
        print(f"[INFO] 処理中: {os.path.basename(csv_file)}")
        df = pd.read_csv(csv_file).fillna("")
        
        # ファイル名から曜日情報を抽出
        filename = os.path.basename(csv_file)
        day_info = ""
        if "月曜" in filename:
            day_info = "月曜日"
        elif "火曜" in filename:
            day_info = "火曜日"
        elif "水曜" in filename:
            day_info = "水曜日"
        elif "木曜" in filename:
            day_info = "木曜日"
        elif "金土" in filename:
            day_info = "金曜日・土曜日"
        
        # 1講座→複数チャンク化＋メタデータ保持
        for i, row in df.iterrows():
            doc_text = build_doc_text(row)
            chunks = split_chunks(doc_text, max_chars=900, overlap=120)
            for j, ch in enumerate(chunks):
                all_docs.append(ch)
                all_metadatas.append({
                    "row_index": int(i),
                    "chunk_index": j,
                    "source_file": filename,
                    "day_info": day_info,
                    "科目名": normalize(row.get("科目名","")),
                    "担当教員": normalize(row.get("担当教員","")),
                    "学期曜日時限": normalize(row.get("学期曜日時限","")),
                    "キャンパス": normalize(row.get("キャンパス","")),
                    "備考・関連URL": normalize(row.get("備考・関連URL","")),
                })
    
    return all_docs, all_metadatas

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv_dir", default="./2025 秋　法", help="法学部CSVファイルが入っているディレクトリ")
    ap.add_argument("--out_dir", default="./wasedaai_law_index", help="インデックス保存先ディレクトリ")
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    # CSVファイルを処理
    docs, metadatas = process_csv_files(args.csv_dir)
    print(f"[INFO] 総チャンク数: {len(docs)}")

    # ベクトル化
    model = SentenceTransformer(MODEL_NAME)
    embs = embed_texts(model, docs)  # shape: (N, D)
    dim = embs.shape[1]

    # FAISS（コサイン類似度→内積。normalize済なのでIndexFlatIPでOK）
    index = faiss.IndexFlatIP(dim)
    index.add(embs)

    # 保存
    faiss.write_index(index, os.path.join(args.out_dir, "index.faiss"))
    with open(os.path.join(args.out_dir, "metadatas.pkl"), "wb") as f:
        pickle.dump(metadatas, f)
    with open(os.path.join(args.out_dir, "docs.pkl"), "wb") as f:
        pickle.dump(docs, f)

    # 検索時に同じモデルを使えるよう、モデル名も保存
    with open(os.path.join(args.out_dir, "config.json"), "w", encoding="utf-8") as f:
        json.dump({"model_name": MODEL_NAME}, f, ensure_ascii=False, indent=2)

    print("[OK] インデックスを保存しました:", args.out_dir)

if __name__ == "__main__":
    main()

