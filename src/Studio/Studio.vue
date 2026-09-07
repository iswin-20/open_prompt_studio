<template>
<div class="studio" :class="{'focus-mode':focusMode}">
 <aside class="sidebar">
  <a class="brand" href="/" aria-label="OpenPrompt Studio 首页"><span class="brand-symbol">✳</span><span>OpenPrompt<small>STUDIO</small></span></a>
  <div class="workspace-name"><span class="workspace-avatar">✦</span><div>我的灵感空间<small>PERSONAL WORKSPACE</small></div><span class="tiny-dot"></span></div>
  <button class="new-prompt" @click="newDraft"><span>＋</span> 新建提示词 <kbd>N</kbd></button>
  <div class="nav-label">工作空间</div>
  <nav aria-label="主导航">
   <button :class="{active:view==='editor'}" @click="view='editor'"><span>✧</span> 创作工作台 <i v-if="view==='editor'"></i></button>
   <button :class="{active:view==='library'}" @click="view='library'"><span>▦</span> 灵感提示词库 <small>{{templates.length}}</small></button>
   <button :class="{active:view==='saved'}" @click="view='saved'"><span>♡</span> 我的收藏 <small>{{saved.length}}</small></button>
  </nav>
  <div class="nav-label">最近灵感</div>
  <button v-for="item in saved.slice(0,4)" :key="item.id" class="recent-item" @click="loadSaved(item)"><span class="recent-dot"></span>{{item.draft.title}}</button>
  <p v-if="!saved.length" class="sidebar-hint">把喜欢的灵感收藏起来，<br>下次接着创作。</p>
  <div class="sidebar-bottom">
   <div class="sidebar-note"><span>✺</span><b>小小灵感，大大可能。</b><p>给想象一点形状，<br>剩下的交给创作。</p></div>
   <a class="legacy-link" href="?legacy=1">↗ 经典 OPS 编辑器</a>
   <div class="local-indicator"><span></span> 灵感保存在此浏览器</div>
  </div>
 </aside>
 <div class="main-shell">
  <header class="topbar"><div class="breadcrumbs">我的工作空间 <span>/</span> <b>{{view==='editor'?'创作工作台':view==='library'?'灵感提示词库':'我的收藏'}}</b></div><div class="top-actions"><span class="privacy-label">◈ 本地创作，无需密钥</span><button class="icon-button" @click="helpOpen=true" aria-label="使用指南">?</button><span class="user-avatar">R</span></div></header>
  <main>
   <template v-if="view==='editor'">
    <div class="page-heading"><div><div class="eyebrow">LET YOUR IDEAS BLOOM <span>✦</span></div><h1>让灵感，<em>有迹可循。</em><span class="heading-spark">✳</span></h1><p>从一个小小的想法，到一段恰到好处的提示词。</p></div><button class="outline-button" @click="view='library'">▦ 从灵感库开始 <span>↗</span></button></div>
    <section class="idea-box" aria-labelledby="idea-label"><div class="idea-top"><label id="idea-label" for="idea"><span>✦</span> 今天，想创造点什么？</label><span class="badge">IDEA → PROMPT</span></div><textarea id="idea" v-model="idea" placeholder="描述你的灵感，或粘贴已有提示词…  例如：一只戴耳机听音乐的毛绒小猫" rows="2" maxlength="20000"></textarea><div class="idea-bottom"><div class="idea-chips"><span>试试</span><button @click="idea='主体：一只拿着咖啡杯的白色小熊\n风格：柔软毛绒 3D，圆润可爱\n光影：暖色柔光，奶油白与咖啡棕'">☕ 毛绒小熊</button><button @click="idea='主体：一瓶透明香水\n场景：浅灰色摄影棚\n风格：高级商业摄影\n构图：主体居中，周围留白'">✧ 产品大片</button><button @click="idea='主体：一间阳光充足的北欧客厅\n风格：自然真实的室内摄影\n光影：午后日光，木色与奶油白'">☀ 阳光客厅</button></div><button class="primary-button" :disabled="!idea.trim()" @click="organize">✧ 整理为结构化提示词 <span>↗</span></button></div></section>
    <div class="workspace-toolbar"><div class="document-title"><span>▤</span><input aria-label="提示词名称" v-model="draft.title" maxlength="120"><span class="autosave"><span></span>{{storageError?'本地保存失败':'自动保存'}}</span></div><div class="toolbar-buttons"><button class="text-button" :disabled="!previous" @click="undo">↶ 撤销</button><button class="text-button" @click="focusMode=!focusMode">{{focusMode?'⊟ 退出专注':'⊞ 专注模式'}}</button></div></div>
    <div class="editor-grid">
     <section class="structure-panel">
      <div class="panel-heading"><div><span class="section-icon">▤</span><h2>构建你的画面</h2></div><span class="subtle">{{filled}} / 8 个模块</span></div>
      <div class="creation-mode" aria-label="创作模式"><button :class="{selected:draft.mode==='create'}" @click="draft.mode='create'">✦ 全新创作</button><button :class="{selected:draft.mode==='edit'}" @click="draft.mode='edit'">▧ 参考图编辑</button></div>
      <p v-if="draft.mode==='edit'" class="inline-note">请在下方说明参考图用途，并在 Gemini / GPT 中上传对应图片。</p>
      <div class="field-list">
       <div v-for="(field,index) in fields" :key="field.key" class="prompt-field" :class="{muted:!draft.enabled[field.key],expanded:expanded===field.key}">
        <div class="field-top"><button class="field-toggle" @click="expanded=expanded===field.key?'':field.key" :aria-expanded="expanded===field.key" :aria-controls="'field-'+field.key"><span class="field-symbol" :class="'symbol-'+index">{{field.icon}}</span><b>{{field.label}}</b><small>{{field.en}}</small><span class="field-status" v-if="draft.values[field.key].trim()">●</span><span class="chevron">{{expanded===field.key?'−':'＋'}}</span></button><label v-if="field.key!=='subject'" class="switch" :title="draft.enabled[field.key]?'已启用':'已停用'"><input type="checkbox" v-model="draft.enabled[field.key]" :aria-label="'启用'+field.label"><span></span></label></div>
        <div v-show="expanded===field.key" class="field-content" :id="'field-'+field.key"><p>{{field.hint}}</p><textarea :aria-label="field.label" v-model="draft.values[field.key]" :placeholder="field.placeholder" :disabled="!draft.enabled[field.key]" maxlength="20000" rows="3"></textarea>
         <div v-if="field.key==='style'" class="style-chips"><button v-for="style in ['3D 毛绒','胶片摄影','手绘水彩','极简设计']" :key="style" @click="addStyle(style)">{{style}} ＋</button></div>
        </div>
        <p v-if="expanded!==field.key" class="field-summary">{{draft.values[field.key] || '点击添加，让画面更具体'}}</p>
       </div>
      </div>
      <div class="ratio-setting"><label for="ratio">▣ 画幅比例</label><select id="ratio" v-model="draft.ratio"><option v-for="ratio in ratios" :key="ratio">{{ratio}}</option></select><span>{{ratioName}}</span></div>
     </section>
     <section class="preview-panel">
      <div class="panel-heading"><div><span class="section-icon">✧</span><h2>提示词预览</h2></div><span class="live-badge"><i></i> 实时</span></div>
      <div class="model-picker" aria-label="目标模型"><button :class="{selected:draft.model==='gemini'}" @click="draft.model='gemini'"><span class="gemini-icon">✦</span><div>Gemini<small>Nano Banana 系列</small></div><span class="radio-dot"></span></button><button :class="{selected:draft.model==='gpt'}" @click="draft.model='gpt'"><span class="gpt-icon">✳</span><div>GPT<small>GPT Image 系列</small></div><span class="radio-dot"></span></button></div>
      <div class="format-bar"><div role="tablist" aria-label="输出格式"><button v-for="f in formats" :key="f.id" role="tab" :aria-selected="format===f.id" :class="{selected:format===f.id}" @click="format=f.id">{{f.label}}</button></div><span>{{output.length}} 字符</span></div>
      <div class="output-content"><pre v-if="output">{{output}}</pre><div v-else class="empty-preview"><span>✧</span><h3>好作品，从一个想法开始</h3><p>填写主体，提示词就会出现在这里。</p></div></div>
      <div class="quality-check"><div><span :class="{amber:issues.length}">{{issues.length?'◌':'✓'}}</span><b>{{issues.length?'让提示词再完整一点':'画面描述已就绪'}}</b><button class="text-button" @click="showChecks=!showChecks">{{showChecks?'收起':'查看建议'}} {{showChecks?'−':'＋'}}</button></div><ul v-if="showChecks&&issues.length"><li v-for="issue in issues" :key="issue">{{issue}}</li></ul><p v-if="showChecks&&!issues.length">主体、场景、风格和构图均已填写。实际效果仍取决于模型与创作内容。</p><p class="model-hint">{{draft.model==='gemini'?'侧重连贯场景、空间关系与参考图用途。':'侧重明确规格、文字准确性与编辑保留项。'}}</p></div>
      <div class="preview-actions"><button class="save-button" :disabled="!output" @click="save">♡ 收藏灵感</button><button class="primary-button" :disabled="!output" @click="copy">▢ {{copied?'已复制':'复制提示词'}} <span>↗</span></button></div>
      <div class="export-row"><button @click="exportDraft" class="text-button">↓ 导出 JSON</button><button @click="$refs.importInput.click()" class="text-button">↑ 导入</button><span>复制后，去 <a :href="draft.model==='gemini'?'https://gemini.google.com/app':'https://chatgpt.com/'" target="_blank" rel="noopener noreferrer">{{draft.model==='gemini'?'Gemini':'ChatGPT'}} ↗</a></span></div>
     </section>
    </div>
    <section class="inspiration-strip"><div class="strip-heading"><h2>灵感，刚好路过 <span>✺</span></h2><button class="text-button" @click="view='library'">探索全部模板 →</button></div><div class="mini-grid"><button v-for="t in templates.slice(0,4)" :key="t.id" class="mini-template" @click="useTemplate(t)"><span class="template-emoji" :style="{background:t.color}">{{t.emoji}}</span><div><b>{{t.title}}</b><small>{{t.category}} · {{t.model==='gemini'?'Gemini':'GPT'}}</small></div><span class="mini-arrow">↗</span></button></div></section>
   </template>
   <template v-else>
    <div class="page-heading"><div><div class="eyebrow">{{view==='library'?'A LITTLE SPARK, A NEW POSSIBILITY':'YOUR LITTLE COLLECTION'}} <span>✦</span></div><h1>{{view==='library'?'下一次灵感，':'喜欢的灵感，'}}<em>{{view==='library'?'在这里相遇。':'好好收着。'}}</em></h1><p>{{view==='library'?'挑一份灵感，改成你的独特表达。':'收藏仅保存在当前浏览器，可导出 JSON 备份。'}}</p></div><button class="outline-button" @click="view='editor'">← 回到工作台</button></div>
    <div class="library-controls"><div class="searchbox"><span>⌕</span><input aria-label="搜索提示词" v-model="search" placeholder="搜索主题、风格或场景…"></div><select aria-label="筛选模型" v-model="modelFilter"><option value="all">全部模型</option><option value="gemini">Gemini</option><option value="gpt">GPT</option></select></div>
    <div class="category-tabs" v-if="view==='library'"><button v-for="c in categories" :key="c" :class="{selected:category===c}" @click="category=c">{{c}}</button></div>
    <div v-if="view==='library'" class="template-grid"><article v-for="t in filteredTemplates" :key="t.id" class="template-card"><button class="template-art" :style="{background:t.color}" @click="useTemplate(t)" :aria-label="'使用模板：'+t.title"><img v-if="t.image" :src="asset(t.image)" :alt="t.title+'：原作者示例，改编后效果可能不同'" loading="lazy" @error="imageFailed"><span class="art-emoji" v-else>{{t.emoji}}</span><span class="template-model">{{t.model==='gemini'?'✦ Gemini':'✳ GPT'}}</span><span class="use-overlay">使用这份灵感 ↗</span></button><div class="template-info"><small>{{t.category}}</small><h3>{{t.title}}</h3><p>{{t.description}}</p><div class="template-footer"><a v-if="t.source" :href="t.source" target="_blank" rel="noopener noreferrer">{{t.author}} · 来源 ↗</a><span v-else>Studio 原创模板</span><button @click="useTemplate(t)" :aria-label="'编辑'+t.title">↗</button></div><p v-if="t.source" class="attribution">参考库案例改编 · 预览为原作者作品</p></div></article></div>
    <div v-else class="saved-list"><article v-for="item in filteredSaved" :key="item.id"><div class="saved-icon">♡</div><div><h3>{{item.draft.title}}</h3><p>{{item.draft.values.subject}}</p><small>{{item.draft.model==='gemini'?'Gemini':'GPT'}} · {{item.draft.ratio}} · {{dateLabel(item.updated)}}</small></div><button class="outline-button" @click="loadSaved(item)">继续编辑 ↗</button><button class="icon-button" @click="deleteId=item.id;deleteDialog=true" :aria-label="'删除收藏 '+item.draft.title">×</button></article></div>
    <div v-if="view==='library'?!filteredTemplates.length:!filteredSaved.length" class="empty-state"><span>✧</span><h2>{{view==='saved'&&!saved.length?'这里等着你的第一份灵感':'没有找到匹配的灵感'}}</h2><p>{{view==='saved'&&!saved.length?'在工作台点击「收藏灵感」，就能在这里找到它。':'换个关键词，或者试试其他分类。'}}</p><button class="primary-button" @click="view='editor'">去创作 →</button></div>
    <div class="source-note" v-if="view==='library'"><span>↗</span><div><b>好灵感，来自开放的创作社区。</b><p>部分模板参考 YouMind 社区提示词库重新编写。保留原作者署名、来源和 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> 许可信息。</p><a href="https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts" target="_blank" rel="noopener noreferrer">Nano Banana Pro Prompts ↗</a><a href="https://github.com/YouMind-OpenLab/awesome-gpt-image-2" target="_blank" rel="noopener noreferrer">GPT Image 2 Prompts ↗</a></div></div>
   </template>
   <footer class="studio-footer"><span>OpenPrompt Studio <b>✳</b> 给灵感一个舒服的地方</span><a href="https://github.com/Moonvy/OpenPromptStudio" target="_blank" rel="noopener noreferrer">Based on Moonvy / OPS ↗</a></footer>
  </main>
 </div>
 <input ref="importInput" type="file" accept=".json,application/json" class="visually-hidden" tabindex="-1" @change="importDraft">
 <div v-if="toast" class="toast" role="status">✓ {{toast}}</div>
 <dialog ref="helpDialog" class="studio-dialog" @close="helpOpen=false"><div class="dialog-heading"><h2>从灵感到画面，只差三步。</h2><button class="icon-button" @click="helpOpen=false" aria-label="关闭指南">×</button></div><ol><li><b>写下想法</b><p>自然语言会保留为主体。也可用「主体：」「风格：」「光影：」分行输入，自动分配到模块。</p></li><li><b>补全画面</b><p>分别调整场景、构图和约束。切换模型会改变指令组织方式，保留你的创作内容。</p></li><li><b>复制去创作</b><p>在 Gemini 或 ChatGPT 粘贴提示词，再设置比例、上传参考图并生成。</p></li></ol><p class="dialog-note">本工作台使用本地规则整理结构，不调用 AI、不生成图片，也不自动翻译。JSON 是创作规格，不是直接调用模型的 API 请求。参考库模板为改编示例。</p><div class="doc-links"><a href="https://ai.google.dev/gemini-api/docs/image-generation" target="_blank" rel="noopener noreferrer">Gemini 官方指南 ↗</a><a href="https://developers.openai.com/api/docs/guides/image-generation" target="_blank" rel="noopener noreferrer">OpenAI 图像指南 ↗</a></div></dialog>
 <dialog ref="deleteDialog" class="studio-dialog small-dialog" @close="deleteDialog=false"><h2>删除这份收藏？</h2><p>当前正在编辑的草稿仍会保留。</p><div class="dialog-actions"><button class="outline-button" @click="deleteDialog=false">取消</button><button class="primary-button" @click="removeSaved">删除收藏</button></div></dialog>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
import {fields,emptyDraft,structureIdea,compilePrompt,reviewDraft,validateDraft,RATIOS,type Draft,type PromptFormat} from './prompt'
import {templates,fromTemplate,type Template} from './templates'
interface SavedItem{id:string;draft:Draft;updated:string}
export default Vue.extend({
 data(){return{fields,templates,ratios:RATIOS,draft:fromTemplate(templates[0]),view:'editor',idea:'',expanded:'subject',format:'markdown' as PromptFormat,formats:[{id:'markdown',label:'结构化'},{id:'natural',label:'自然语言'},{id:'json',label:'JSON'}],saved:[] as SavedItem[],previous:null as Draft|null,search:'',category:'全部灵感',modelFilter:'all',focusMode:false,showChecks:false,copied:false,toast:'',toastTimer:0,copyTimer:0,storageError:false,hydrated:false,helpOpen:false,deleteDialog:false,deleteId:'',activeSavedId:''}},
 computed:{
  output():string{return compilePrompt(this.draft,this.format)},
  issues():string[]{return reviewDraft(this.draft)},
  filled():number{return fields.filter(f=>this.draft.enabled[f.key]&&this.draft.values[f.key].trim()).length},
  ratioName():string{return({'1:1':'方形 · 头像 / 社交','3:4':'竖版 · 海报 / 产品','4:3':'横版 · 空间 / 摄影','16:9':'宽屏 · 封面 / 横幅','9:16':'全屏 · 手机 / 故事'} as any)[this.draft.ratio]},
  categories():string[]{return ['全部灵感',...Array.from(new Set(templates.map(t=>t.category)))]},
  filteredTemplates():Template[]{return templates.filter(t=>(this.category==='全部灵感'||t.category===this.category)&&(this.modelFilter==='all'||t.model===this.modelFilter)&&[t.title,t.description,t.category,...Object.values(t.values)].join(' ').toLowerCase().includes(this.search.toLowerCase()))},
  filteredSaved():SavedItem[]{return this.saved.filter(s=>(this.modelFilter==='all'||s.draft.model===this.modelFilter)&&[s.draft.title,...Object.values(s.draft.values)].join(' ').toLowerCase().includes(this.search.toLowerCase()))}
 },
 watch:{
  draft:{deep:true,handler(){if(this.hydrated)this.persist()}},
  saved:{deep:true,handler(){if(this.hydrated)this.persist()}},
  view(){this.search='';this.modelFilter='all';this.category='全部灵感'},
  helpOpen(v:boolean){const d=this.$refs.helpDialog as HTMLDialogElement;v?d.showModal():d.close()},
  deleteDialog(v:boolean){const d=this.$refs.deleteDialog as HTMLDialogElement;v?d.showModal():d.close()}
 },
 mounted(){
  try{
   const raw=localStorage.getItem('ops-studio-v2')
   if(raw){const data=JSON.parse(raw);this.draft=validateDraft(data.draft);if(Array.isArray(data.saved))this.saved=data.saved.slice(0,200).flatMap((s:any)=>{try{return[{id:String(s.id),draft:validateDraft(s.draft),updated:typeof s.updated==='string'?s.updated:new Date().toISOString()}]}catch{return[]}});this.activeSavedId=typeof data.activeSavedId==='string'?data.activeSavedId:''}
  }catch{this.notify('无法读取上次草稿，已载入示例；可导入备份继续创作')}
  this.hydrated=true
  window.addEventListener('keydown',this.onKey)
 },
 beforeDestroy(){window.removeEventListener('keydown',this.onKey);window.clearTimeout(this.toastTimer);window.clearTimeout(this.copyTimer)},
 methods:{
  persist(){try{localStorage.setItem('ops-studio-v2',JSON.stringify({draft:this.draft,saved:this.saved,activeSavedId:this.activeSavedId}));this.storageError=false}catch{this.storageError=true}},
  snapshot(){this.previous=JSON.parse(JSON.stringify(this.draft))},
  notify(message:string){this.toast=message;window.clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>this.toast='',3200)},
  newDraft(){this.snapshot();this.draft=emptyDraft();this.idea='';this.activeSavedId='';this.expanded='subject';this.view='editor';this.persist();this.notify('新的画布已准备好，可撤销返回上一份草稿')},
  organize(){if(!this.idea.trim())return;this.snapshot();this.draft=structureIdea(this.idea,this.draft);this.expanded='subject';this.notify('已按本地规则整理；请检查并补全其他模块')},
  undo(){if(this.previous){const d=this.previous;this.previous=JSON.parse(JSON.stringify(this.draft));this.draft=d;this.activeSavedId='';this.persist();this.notify('已恢复上一份草稿')}},
  useTemplate(t:Template){this.snapshot();this.draft=fromTemplate(t);this.activeSavedId='';this.view='editor';this.expanded='subject';this.idea='';this.persist();this.notify('已载入模板，可随心修改；撤销可恢复原草稿')},
  addStyle(style:string){this.draft.values.style=[this.draft.values.style,style].filter(Boolean).join('，')},
  async copy(){try{await navigator.clipboard.writeText(this.output);this.copied=true;this.notify('提示词已复制');window.clearTimeout(this.copyTimer);this.copyTimer=window.setTimeout(()=>this.copied=false,2200)}catch{this.notify('浏览器未允许复制，请选中预览文字手动复制')}},
  save(){if(!this.output)return;const id=this.activeSavedId||('prompt-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));const item={id,draft:JSON.parse(JSON.stringify(this.draft)),updated:new Date().toISOString()};this.saved=[item,...this.saved.filter(s=>s.id!==id)].slice(0,200);this.activeSavedId=id;this.persist();this.notify(this.storageError?'本地存储不可用，请导出 JSON 备份':'已收藏这份灵感')},
  loadSaved(s:SavedItem){this.snapshot();this.draft=JSON.parse(JSON.stringify(s.draft));this.activeSavedId=s.id;this.view='editor';this.persist()},
  removeSaved(){this.saved=this.saved.filter(s=>s.id!==this.deleteId);if(this.activeSavedId===this.deleteId)this.activeSavedId='';this.deleteDialog=false;this.persist();this.notify('已删除收藏')},
  exportDraft(){const url=URL.createObjectURL(new Blob([JSON.stringify(this.draft,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=(this.draft.title||'prompt').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},
  async importDraft(event:Event){const el=event.target as HTMLInputElement;const file=el.files?.[0];if(!file)return;try{if(file.size>1024*1024)throw new Error('文件过大，请使用 1 MB 以内的提示词 JSON');const draft=validateDraft(JSON.parse(await file.text()));this.snapshot();this.draft=draft;this.activeSavedId='';this.view='editor';this.notify('提示词已导入')}catch(e){this.notify(e instanceof Error?e.message:'无法导入，请检查 JSON 文件')}finally{el.value=''}},
  asset(file:string){return import.meta.env.BASE_URL+'templates/'+file},
  imageFailed(event:Event){const image=event.target as HTMLImageElement;image.style.display='none';image.parentElement?.classList.add('image-unavailable')},
  dateLabel(value:string){return new Date(value).toLocaleDateString('zh-CN')},
  onKey(e:KeyboardEvent){const el=e.target as HTMLElement;if(el?.matches('input,textarea,select,[contenteditable="true"]')||this.helpOpen||this.deleteDialog)return;if(e.key.toLowerCase()==='n'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();this.newDraft()}}
 }
})
</script>
<style src="./studio.css"></style>
