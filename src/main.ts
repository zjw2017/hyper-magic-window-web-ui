import './assets/main.css'
import './style.css'
// 通用字体
import 'vfonts/Lato.css'
// 等宽字体
import 'vfonts/FiraCode.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
    // component
    NButton,
    // create naive ui
    NDrawer,
    NDrawerContent,
    NSwitch,
    NTable,
    NDataTable,
    NMessageProvider,
    NTag,
    NInput,
    NInputGroup,
    NSpin,
    NSpace,
    NCard,
    NWatermark,
    NModal,
    NAlert,
    create,
  } from 'naive-ui'

import App from './App.vue'
import router from './router'

const naive = create({
    components: [NButton,NDrawer,NDrawerContent,NTable,NDataTable,NMessageProvider,NSwitch,NTag,NInputGroup,NInput,NSpin,NSpace,NModal,NAlert,NCard,NWatermark]
})

const app = createApp(App)

app.use(naive)

app.use(createPinia())
app.use(router)

app.mount('#app')
