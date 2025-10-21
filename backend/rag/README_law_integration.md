# WasedaAI RAG システム - 法学部データ統合版

「2025 秋　法」フォルダ内のCSVファイルをRAGシステムに統合し、wasedaai-webのチャット欄で法学部の授業情報を検索できるようになりました。

## システム構成

### 作成されたファイル

1. **`process_law_csvs.py`** - 法学部CSVファイルを処理してインデックスを構築
2. **`search_law_courses.py`** - 法学部授業データの検索スクリプト
3. **`unified_server.py`** - 統合RAGサーバー（法学部データ + 学部規則データ）

### データ構造

- **法学部データ**: `./wasedaai_law_index/` に保存
  - `index.faiss`: FAISSベクトルインデックス
  - `metadatas.pkl`: メタデータ（科目名、担当教員、時限など）
  - `docs.pkl`: テキストチャンク
  - `config.json`: 設定情報

- **学部規則データ**: `./outputs/faculty_rules/` に保存
  - `records.json`: テキストレコード
  - `embeddings.npz`: 埋め込みベクトル

## 使用方法

### 1. 法学部データのインデックス構築

```bash
python process_law_csvs.py --csv_dir "./2025 秋　法" --out_dir "./wasedaai_law_index"
```

### 2. 法学部授業の検索

```bash
python search_law_courses.py --query "憲法" --k 5
```

### 3. 統合サーバーの起動

```bash
python unified_server.py --port 5001
```

### 4. API経由での検索

```bash
# ヘルスチェック
curl http://localhost:5001/health

# 検索
curl -X POST http://localhost:5001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "憲法", "k": 3}'
```

## API仕様

### GET /health
サーバーの状態を確認

**レスポンス:**
```json
{
  "status": "healthy",
  "faculty_rules_loaded": false,
  "law_data_loaded": true
}
```

### POST /search
統合検索を実行

**リクエスト:**
```json
{
  "query": "検索クエリ",
  "k": 5
}
```

**レスポンス:**
```json
{
  "query": "憲法",
  "results": [
    {
      "type": "law_course",
      "score": 0.867,
      "content": "授業内容...",
      "metadata": {
        "科目名": "比較憲法Ⅱ",
        "担当教員": "教員名",
        "学期曜日時限": "秋学期 月１時限",
        "キャンパス": "早稲田",
        "曜日": "月曜日",
        "ファイル": "法学部_月曜_2025秋＿全授業＿内容ありのコピー.csv",
        "備考・関連URL": "https://..."
      }
    }
  ],
  "total_results": 2
}
```

## 検索可能な情報

法学部データから以下の情報を検索できます：

- **科目名**: 憲法、民法、刑法など
- **担当教員**: 教員名
- **授業内容**: 授業概要、到達目標、授業計画
- **時限**: 月曜日、火曜日など
- **教科書・参考文献**: 使用教材
- **成績評価方法**: 評価基準

## 注意事項

1. **学部規則データ**: 現在はOpenAI APIが必要なため、統合サーバーでは無効化されています
2. **モデル**: 法学部データは`intfloat/multilingual-e5-base`（768次元）を使用
3. **チャンク分割**: 長いテキストは900文字で分割され、120文字のオーバーラップがあります

## wasedaai-webとの統合

このRAGシステムをwasedaai-webに統合するには：

1. `unified_server.py`をwasedaai-webのバックエンドに統合
2. フロントエンドでAPIエンドポイント`/search`を呼び出し
3. 検索結果をチャット欄に表示

法学部の授業情報がwasedaai-webのチャット欄で検索できるようになりました！

