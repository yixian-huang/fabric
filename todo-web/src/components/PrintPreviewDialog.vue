<template>
  <el-dialog
    :model-value="visible"
    :title="t('fabric.printPreview')"
    width="80%"
    center
    class="print-preview-dialog"
    @update:modelValue="$emit('update:visible', $event)"
  >
    <div class="print-content p-6" ref="printArea">
      <div v-for="item in fabrics" :key="item.id" class="fabric-print-page mb-8 pb-8 border-b border-dashed border-gray-300 page-break-after-always">
        <div class="bg-white rounded shadow-sm p-6 a4-page mx-auto">
          <div class="flex justify-between items-start mb-4">
            <div class="flex flex-col items-start">
              <!-- Placeholder for logo/company name if needed -->
              <div class="mr-2">
                 <i class="fas fa-tshirt text-3xl"></i> <!-- Assuming Font Awesome is available -->
              </div>
              <div class="text-lg font-medium">Daily Silk</div>
                 <div class="text-left">
                  FABRIC LIBRARY: 
                  <a
                  href="https://www.fabricoption.com"
                  class="text-blue-500"
                  target="_blank"
                >
                  FABRICOPTION.COM</a
                >
                </div>
            </div>
    
            <div class="text-right">
              <div class="text-xl font-bold text-red-600">JIAXING TOP TRADING CO.,LTD</div>
              <div class="text-sm text-gray-600">WWW.DAILYSILKFASHION.COM / TOP@DAILYSILKFASHION.COM</div>
            </div>
          </div>
          <div class="border-t border-b border-gray-300 py-4 my-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="mb-2"><span class="font-bold">FABRIC CODE:</span> {{ item.code }}-{{ item.merchant_code }}</div>
                <div class="mb-2">
                  <span class="font-bold">COMP:</span>
                  <span class="ml-2">{{ formatComposition(item.components).join(' ') }}</span>
                </div>
                <div class="mb-2"><span class="font-bold">WEIGHT//WIDTH:</span> {{ item.weight }} {{ item.weight_unit }} // {{ item.width }}</div>
              </div>
              <div class="text-right">
                <div class="mb-2"><span class="font-bold">REFERENCE NO:</span> {{ item.reference_code }}</div>
                <div class="mb-2 text-white" >
                  <span class="font-bold"> </span>
                  -
                </div>
                <div class="mb-2" v-if="item.remark">
                  <span class="font-bold">REMARK:</span>
                  {{ item.remark }}
                </div>
                <!-- Add more fields if necessary -->
              </div>
            </div>
          </div>
          <div class="mt-8 flex justify-center">
            <div class="w-3/4 h-96 overflow-hidden">
              <img :src="item.watermark_image_url" alt="面料图片" class="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end space-x-4">
        <el-button @click="$emit('update:visible', false)" class="!rounded-button whitespace-nowrap cursor-pointer">
          {{ t('fabric.cancel') }}
        </el-button>
        <el-button type="primary" @click="handlePrint" class="!rounded-button whitespace-nowrap cursor-pointer">
          <el-icon class="mr-1"><Printer /></el-icon>
          {{ t('fabric.print') }}
        </el-button>
        <!-- <el-button type="success" @click="handleDownloadPDF" class="!rounded-button whitespace-nowrap cursor-pointer">
          <el-icon class="mr-1"><Download /></el-icon>
          {{ t('fabric.downloadPDF') }}
        </el-button> -->
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Printer, Download } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import html2pdf from 'html2pdf.js';

const { t } = useI18n();

interface Fabric {
  id: string | number;
  fabricCode?: string;
  composition?: { ingredient: string; percentage: number }[];
  weight?: string | number;
  width?: string | number;
  referenceCode?: string;
  image_url?: string;
  remark?: string;
  watermark_image_url?: string;
  merchant_code?: string;
  code?: string;
  reference_code?: string;
  weight_unit?: string;
  components?: { option_code: string; percentage: number }[];
  // Add other relevant fabric properties here
}

interface Props {
  visible: boolean;
  fabrics: Fabric[];
  print: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits(['update:visible', 'print']);


watch(()=>props.visible, (newValue, oldValue)=>{
  console.log(newValue, oldValue);
  if (newValue && props.print) {
    handlePrint();
  }
})

const printArea = ref<HTMLElement | null>(null);

// Helper function to format composition
const formatComposition = (components: { option_code: string; percentage: number }[] | undefined): string[] => {
  if (!components) {
    return [];
  }
  return components.map(comp => `${comp.percentage}% ${t('fabric.' + comp.option_code)}`);
};



const handlePrint = () => {
  const printContent = printArea.value;
  if (!printContent) return;

  const newWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!newWindow) {
      alert("无法打开打印窗口，请检查浏览器设置");
      return;
  }

  const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
          try {
              if (styleSheet.cssRules) {
                return Array.from(styleSheet.cssRules)
                  .map(rule => rule.cssText)
                  .join('\n');
              }
          } catch (e) {
              console.warn('Could not access stylesheet: ', styleSheet.href, e);
          }
          return '';
      })
      .join('\n');

  newWindow.document.write(
    '<html>' +
    '<head>' +
    '<title>打印预览</title>' +
    '<style>' +
    '@media print {' +
    'body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
    '.page-break-after-always { page-break-after: always; }' +
    '.a4-page { width: 210mm; min-height: 297mm; }' +
    '.fabric-print-page { border-bottom: none !important; }' +
    '}' +
    styles +
    '</style>' +
    '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">' +
    '</head>' +
    '<body>' +
    printContent.innerHTML +
    '<script type="text/javascript">' +
    'setTimeout(function() {' +
    'window.print();' +
    'window.close();' +
    '}, 500);' +
    '<\/script>' +
    '</body>' +
    '</html>'
  );
  newWindow.document.close();
};

// 处理下载PDF功能
const handleDownloadPDF = () => {
  const count = props.fabrics.length;
  const element = printArea.value;
  if (!element) return;

  // 显示加载中提示
  ElMessage.info(t('fabric.generatingPDF'));
  
  // 预加载所有图片
  const preloadImages = async () => {
    const imagePromises = props.fabrics
      .filter(item => item.image_url)
      .map(item => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => {
            console.error(`Failed to load image: ${item.image_url}`);
            resolve(false); // 继续处理，而不是中断整个过程
          };
          img.src = item.image_url;
        });
      });
    
    return Promise.all(imagePromises);
  };

  // 预加载图片，然后生成PDF
  preloadImages().then(() => {
    // 确保内容已经渲染完成
    setTimeout(() => {
      // 配置PDF选项
      const options = {
        margin: 0,
        filename: `fabric-details-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          width: 2480,
          height: 3508 * count,
          useCORS: true,
          logging: true,
          allowTaint: true,
          foreignObjectRendering: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 生成PDF并下载
      html2pdf().from(element).set(options).save().then(() => {
        ElMessage.success(t('fabric.pdfGeneratedSuccess'));
      }).catch((error) => {
        console.error('PDF生成失败:', error);
        ElMessage.error(t('fabric.pdfGenerationFailed'));
      });
    }, 1500); // 给予更多时间让内容渲染完成
  });
};

// 增加导出声明，保证组件可以被正确导入
defineExpose({
  // 如果有需要暴露给父组件的方法或属性，可以在这里添加
});
</script>

<style scoped>
/* Scoped styles specific to the print preview dialog */
.print-preview-dialog :deep(.el-dialog__body) {
  padding: 0; /* Remove default padding if print-content has its own */
  max-height: 70vh;
  overflow-y: auto;
}

.print-content {
  /* Styles for the content area */
}

.fabric-print-page {
  /* Styles for each fabric page */
  /* page-break-after: always; /* Ensure page breaks */
}

.a4-page {
   /* A4 page simulation - adjust as needed */
  width: 210mm;
  min-height: 297mm; /* Use min-height for content flexibility */
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  margin: 1rem auto;
  background: white;
}

@media print {
  /* Hide elements not needed for print within the component */
  .fabric-print-page {
    border-bottom: none !important;
    margin-bottom: 0;
    padding-bottom: 0;
    box-shadow: none;
    margin: 0;
  }
  .a4-page {
    box-shadow: none;
    margin: 0;
    width: 100%;
    min-height: auto;
  }
  .page-break-after-always {
     page-break-after: always;
  }
}
</style>

<script lang="ts">
// 添加默认导出
export default {
  name: 'PrintPreviewDialog'
};
</script> 