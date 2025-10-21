# ~/Desktop/wasedaai-rag/extract_faculty_rules_from_pdfs.py
import os, re, json
from pathlib import Path
import pdfplumber
from tqdm import tqdm

INPUT_DIR = Path("inputs/faculty_rules_pdfs")
OUTPUT_DIR = Path("outputs/faculty_rules")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

RECORDS_JSON = OUTPUT_DIR / "records.json"

# ▼ チャンク設定（既存シラバスRAGと相性のよいサイズ）
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150

def guess_faculty_from_filename(name: str) -> str:
    n = name.lower()
    # よく使う略称・日本語を簡易マッピング（必要に応じて増やしてください）
    mapping = {
        "law": "法学部", "法": "法学部",
        "pol": "政治経済学部", "政経": "政治経済学部",
        "edu": "教育学部", "教育": "教育学部",
        "sci": "基幹理工/創造理工/先進理工", "理工": "基幹理工/創造理工/先進理工",
        "soc": "社会科学部", "社学": "社会科学部",
        "hum": "人間科学部", "人科": "人間科学部",
        "lt": "文学部", "文": "文学部",
        "com": "商学部", "商": "商学部",
        "int": "国際教養学部", "sia": "国際教養学部", "国教": "国際教養学部",
    }
    for k, v in mapping.items():
        if k in n:
            return v
    return "不明"

def clean_text(t: str) -> str:
    t = t.replace("\u3000", " ").replace("\xa0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{2,}", "\n", t)
    return t.strip()

def chunk_text(text: str, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    text = text.strip()
    chunks = []
    i = 0
    while i < len(text):
        chunk = text[i:i+size]
        chunks.append(chunk)
        i += max(size - overlap, 1)
    return chunks

def extract_pdf_text(pdf_path: Path) -> str:
    texts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            texts.append(t)
    return clean_text("\n".join(texts))

def main():
    records = []
    pdf_files = sorted(list(INPUT_DIR.glob("*.pdf")))
    if not pdf_files:
        print(f"[WARN] PDFが見つかりません: {INPUT_DIR.resolve()}")
        return

    for pdf in tqdm(pdf_files, desc="PDF抽出"):
        faculty = guess_faculty_from_filename(pdf.name)
        full_text = extract_pdf_text(pdf)
        if not full_text:
            print(f"[WARN] テキスト抽出できない可能性: {pdf.name}")
            continue

        # 大見出しっぽい候補（1行目など）をタイトルに
        first_line = full_text.splitlines()[0].strip() if full_text.splitlines() else pdf.stem
        title = first_line[:60] or pdf.stem

        chunks = chunk_text(full_text)
        for idx, chunk in enumerate(chunks):
            rec = {
                "type": "faculty_rule",
                "faculty": faculty,
                "title": title,
                "section": f"p{idx+1}",
                "content": chunk,
                "source_path": str(pdf.name),  # 出典はファイル名で返す
            }
            records.append(rec)

    with open(RECORDS_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"✅ 作成: {RECORDS_JSON} （{len(records)} レコード）")

if __name__ == "__main__":
    main()
