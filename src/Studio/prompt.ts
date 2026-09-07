export type Model = 'gemini' | 'gpt'
export type PromptFormat = 'markdown' | 'json' | 'natural'
export const fields = [
 { key:'subject', label:'主体与细节', en:'Subject', icon:'◉', hint:'谁是画面主角？描述外观、动作与关键细节。', placeholder:'一只戴着蓝色耳机的奶油色小猫，闭着眼睛听音乐' },
 { key:'scene', label:'场景与氛围', en:'Scene', icon:'▧', hint:'交代环境、背景和希望传递的情绪。', placeholder:'坐在窗边的木桌上，窗外是安静的春日花园' },
 { key:'style', label:'风格与质感', en:'Style', icon:'✧', hint:'选择媒介、材质和整体视觉语言。', placeholder:'柔软的 3D 毛绒质感，圆润造型，细腻绒毛' },
 { key:'composition', label:'构图与镜头', en:'Composition', icon:'▣', hint:'说明主体位置、视角和留白区域。', placeholder:'平视中景，主体居中，四周保留呼吸感' },
 { key:'lighting', label:'光影与色彩', en:'Lighting & color', icon:'☼', hint:'指定光线方向、软硬程度和配色。', placeholder:'左上方柔和日光，奶油白、天空蓝和淡粉色' },
 { key:'text', label:'画面文字', en:'Exact text', icon:'T', hint:'只填写需要出现在画面中的文字；留空表示不添加文字。', placeholder:'例如：慢慢来，也很好' },
 { key:'constraints', label:'约束与排除', en:'Constraints', icon:'☷', hint:'明确必须保留、禁止改变或避免出现的内容。', placeholder:'只出现一只猫；不添加水印、额外角色或多余肢体' },
 { key:'reference', label:'参考图与一致性', en:'Reference', icon:'▧', hint:'指定参考图用途。复制后需在目标模型中另行上传参考图。', placeholder:'图 1 用于锁定产品外形，图 2 只参考色彩；保持品牌标识不变' }
] as const
export type FieldKey = typeof fields[number]['key']
export interface Draft {
 version:2; title:string; model:Model; ratio:string; mode:'create'|'edit';
 values:Record<FieldKey,string>; enabled:Record<FieldKey,boolean>
}
export function emptyDraft():Draft {
 return {version:2,title:'未命名灵感',model:'gemini',ratio:'1:1',mode:'create',
 values:Object.fromEntries(fields.map(f=>[f.key,''])) as Draft['values'],
 enabled:Object.fromEntries(fields.map(f=>[f.key,true])) as Draft['enabled']}
}
export function cleanLegacy(text:string) {
 return text.replace(/(?:^|\s)\/(?:imagine)(?:\s+prompt:)?/gi,' ').replace(/\s--(?:ar|aspect|v|version|s|stylize|q|quality|chaos|seed|stop|weird)\s+[\w:.-]+/gi,'').replace(/\s--(?:style)\s+[\w-]+/gi,'').trim()
}
export function structureIdea(idea:string, current:Draft):Draft {
 const next=JSON.parse(JSON.stringify(current)) as Draft
 const ratio=idea.match(/--(?:ar|aspect)\s+(\d+:\d+)/i)
 if(ratio && RATIOS.includes(ratio[1])) next.ratio=ratio[1]
 const aliases:Record<string,FieldKey>={主体:'subject',主体与细节:'subject',subject:'subject',场景:'scene',场景与氛围:'scene',scene:'scene',background:'scene',风格:'style',风格与质感:'style',style:'style',构图:'composition',构图与镜头:'composition',composition:'composition',光影:'lighting',光影与色彩:'lighting',lighting:'lighting',文字:'text',画面文字:'text',text:'text',约束:'constraints',约束与排除:'constraints',constraints:'constraints',参考:'reference',参考图与一致性:'reference',reference:'reference'}
 let assigned=false, active:FieldKey|null=null, loose:string[]=[]
 for(const line of cleanLegacy(idea).split('\n')){
  const match=line.match(/^\s*(?:#+\s*|【|\[)?([^:：\]】]+?)(?:】|\])?\s*[:：]\s*(.*)$/)
  const key=match?aliases[match[1].trim().toLowerCase()]:undefined
  if(key){active=key;next.values[key]=match![2].trim();next.enabled[key]=true;assigned=true}
  else if(active)next.values[active]+='\n'+line
  else if(line.trim())loose.push(line.trim())
 }
 if(loose.length)next.values.subject=loose.join('\n')
 if(!assigned && !loose.length) return next
 next.enabled.subject=true
 if(next.title==='未命名灵感')next.title=next.values.subject.slice(0,20)||'新灵感'
 return next
}
export const RATIOS=['1:1','3:4','4:3','16:9','9:16']
export function promptObject(d:Draft) {
 const blocks=Object.fromEntries(fields.filter(f=>d.enabled[f.key]&&d.values[f.key].trim()).map(f=>[f.key,d.values[f.key].trim()]))
 const text=d.enabled.text&&d.values.text.trim()
 return {task:d.mode==='edit'?'edit_image':'generate_image',target:d.model,aspect_ratio:d.ratio,...blocks,
 text_policy:text?'仅渲染 exact_text 所列文字，逐字保留大小写、标点与换行，不添加其他文字。':'不要添加文字、签名或水印。',
 ...(text?{exact_text:d.values.text}:{}),
 ...(d.mode==='edit'?{preservation:'只修改指令中明确要求的部分；参考图中未要求更改的主体身份、形状和细节保持一致。'}:{})}
}
export function compilePrompt(d:Draft, format:PromptFormat='markdown'):string{
 if(!d.values.subject.trim())return ''
 const obj=promptObject(d)
 if(format==='json')return JSON.stringify(obj,null,2)
 const task=d.mode==='edit'?'根据所附参考图编辑图像':'生成一张图像'
 const entries=fields.filter(f=>d.enabled[f.key]&&d.values[f.key].trim())
 const exactText=d.enabled.text&&d.values.text.trim()
 const ratio='目标画幅为 '+d.ratio+'；请同时在生成界面设置该比例。'
 if(d.model==='gemini'){
  const intro=task+'。先整体理解画面意图，再生成一幅空间关系连贯、主体与环境自然融合的图像。不要把下面的分块做成拼贴或标签。'
  const end=[exactText?'画面中只出现这段文字，逐字保留标点、大小写和换行：'+JSON.stringify(d.values.text):'画面中不要出现文字、签名或水印。',...(d.mode==='edit'?[obj.preservation as string,'参考图只按“参考图与一致性”中的用途使用，不把参考图内容机械复制到无关区域。']:[]),ratio,'生成前自检：主体数量、空间位置、文字与约束是否全部一致。']
  if(format==='natural')return [intro,...entries.filter(f=>f.key!=='text').map(f=>f.label+'：'+d.values[f.key]),...end].join('\n\n')
  return ['# Gemini 图像任务',intro,'## 画面意图',...entries.filter(f=>f.key!=='text').map(f=>'### '+f.label+'\n'+d.values[f.key]),'## 生成规则\n'+end.map(t=>'- '+t).join('\n')].join('\n\n')
 }
 const intro=task+'。请把下列内容作为一份可执行的视觉制作规格，按优先级完成主体、构图、文字与保留项。'
 const priority=['1. 主体和数量必须准确。','2. 构图、镜头与空间位置必须清楚。',exactText?'3. 只渲染“精确文字”中的字符，不自行补字。':'3. 不添加任何文字。','4. 最后应用风格、光线与材质，不牺牲主体结构。']
 const end=[...(d.mode==='edit'?[obj.preservation as string]:[]),ratio,'禁止添加未要求的角色、物体、品牌、签名或水印。']
 if(format==='natural')return [intro,...priority,...entries.map(f=>f.label+'：'+(f.key==='text'?JSON.stringify(d.values.text):d.values[f.key])),...end].join('\n\n')
 return ['# GPT Image 制作规格',intro,'## 执行优先级\n'+priority.map(t=>'- '+t).join('\n'),...entries.map(f=>'## '+(f.key==='text'?'精确文字':f.label)+' / '+f.en+'\n'+(f.key==='text'?JSON.stringify(d.values.text):d.values[f.key])),'## 交付检查\n'+end.map(t=>'- '+t).join('\n')].join('\n\n')
}
export function validateDraft(input:unknown):Draft {
 if(!input||typeof input!=='object')throw new Error('文件中没有有效的提示词')
 const data=input as any
 if(data.version!==2||!data.values||typeof data.values!=='object')throw new Error('请选择本工作台导出的 v2 JSON 文件')
 const d=emptyDraft()
 d.title=typeof data.title==='string'?data.title.slice(0,120):d.title
 d.model=data.model==='gpt'?'gpt':'gemini'
 d.mode=data.mode==='edit'?'edit':'create'
 d.ratio=RATIOS.includes(data.ratio)?data.ratio:'1:1'
 for(const f of fields) {
  if(typeof data.values[f.key]==='string')d.values[f.key]=data.values[f.key].slice(0,20000)
  d.enabled[f.key]=data.enabled?.[f.key]!==false
 }
 d.enabled.subject=true
 return d
}
export function reviewDraft(d:Draft):string[]{
 const issues:string[]=[]
 if(!d.values.subject.trim())issues.push('先描述你想创作的主体。')
 for(const key of ['scene','style','composition'] as FieldKey[])if(!d.enabled[key]||!d.values[key].trim())issues.push('建议补充'+fields.find(f=>f.key===key)!.label+'。')
 if(d.mode==='edit'&&(!d.enabled.reference||!d.values.reference.trim()))issues.push('编辑模式需要说明参考图用途，并在目标模型中上传图片。')
 if(/--(?:ar|v|s|q|stylize)\b/.test(Object.values(d.values).join(' ')))issues.push('检测到旧模型参数，可在灵感输入中整理后使用。')
 return issues
}
