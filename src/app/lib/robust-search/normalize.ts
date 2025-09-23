export function normalize(text: string): string {
return text
.toLowerCase()
.replace(/[\u3000]/g, " ") // 全角スペース
.replace(/[\p{P}\p{S}]/gu, " ")
.replace(/[\s]+/g, " ")
.trim();
}