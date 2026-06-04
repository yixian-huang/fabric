import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePrintStore = defineStore('print', () => {
  const showPrintPreview = ref(false)
  const fabricsForPrint = ref<any[]>([])
  const autoPrint = ref(false)

  const openPrintPreview = (fabrics: any[], shouldAutoPrint = false) => {
    fabricsForPrint.value = fabrics
    autoPrint.value = shouldAutoPrint
    showPrintPreview.value = true
  }

  const closePrintPreview = () => {
    showPrintPreview.value = false
    fabricsForPrint.value = []
    autoPrint.value = false
  }

  return {
    showPrintPreview,
    fabricsForPrint,
    autoPrint,
    openPrintPreview,
    closePrintPreview
  }
})

