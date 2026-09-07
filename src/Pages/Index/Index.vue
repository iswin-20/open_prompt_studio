<template><component :is="legacy ? 'Legacy' : 'Workbench'" /></template>
<script lang="ts">
import Vue from 'vue'
import Workbench from '../../Studio/Workbench.vue'
export default Vue.extend({
 components:{Workbench,Legacy:()=>import('./Legacy.vue')},
 data(){return{legacy:new URLSearchParams(window.location.search).get('legacy')==='1'}}
})
</script>
