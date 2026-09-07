<template>
<div class="wb-shell">
  <header class="wb-topbar">
    <a class="wb-logo" href="/"><span>OpenPrompt</span><i>Studio</i><b>✦</b></a>
    <div class="wb-project"><small>当前项目</small><input v-model="draft.title" aria-label="项目名称" maxlength="80"></div>
    <div class="wb-model" aria-label="默认模型"><button :class="{active:draft.model==='gemini'}" @click="draft.model='gemini';previewMode='gemini'"><i>✦</i> Gemini</button><button :class="{active:draft.model==='gpt'}" @click="draft.model='gpt';previewMode='gpt'"><i>◉</i> GPT</button></div>
    <div class="wb-top-actions"><button @click="historyOpen=true">↶ <span>历史</span><em>{{history.length}}</em></button><button @click="saveVersion">♡ <span>保存版本</span></button><button class="wb-export" @click="exportDraft">↓ <span>导出</span></button></div>
  </header>

  <main class="wb-main">
    <section class="wb-workspace">
      <div class="wb-intro"><div class="wb-kicker"><b>01</b><span>写下创意</span></div><h1>把脑海里的画面，<br><em>讲给模型听。</em></h1><p>一句话就够。我们会补全镜头、光线与约束，你仍然拥有最后决定权。</p></div>
      <section class="wb-idea-card">
        <label for="rough-idea">你的原始想法</label>
        <textarea id="rough-idea" v-model="idea" maxlength="20000" rows="4" placeholder="例如：雨夜里，一家还亮着灯的小书店，温暖、安静，像电影画面……" @keydown.ctrl.enter.prevent="buildRecipe" @keydown.meta.enter.prevent="buildRecipe"></textarea>
        <div class="wb-idea-footer"><div class="wb-starters"><span>没想法？</span><button v-for="item in starters" :key="item.label" @click="idea=item.text">{{item.icon}} {{item.label}}</button></div><button class="wb-primary" :disabled="!idea.trim()" @click="buildRecipe"><span>✦</span> 生成视觉配方 <kbd>⌘ ↵</kbd></button></div>
        <p v-if="organizeMessage" class="wb-inline-status">{{organizeMessage}}</p>
      </section>

      <div class="wb-section-head"><div class="wb-kicker"><b>02</b><span>调整视觉配方</span></div><p>从左到右决定画面。点开任一模块，修改模型真正需要理解的内容。</p><div class="wb-mode-switch"><button :class="{active:draft.mode==='create'}" @click="draft.mode='create'">全新创作</button><button :class="{active:draft.mode==='edit'}" @click="draft.mode='edit'">参考图编辑</button></div></div>
      <div class="wb-recipe" aria-label="视觉配方模块">
        <button v-for="(field,index) in primaryFields" :key="field.key" :class="['wb-recipe-card',{active:activeField===field.key,empty:!draft.values[field.key].trim()}]" @click="activeField=field.key">
          <span class="wb-card-index">0{{index+1}}</span><span class="wb-card-icon">{{field.icon}}</span><b>{{field.label}}</b><small>{{recipeSummary(field.key)}}</small><i>{{activeField===field.key?'编辑中':draft.values[field.key].trim()?'已填写':'待补充'}}</i>
        </button>
      </div>
      <section class="wb-field-editor">
        <div class="wb-editor-head"><div><span>{{currentField.icon}}</span><div><b>{{currentField.label}}</b><small>{{currentField.en}}</small></div></div><label v-if="activeField!=='subject'" class="wb-switch"><input type="checkbox" v-model="draft.enabled[activeField]"><span></span>{{draft.enabled[activeField]?'参与生成':'暂不使用'}}</label></div>
        <p>{{currentField.hint}}</p><textarea v-model="draft.values[activeField]" :disabled="!draft.enabled[activeField]" :placeholder="currentField.placeholder" rows="4" maxlength="20000"></textarea>
        <div class="wb-field-actions"><button v-for="chip in fieldChips" :key="chip" @click="appendChip(chip)">{{chip}} <span>＋</span></button></div>
      </section>
      <div class="wb-details"><button v-for="field in detailFields" :key="field.key" :class="{active:activeField===field.key,filled:draft.values[field.key].trim()}" @click="activeField=field.key"><span>{{field.icon}}</span><b>{{field.label}}</b><small>{{draft.values[field.key].trim()?'已填写':'可选'}}</small></button><label class="wb-ratio"><span>▣</span><b>画幅</b><select v-model="draft.ratio" aria-label="画幅比例"><option v-for="ratio in ratios" :key="ratio">{{ratio}}</option></select></label></div>
    </section>

    <aside class="wb-preview">
      <div class="wb-preview-top"><div class="wb-kicker"><b>03</b><span>拿走提示词</span></div><div class="wb-preview-tabs"><button :class="{active:previewMode==='gemini'}" @click="previewMode='gemini'">Gemini</button><button :class="{active:previewMode==='gpt'}" @click="previewMode='gpt'">GPT</button><button :class="{active:previewMode==='compare'}" @click="previewMode='compare'">对比</button></div></div>
      <div class="wb-paper" :class="{compare:previewMode==='compare'}"><span class="wb-clip"></span>
        <div class="wb-paper-heading"><div><small>{{previewMode==='compare'?'MODEL COMPARISON':'FINAL PROMPT'}}</small><h2>{{previewMode==='compare'?'两种模型，两种表达。':previewMode==='gemini'?'给 Gemini 的提示词':'给 GPT 的提示词'}}</h2></div><div v-if="previewMode!=='compare'" class="wb-format"><button v-for="item in formats" :key="item.id" :class="{active:format===item.id}" @click="format=item.id">{{item.label}}</button></div></div>
        <div v-if="previewMode!=='compare'" class="wb-prompt-output"><pre v-if="activeOutput">{{activeOutput}}</pre><div v-else class="wb-empty-output"><span>✦</span><h3>画面还没开始说话</h3><p>先写下主体，提示词会在这里成形。</p></div></div>
        <div v-else class="wb-compare-grid"><section><b><i>✦</i> Gemini</b><pre>{{geminiOutput||'先填写主体。'}}</pre></section><section><b><i>◉</i> GPT</b><pre>{{gptOutput||'先填写主体。'}}</pre></section></div>
        <div class="wb-score"><div><b>提示词完成度</b><span>{{score}} / 100</span></div><div class="wb-score-track"><i :style="{width:score+'%'}"></i></div><ul v-if="issues.length"><li v-for="issue in issues.slice(0,3)" :key="issue">{{issue}}</li></ul><p v-else>主体、环境、视觉语言和构图已经形成闭环。</p></div>
        <div v-if="previewMode!=='compare'" class="wb-paper-actions"><button class="wb-secondary" :disabled="!activeOutput" @click="saveVersion">♡ 保存版本</button><button class="wb-primary" :disabled="!activeOutput" @click="copyPrompt">▢ {{copied?'已经复制':'复制提示词'}} <span>↗</span></button></div>
        <div v-else class="wb-paper-actions wb-compare-actions"><button class="wb-secondary" :disabled="!geminiOutput" @click="copyModel('gemini')">▢ 复制 Gemini</button><button class="wb-primary" :disabled="!gptOutput" @click="copyModel('gpt')">▢ 复制 GPT <span>↗</span></button></div>
      </div>
      <div class="wb-model-note"><span>{{previewMode==='gpt'?'◉':previewMode==='gemini'?'✦':'⇄'}}</span><p v-if="previewMode==='gemini'"><b>Gemini 版</b>强调场景关系、自然语言与参考图用途。</p><p v-else-if="previewMode==='gpt'"><b>GPT 版</b>强调可执行规格、精确文字和编辑保留项。</p><p v-else><b>对比模式</b>帮助选择表达方式，创作内容保持一致。</p></div>
    </aside>
  </main>

  <section class="wb-library"><div class="wb-library-title"><div><small>PROMPT RECIPES</small><h2>从一份好配方开始</h2></div><p>模板只是起点。点击后会完整替换当前草稿，并可从历史恢复。</p></div><div class="wb-template-row"><button class="wb-new-template" @click="newDraft"><span>＋</span><b>从空白开始</b><small>自己的想法最好玩</small></button><button v-for="template in templates.slice(0,6)" :key="template.id" class="wb-template" @click="useTemplate(template)"><span class="wb-template-art" :style="{background:template.color}"><i>{{template.emoji}}</i><em>{{template.model==='gemini'?'✦ G':'◉ GPT'}}</em></span><b>{{template.title}}</b><small>{{template.category}} · {{template.ratio}}</small></button></div><div class="wb-source"><span>开放灵感</span><p>部分配方改编自 YouMind 社区提示词库，并在原模板中保留作者与来源。</p><a href="https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts" target="_blank" rel="noopener noreferrer">Gemini 库 ↗</a><a href="https://github.com/YouMind-OpenLab/awesome-gpt-image-2" target="_blank" rel="noopener noreferrer">GPT 库 ↗</a></div></section>
  <footer class="wb-footer"><span>OpenPrompt Studio · 给想象一份可执行的说明</span><div><a href="?legacy=1">经典编辑器</a><a href="https://github.com/Moonvy/OpenPromptStudio" target="_blank" rel="noopener noreferrer">Moonvy / OPS ↗</a></div></footer>

  <div v-if="toast" class="wb-toast" role="status">{{toast}}</div>
  <div v-if="historyOpen" class="wb-modal" role="dialog" aria-modal="true" aria-labelledby="history-title" @click.self="historyOpen=false"><section><header><div><small>VERSION HISTORY</small><h2 id="history-title">回到某个灵感时刻</h2></div><button aria-label="关闭历史" @click="historyOpen=false">×</button></header><p>最近 20 次生成与手动保存会留在当前浏览器。</p><div v-if="history.length" class="wb-history-list"><button v-for="item in history" :key="item.id" @click="restoreVersion(item)"><span>{{dateTime(item.time)}}</span><b>{{item.draft.title}}</b><small>{{item.reason}} · {{item.draft.model==='gemini'?'Gemini':'GPT'}} · {{item.draft.ratio}}</small><em>恢复 ↗</em></button></div><div v-else class="wb-empty-history">还没有历史版本。生成视觉配方后，这里会自动记录。</div></section></div>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
import {fields,emptyDraft,structureIdea,compilePrompt,reviewDraft,validateDraft,RATIOS,type Draft,type FieldKey,type PromptFormat} from './prompt'
import {templates,fromTemplate,type Template} from './templates'
interface VersionItem{id:string;time:string;reason:string;draft:Draft}
export default Vue.extend({
 data(){return{fields,templates,ratios:RATIOS,draft:emptyDraft() as Draft,idea:'',activeField:'subject' as FieldKey,previewMode:'gemini' as 'gemini'|'gpt'|'compare',format:'markdown' as PromptFormat,formats:[{id:'markdown',label:'结构'},{id:'natural',label:'自然语言'},{id:'json',label:'JSON'}],starters:[{icon:'☂',label:'雨夜书店',text:'雨夜里，一家还亮着暖灯的小书店，安静、温暖，像电影画面'},{icon:'🐾',label:'治愈小猫',text:'一只戴着大耳机听歌的奶油色小猫，毛绒质感，可爱但不幼稚'},{icon:'✦',label:'产品大片',text:'一瓶透明香水放在浅色石材上，干净高级的商业摄影'}],history:[] as VersionItem[],historyOpen:false,copied:false,toast:'',toastTimer:0,organizeMessage:'',hydrated:false}},
 computed:{
  primaryFields():any[]{return fields.slice(0,5)},detailFields():any[]{return fields.slice(5)},currentField():any{return fields.find(f=>f.key===this.activeField)||fields[0]},
  fieldChips():string[]{const c:Record<FieldKey,string[]>={subject:['动作清晰','材质真实','保持一致'],scene:['室内','自然环境','摄影棚'],style:['电影感','3D 毛绒','手绘水彩'],composition:['平视中景','特写','留出文案空间'],lighting:['柔和日光','轮廓光','低对比暖光'],text:['逐字准确','清晰易读','不加其他文字'],constraints:['不要水印','不添加额外角色','避免结构畸变'],reference:['锁定主体身份','只参考配色','保持构图']};return c[this.activeField]},
  issues():string[]{return reviewDraft(this.draft)},
  score():number{const w:Record<FieldKey,number>={subject:28,scene:16,style:16,composition:16,lighting:10,text:4,constraints:7,reference:3};let n=0;fields.forEach(f=>{if(this.draft.enabled[f.key]&&this.draft.values[f.key].trim())n+=w[f.key]});if(this.draft.mode==='create')n+=3;if(this.draft.mode==='edit'&&!this.draft.values.reference.trim())n=Math.min(n,74);return Math.min(n,100)},
  geminiOutput():string{return compilePrompt({...this.draft,model:'gemini'},this.format)},gptOutput():string{return compilePrompt({...this.draft,model:'gpt'},this.format)},activeOutput():string{return this.previewMode==='gpt'?this.gptOutput:this.geminiOutput}
 },
 watch:{draft:{deep:true,handler(){if(this.hydrated)this.persist()}},previewMode(v:string){if(v!=='compare')this.draft.model=v as 'gemini'|'gpt'}},
 mounted(){try{const raw=localStorage.getItem('ops-workbench-v3');if(raw){const s=JSON.parse(raw);this.draft=validateDraft(s.draft);this.history=Array.isArray(s.history)?s.history.slice(0,20).flatMap((i:any)=>{try{return[{id:String(i.id),time:String(i.time),reason:String(i.reason),draft:validateDraft(i.draft)}]}catch{return[]}}):[];this.previewMode=this.draft.model}}catch{this.notice('上次草稿无法读取，已经准备了空白画布。')}this.hydrated=true},
 beforeDestroy(){window.clearTimeout(this.toastTimer)},
 methods:{
  persist(){try{localStorage.setItem('ops-workbench-v3',JSON.stringify({draft:this.draft,history:this.history}))}catch{this.notice('浏览器存储空间不足，请导出 JSON 备份。')}},notice(m:string){this.toast=m;window.clearTimeout(this.toastTimer);this.toastTimer=window.setTimeout(()=>this.toast='',3000)},
  addVersion(reason:string,source?:Draft){const draft=JSON.parse(JSON.stringify(source||this.draft));this.history=[{id:Date.now()+'-'+Math.random().toString(36).slice(2,6),time:new Date().toISOString(),reason,draft},...this.history].slice(0,20);this.persist()},
  buildRecipe(){if(!this.idea.trim())return;this.addVersion('生成前自动保存');let next=structureIdea(this.idea,this.draft);const text=this.idea.toLowerCase();const profiles=[{match:/猫|狗|熊|兔|宠物|动物|chibi|cute/,values:{scene:'简洁而有生活气息的环境，背景层次柔和，不抢主体',style:'精致的立体插画，圆润造型与可触摸的柔软质感，可爱但不过度幼态',composition:'平视中景，主体清晰完整，四周保留舒适留白',lighting:'柔和自然光，低对比阴影，温暖而清透',constraints:'主体数量准确，五官与肢体完整；不要水印、品牌标识或无关文字'}},{match:/产品|香水|瓶|耳机|家具|商品|包装/,values:{scene:'克制的摄影棚环境，背景与台面材质服务于产品',style:'高端商业静物摄影，忠实呈现材质、边缘与表面细节',composition:'产品作为唯一视觉焦点，比例准确，并留出自然呼吸空间',lighting:'大面积柔光配合轻微轮廓光，接触阴影真实',constraints:'不改变产品结构，不虚构品牌、文字、认证或性能参数；不要水印'}},{match:/房间|客厅|卧室|室内|建筑|空间/,values:{scene:'真实可居住的空间，陈设克制，动线和尺度合理',style:'自然的室内建筑摄影，保留织物、木材与墙面真实纹理',composition:'使用自然透视和人眼高度视角，空间前中后景清楚',lighting:'来自窗户的自然光，阴影方向统一，亮部不过曝',constraints:'家具尺度与结构符合现实，不出现重复物件、扭曲墙体或水印'}},{match:/海报|封面|信息图|卡片|文字|标题/,values:{scene:'干净的平面设计背景，以内容层级为中心',style:'编辑设计与精细排版，图像和文字形成明确视觉层级',composition:'主标题、视觉主体和辅助信息分区清楚，边距统一',lighting:'颜色对比明确，保证文字可读性',constraints:'所有文字逐字准确，禁止乱码、重复字、额外文字和水印'}}];const p:any=profiles.find(x=>x.match.test(text))||{values:{scene:'与主体一致的真实环境，前后景关系清楚',style:'具有叙事感的编辑视觉，细节自然，避免过度修饰',composition:'明确视觉焦点，主体与环境比例协调，保留适量留白',lighting:'方向统一的柔和光线，色彩克制且层次清楚',constraints:'不添加无关主体、文字、标识或水印；避免结构畸变'}};Object.entries(p.values).forEach(([k,v])=>{const key=k as FieldKey;if(!next.values[key].trim())next.values[key]=v as string});next.enabled.subject=true;this.draft=next;this.activeField='subject';this.previewMode=next.model;this.organizeMessage='已补全一版视觉配方。所有建议都可以改，原始想法不会提交到外部服务。';this.addVersion('生成视觉配方',next);this.notice('视觉配方已生成；继续微调，或直接复制。')},
  recipeSummary(k:FieldKey){const v=this.draft.values[k].trim();return v?v.replace(/\n/g,' ').slice(0,45):(fields.find(f=>f.key===k) as any).hint},appendChip(chip:string){const v=this.draft.values[this.activeField].trim();if(!v.includes(chip))this.draft.values[this.activeField]=[v,chip].filter(Boolean).join('，')},
  useTemplate(t:Template){this.addVersion('切换模板前');this.draft=fromTemplate(t);this.idea='';this.activeField='subject';this.previewMode=t.model;this.organizeMessage='';window.scrollTo({top:0,behavior:'smooth'});this.notice('模板已经装入画布，所有内容都可以改。')},newDraft(){this.addVersion('新建前自动保存');this.draft=emptyDraft();this.idea='';this.activeField='subject';this.previewMode='gemini';this.organizeMessage='';window.scrollTo({top:0,behavior:'smooth'})},
  saveVersion(){if(!this.draft.values.subject.trim())return this.notice('先写一点主体内容，再保存版本。');this.addVersion('手动保存');this.notice('已保存到本机版本历史。')},restoreVersion(i:VersionItem){this.addVersion('恢复前自动保存');this.draft=JSON.parse(JSON.stringify(i.draft));this.previewMode=i.draft.model;this.historyOpen=false;this.notice('已恢复版本，刚才的草稿也已自动保存。')},
  async copyPrompt(){if(!this.activeOutput)return;try{await navigator.clipboard.writeText(this.activeOutput);this.copied=true;this.notice('提示词已复制，可以去生成图片了。');window.setTimeout(()=>this.copied=false,1800)}catch{this.notice('浏览器没有允许复制，请手动选取预览文字。')}},
  async copyModel(model:'gemini'|'gpt'){const text=model==='gemini'?this.geminiOutput:this.gptOutput;if(!text)return;try{await navigator.clipboard.writeText(text);this.notice((model==='gemini'?'Gemini':'GPT')+' 版提示词已复制。')}catch{this.notice('浏览器没有允许复制，请手动选取预览文字。')}},
  exportDraft(){const u=URL.createObjectURL(new Blob([JSON.stringify(this.draft,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=(this.draft.title||'prompt').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(u),1000)},dateTime(v:string){return new Date(v).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
 }
})
</script>
<style src="./workbench.css"></style>
