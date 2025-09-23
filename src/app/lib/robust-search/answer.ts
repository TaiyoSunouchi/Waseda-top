export type RecordItem = {
course_code?: string;
course_name?: string;
faculty?: string;
semester?: string;
credits?: number | string;
instructor?: string;
category?: string;
language?: string;
day_period?: string;
campus?: string;
description?: string;
goals?: string;
keywords?: string;
grading?: string;
textbooks?: string;
notes?: string;
source_url?: string;
};

export function buildRecordText(r: RecordItem): string {
const parts = [
r.course_name,
r.instructor,
r.faculty,
r.semester,
r.category,
r.language,
r.day_period,
r.campus,
r.description,
r.goals,
r.keywords,
r.grading,
r.textbooks,
r.notes,
]
.filter(Boolean)
.join(" ");
return parts;
}

export function synthesizeAnswer(q: string, r: RecordItem) {
// 返答テンプレ（“不明”と言わない。近い情報を出し、根拠 URL を示す）
const base = r.description || r.goals || r.keywords || "該当科目の説明文は短い/未登録ですが、関連情報をまとめました。";
const meta = [
r.course_name ? `科目: ${r.course_name}` : "",
r.instructor ? `担当教員: ${r.instructor}` : "",
r.semester ? `学期: ${r.semester}` : "",
r.credits ? `単位: ${r.credits}` : "",
r.language ? `使用言語: ${r.language}` : "",
]
.filter(Boolean)
.join(" / ");

const src = r.source_url ? `\n出典: ${r.source_url}` : "";

return `${base}\n\n${meta}${src}`.trim();
}