import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useLogsStore = defineStore('logs', () => {
  const content = ref('')

  function error(title:string,msg?:string | number | boolean | undefined) {
    content.value += `[error] ${title}${msg !== undefined ? ':' + msg : ''}\n`
  }

  function info(title:string,msg?:string | number | boolean | undefined) {
    content.value += `[info] ${title}${msg !== undefined ? ':' + msg : ''}\n`
  }

  function success(title:string,msg?:string | number | boolean | undefined) {
    content.value += `[success] ${title}${msg !== undefined ? ':' + msg : ''}\n`
  }

  return { content,error,info,success }
})