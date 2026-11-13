import text from '../content/history-exhibition.md?raw'
const clean=s=>s.replaceAll('**','').trim()
export const manuscript=[...text.replaceAll('\r','').matchAll(/^# 第.+?章｜([^\n]+)\n([\s\S]*?)(?=^# |(?![\s\S]))/gm)].map(([,label,body])=>{
 const intro=body.split('## 左侧简介')[1]?.split('## 下方历史专题')[0]||''
 return {label:label.trim(),title:clean(intro.match(/时期主题：([^\n]+)/)?.[1]||''),keyword:clean(intro.match(/时代关键词：([^\n]+)/)?.[1]||''),copy:intro.split(/\n\s*\n/).map(clean).filter(s=>s&&!/^(时期主题|时代关键词|地图观察)/.test(s)),body:body.split('## 下方历史专题')[1]?.replace(/\n---\s*$/,'').trim()||''}
})
if(manuscript.length!==6)throw Error('千年水脉文稿须包含六章')
export const references=text.split('# 参考资料')[1]?.split('# Codex')[0]||text.slice(text.indexOf('**[S1]')) .split('# Codex')[0]
