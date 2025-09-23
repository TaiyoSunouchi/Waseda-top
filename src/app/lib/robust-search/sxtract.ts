// 超軽量エンティティ抽出（講義名・教員名っぽい語を拾う）
export function guessEntities(q: string) {
const courseLike = q.match(/[\p{Unified_Ideograph}ぁ-んァ-ヶA-Za-z0-9]+(法|演習|講義|入門|基礎|概論)/u);
const teacherLike = q.match(/([\p{Unified_Ideograph}]{1,4})先生|([\p{Unified_Ideograph}]{1,4})教授/u);
return {
courseHint: courseLike?.[0] || "",
teacherHint: (teacherLike?.[1] || teacherLike?.[2] || "").replace(/[先生教授]/g, ""),
};
}