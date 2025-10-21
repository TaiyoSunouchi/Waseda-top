#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os, json, pickle
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify
from flask_cors import CORS
import argparse

app = Flask(__name__)
CORS(app)

class UnifiedRAGSystem:
    def __init__(self, faculty_rules_dir="./outputs/faculty_rules", law_index_dir="./wasedaai_law_index"):
        self.faculty_rules_dir = faculty_rules_dir
        self.law_index_dir = law_index_dir
        
        # 学部規則データの読み込み
        self.faculty_rules_loaded = False
        if os.path.exists(faculty_rules_dir):
            try:
                with open(os.path.join(faculty_rules_dir, "records.json"), "r", encoding="utf-8") as f:
                    self.faculty_rules_records = json.load(f)
                self.faculty_rules_embeddings = np.load(os.path.join(faculty_rules_dir, "embeddings.npz"))["arr_0"]
                self.faculty_rules_loaded = True
                print(f"[INFO] 学部規則データを読み込みました: {len(self.faculty_rules_records)}件")
            except Exception as e:
                print(f"[WARNING] 学部規則データの読み込みに失敗: {e}")
        
        # 法学部授業データの読み込み
        self.law_data_loaded = False
        if os.path.exists(law_index_dir):
            try:
                self.law_index = faiss.read_index(os.path.join(law_index_dir, "index.faiss"))
                with open(os.path.join(law_index_dir, "metadatas.pkl"), "rb") as f:
                    self.law_metadatas = pickle.load(f)
                with open(os.path.join(law_index_dir, "docs.pkl"), "rb") as f:
                    self.law_docs = pickle.load(f)
                with open(os.path.join(law_index_dir, "config.json"), "r", encoding="utf-8") as f:
                    self.law_config = json.load(f)
                self.law_data_loaded = True
                print(f"[INFO] 法学部授業データを読み込みました: {len(self.law_docs)}件")
            except Exception as e:
                print(f"[WARNING] 法学部授業データの読み込みに失敗: {e}")
        
        # モデルの初期化（法学部データ用）
        if self.law_data_loaded:
            model_name = self.law_config.get("model_name", "intfloat/multilingual-e5-base")
        else:
            model_name = "intfloat/multilingual-e5-base"
        
        self.model = SentenceTransformer(model_name)
        print(f"[INFO] 法学部データ用モデルを初期化しました: {model_name}")
        
        # 学部規則データ用のモデル（1536次元）
        if self.faculty_rules_loaded:
            # OpenAI APIを使用する場合は、直接APIを呼び出す必要がある
            # ここでは簡易的にSentenceTransformerで代替（次元が異なるため注意）
            self.faculty_model = None  # OpenAI APIが必要
            print(f"[INFO] 学部規則データはOpenAI text-embedding-3-smallで作成されています")
    
    def search_faculty_rules(self, query: str, k: int = 3):
        """学部規則を検索（現在は無効）"""
        # OpenAI APIが必要なため、現在は無効
        return []
    
    def search_law_courses(self, query: str, k: int = 3):
        """法学部授業を検索"""
        if not self.law_data_loaded:
            return []
        
        # e5はクエリ側に "query: " を付けると精度UP
        q_emb = self.model.encode([f"query: {query}"], normalize_embeddings=True)
        D, I = self.law_index.search(np.asarray(q_emb, dtype="float32"), k)
        I = I[0]; D = D[0]
        
        results = []
        for idx, score in zip(I, D):
            md = self.law_metadatas[idx]
            syllabus_url = md.get("備考・関連URL", "")
            
            # シラバスURLが含まれている場合は明確に表示
            if syllabus_url:
                syllabus_info = f"シラバスURL: {syllabus_url}"
            else:
                syllabus_info = "シラバスURL: 未設定"
            
            results.append({
                "type": "law_course",
                "score": float(score),
                "content": self.law_docs[idx],
                "syllabus_url": syllabus_url,
                "syllabus_info": syllabus_info,
                "metadata": {
                    "科目名": md.get("科目名", ""),
                    "担当教員": md.get("担当教員", ""),
                    "学期曜日時限": md.get("学期曜日時限", ""),
                    "キャンパス": md.get("キャンパス", ""),
                    "曜日": md.get("day_info", ""),
                    "ファイル": md.get("source_file", ""),
                    "備考・関連URL": syllabus_url
                }
            })
        
        return results
    
    def unified_search(self, query: str, k: int = 5):
        """統合検索"""
        faculty_results = self.search_faculty_rules(query, k//2 + 1)
        law_results = self.search_law_courses(query, k//2 + 1)
        
        # 結果を統合してスコア順にソート
        all_results = faculty_results + law_results
        all_results.sort(key=lambda x: x["score"], reverse=True)
        
        return all_results[:k]

# グローバルRAGシステム
rag_system = None

@app.route('/search', methods=['POST'])
def search():
    global rag_system
    
    data = request.get_json()
    query = data.get('query', '')
    k = data.get('k', 5)
    
    if not query:
        return jsonify({'error': 'クエリが空です'}), 400
    
    try:
        results = rag_system.unified_search(query, k)
        
        # 結果を整形してシラバスURLを明確に表示
        formatted_results = []
        for result in results:
            formatted_result = {
                'type': result['type'],
                'score': result['score'],
                'content': result['content'],
                'metadata': result['metadata']
            }
            
            # 法学部授業の場合はシラバスURL情報を追加
            if result['type'] == 'law_course':
                formatted_result['syllabus_url'] = result.get('syllabus_url', '')
                formatted_result['syllabus_info'] = result.get('syllabus_info', 'シラバスURL: 未設定')
            
            formatted_results.append(formatted_result)
        
        return jsonify({
            'query': query,
            'results': formatted_results,
            'total_results': len(formatted_results)
        })
    except Exception as e:
        return jsonify({'error': f'検索エラー: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    global rag_system
    return jsonify({
        'status': 'healthy',
        'faculty_rules_loaded': rag_system.faculty_rules_loaded if rag_system else False,
        'law_data_loaded': rag_system.law_data_loaded if rag_system else False
    })

def main():
    global rag_system
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--faculty_rules_dir", default="./outputs/faculty_rules", help="学部規則データディレクトリ")
    parser.add_argument("--law_index_dir", default="./wasedaai_law_index", help="法学部インデックスディレクトリ")
    parser.add_argument("--port", type=int, default=5000, help="サーバーポート")
    parser.add_argument("--host", default="0.0.0.0", help="サーバーホスト")
    args = parser.parse_args()
    
    print("[INFO] RAGシステムを初期化中...")
    rag_system = UnifiedRAGSystem(args.faculty_rules_dir, args.law_index_dir)
    
    print(f"[INFO] サーバーを起動中... http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=True)

if __name__ == "__main__":
    main()
