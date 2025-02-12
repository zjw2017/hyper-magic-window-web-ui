<script setup lang="tsx">
  import { ref, reactive, watch, type Component, h, onMounted } from 'vue'
  import type EmbeddedMergeRuleItem from "@/types/EmbeddedMergeRuleItem";
  import $to from 'await-to-js'
  import pako, { type Data } from 'pako';
  import ErrorModal from '@/components/ErrorModal.vue';
  import EmbeddedAppDrawer from '@/components/EmbeddedAppDrawer.vue';
  import { NButton, NIcon, NInput, createDiscreteApi, type DataTableColumns, type DropdownOption } from 'naive-ui'
  import * as ksuApi from '@/apis/ksuApi'
  import { useDeviceStore } from '@/stores/device';
  import * as xmlFormat from '@/utils/xmlFormat';
  import { useEmbeddedStore } from '@/stores/embedded';
  import * as validateFun from '@/utils/validateFun';
  import { useLogsStore } from '@/stores/logs';
  import {
    ShareIcon,
    TrashIcon
  } from '@heroicons/vue/24/outline'
  import { exec } from '@/utils/kernelsu';
  import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils/format';
  import { findBase64InString } from '@/utils/common';
  type EmbeddedAppDrawerInstance = InstanceType<typeof EmbeddedAppDrawer>;
  type SearchKeyWordInputInstance = InstanceType<typeof NInput>;
  const showInputShareRuleModal = ref(false);
  const shareRuleTextarea = ref('');
  const deviceStore = useDeviceStore()
  const embeddedStore = useEmbeddedStore()
  const logsStore = useLogsStore()
  const importShareRuleLoading = ref(false);
  const searchKeyWordInput = ref<SearchKeyWordInputInstance | null>(null);
  const addEmbeddedApp = ref<EmbeddedAppDrawerInstance | null>(null);
  const updateEmbeddedApp = ref<EmbeddedAppDrawerInstance | null>(null);
  const { message, modal } = createDiscreteApi(['message', 'modal'])
  const columns = createColumns()
  const showErrorModal = ref(false)

  function renderIcon(icon: Component) {
    return () => {
      return h(NIcon, null, {
        default: () => h(icon)
      })
    }
  }

  watch(
    () => embeddedStore.isNeedShowErrorModal,   // 监听的值
    (newValue, oldValue) => { // 回调函数，值变化时执行
      if (newValue) {
        showErrorModal.value = true
      }
    },
    { immediate: false }  // 默认是 false，不需要设置，确保不会在初始时执行
  );

  const reloadPage = async () => {
    await embeddedStore.initDefault()
  };

  const importShareRule = async () => {
    shareRuleTextarea.value = '';
    const [,showShareRuleTextareaModalRes] = await $to(new Promise((resolve, reject) => {
      modal.create({
        title: '请粘贴分享规则口令',
        preset: 'dialog',
        style:"min-width:500px; width:50%;",
        content: () => h(NInput, {
          type:"textarea",
          value:shareRuleTextarea.value,
          'onUpdate:value': (newValue) => {
            shareRuleTextarea.value = newValue;
          },
          autosize: {minRows: 8, maxRows: 8},
          placeholder: '在此处粘贴分享规则口令'
        }),
        positiveText: '确定提交',
        negativeText: '取消导入',
        onPositiveClick() {
          resolve('positiveClick')
        }
      })
    }))
    if (showShareRuleTextareaModalRes) {
      importShareRuleLoading.value = true;
      const base64StringFromClipboard:string = shareRuleTextarea.value;
      const getBase64String = findBase64InString(base64StringFromClipboard);
      if (!getBase64String?.length) {
        modal.create({
          title: '导入分享规则失败',
          type: 'error',
          preset: 'dialog',
          content: () => (<p>导入分享规则失败了QwQ，解析 <span class="font-bold text-gray-600">自定义规则</span> 口令发生错误，无法正常解析。</p>),
          negativeText: '确定'
        })
        importShareRuleLoading.value = false;
        return;
      }
      try {
        const uint8Array: Uint8Array = base64ToArrayBuffer(getBase64String);
        const inflate = pako.inflate(uint8Array, {
          to: 'string'
        })
        const importRuleContent = JSON.parse(inflate);
        if (importRuleContent.type !== 'embedded') {
          modal.create({
            title: '导入分享规则失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>导入分享规则失败了QwQ，该 <span class="font-bold text-gray-600">自定义规则</span> 不适用于应用横屏布局。</p>),
            negativeText: '确定'
          })
          importShareRuleLoading.value = false;
          return;
        }
        if ((importRuleContent.device === 'pad' && deviceStore.deviceCharacteristics !== 'tablet') || (importRuleContent.device === 'fold' && deviceStore.deviceCharacteristics === 'tablet')) {
          modal.create({
            title: '导入分享规则失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>导入分享规则失败了QwQ，平板和折叠屏的适配规则不能混用哦~</p>),
            negativeText: '确定'
          })
          importShareRuleLoading.value = false;
          return;
        }
        // Android 15 以下的处理逻辑
        if (importRuleContent.comp === 1 && deviceStore.MIOSVersion && deviceStore.MIOSVersion > 1) {
          modal.create({
            title: '导入分享规则失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>导入分享规则失败了QwQ，该 <span class="font-bold text-gray-600">自定义规则</span> 仅兼容Android 13 - 14 的小米机型。</p>),
            negativeText: '确定'
          })
          importShareRuleLoading.value = false;
          return;
        }
        // Android 15 以上机型处理逻辑
        if (importRuleContent.comp === 2 && (!deviceStore.MIOSVersion || deviceStore.MIOSVersion === 1)) {
          modal.create({
            title: '导入分享规则失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>导入分享规则失败了QwQ，该 <span class="font-bold text-gray-600">自定义规则</span> 仅兼容Hyper OS 2.0的小米机型。</p>),
            negativeText: '确定'
          })
          importShareRuleLoading.value = false;
          return;
        }
        embeddedStore.customConfigEmbeddedRulesList[importRuleContent.name] = importRuleContent.em;
        embeddedStore.customConfigFixedOrientationList[importRuleContent.name] = importRuleContent.fo;
        embeddedStore.embeddedSettingConfig[importRuleContent.name] = {
          name: importRuleContent.name,
          embeddedEnable: ['embedded', 'fullScreen'].includes(importRuleContent.mode) ? true : false
        }
        const [submitUpdateEmbeddedAppErr, submitUpdateEmbeddedAppRes] = await $to(ksuApi.updateEmbeddedApp({
          isPatchMode: embeddedStore.isPatchMode,
          patchEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.patchEmbeddedRulesList, 'package', 'package_config'),
          patchFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.patchFixedOrientationList, 'package', 'package_config'),
          customEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.customConfigEmbeddedRulesList, 'package', undefined),
          customFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.customConfigFixedOrientationList, 'package', undefined),
          settingConfigXML: xmlFormat.objectToXML(embeddedStore.embeddedSettingConfig, 'setting', 'setting_rule'),
          switchAction: {
            name: importRuleContent.name,
            action: ['embedded', 'fullScreen'].includes(importRuleContent.mode) ? 'enable' : 'disable'
          }
        }))
        if (submitUpdateEmbeddedAppErr) {
          modal.create({
            title: '导入分享规则失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>发生异常错误，导入失败了QwQ，该功能尚在测试阶段，尚不稳定，出现异常请及时反馈~</p>)
          })
          importShareRuleLoading.value = false;
        } else {
          modal.create({
            title: '导入分享规则成功',
            type: 'success',
            preset: 'dialog',
            content: () => (
              <p>好耶w， <span class="font-bold text-gray-600">{importRuleContent.name}</span> 的应用配置成功了OwO~如果应用更新后的规则不生效，可以尝试重启平板并且在 <span class="font-bold text-gray-600">平板专区-平行窗口</span> 内 <span class="font-bold text-gray-600">{['embedded', 'fullScreen'].includes(importRuleContent.mode) ? '打开' : '关闭'}</span> 该应用的开关再做尝试~</p>
            ),
            positiveText: '确定'
          })
          importShareRuleLoading.value = false;
          embeddedStore.updateMergeRuleList()
        }
        // 解析成功，可以使用 data
      } catch (error) {
        // 解析失败，处理错误
        modal.create({
          title: '导入分享规则失败',
          type: 'error',
          preset: 'dialog',
          content: () => (<p>解析分享规则失败了QwQ，请检查导入口令是否有误</p>),
          negativeText: '确定'
        })
        importShareRuleLoading.value = false;
      }
    }
  }

  const pagination = reactive({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    onChange: (page: number) => {
      pagination.page = page
    },
    onUpdatePageSize: (pageSize: number) => {
      pagination.pageSize = pageSize
      pagination.page = 1
    }
  })

  const reloadPatchModeConfigLoading = ref<boolean>(false);

  const reloadPatchModeConfigList = async () => {
    reloadPatchModeConfigLoading.value = true;
    const [submitUpdateEmbeddedAppErr, submitUpdateEmbeddedAppRes] = await $to(ksuApi.updateEmbeddedApp({
      isPatchMode: embeddedStore.isPatchMode,
      patchEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.patchEmbeddedRulesList, 'package', 'package_config'),
      patchFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.patchFixedOrientationList, 'package', 'package_config'),
      customEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.customConfigEmbeddedRulesList, 'package', undefined),
      customFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.customConfigFixedOrientationList, 'package', undefined),
      settingConfigXML: xmlFormat.objectToXML(embeddedStore.embeddedSettingConfig, 'setting', 'setting_rule'),
    }))
    if (submitUpdateEmbeddedAppErr) {
      modal.create({
        title: '操作失败',
        type: 'error',
        preset: 'dialog',
        content: () => (<p>发生异常错误，更新失败了QwQ，该功能尚在测试阶段，尚不稳定，出现异常请及时反馈~</p>)
      })
      reloadPatchModeConfigLoading.value = false;
    } else {
      modal.create({
        title: '操作成功',
        type: 'success',
        preset: 'dialog',
        content: () => (
          <div>
            <p>好耶w，已根据您设备当前的整体应用情况重新 <span class="font-bold text-gray-600">修剪模块应用适配列表</span> ，后续每次更新模块或者安装新的应用后，建议重新操作 <span class="font-bold text-gray-600">生成定制应用数据</span> 。</p>
          </div>
        ),
        negativeText: '确定'
      })
      reloadPatchModeConfigLoading.value = false
      embeddedStore.updateMergeRuleList()
      // logsStore.info('获取到已安装的应用数量', embeddedStore.installedAndroidApplicationPackageNameList.length)
      // logsStore.info('获取到模块规则的平行窗口的应用数量', Object.keys(embeddedStore.sourceEmbeddedRulesList).length)
      // logsStore.info('获取到模块规则的信箱模式的应用数量', Object.keys(embeddedStore.sourceFixedOrientationList).length)
      // logsStore.info('获取到系统规则的平行窗口的应用数量', Object.keys(embeddedStore.systemEmbeddedRulesList).length)
      // logsStore.info('获取到系统规则的信箱模式的应用数量', Object.keys(embeddedStore.systemFixedOrientationList).length)
      // logsStore.info('获取到patch规则的平行窗口的应用数量', Object.keys(embeddedStore.patchEmbeddedRulesList).length)
      // logsStore.info('获取到patch规则的信箱模式的应用数量', Object.keys(embeddedStore.patchFixedOrientationList).length)
      // logsStore.info('是否存在DNA Android', new Set(Object.keys(embeddedStore.patchEmbeddedRulesList)).has('com.dna.tools'))
      // const {
      //   errno: EmErrno,
      //   stdout: EmStdout,
      //   stderr: EmStderr,
      // }: any = await exec(
      //   `echo '${xmlFormat.objectToXML(embeddedStore.sourceEmbeddedRulesList, 'package', 'package_config')}' > /data/adb/MIUI_MagicWindow+/echo_embedded_rule_list.xml`
      // );
      // if (EmStdout) {
      //   logsStore.info('输出/data/adb/MIUI_MagicWindow+/echo_embedded_rule_list.xml 成功')
      // }
    }
  }

  const openAddEmbeddedApp = async () => {
    if (deviceStore.deviceCharacteristics !== 'tablet') {
      modal.create({
        title: '不兼容说明',
        type: 'warning',
        preset: 'dialog',
        content: () => (<p>该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！</p>)
      })
      logsStore.info('应用横屏配置-添加应用', '该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！')
      return;
    }
    if (deviceStore.androidTargetSdk && ![32, 33, 34].includes(deviceStore.androidTargetSdk)) {
      modal.create({
        title: '不兼容说明',
        type: 'warning',
        preset: 'dialog',
        content: () => (<p>该功能尚未对 Android 11 或 Android 15+ 做兼容，请等待后续更新情况！</p>)
      })
      return;
    }
    if (addEmbeddedApp.value) {
      const [addEmbeddedAppCancel, addEmbeddedAppRes] = await $to(addEmbeddedApp.value.openDrawer())
      if (addEmbeddedAppCancel) {
        console.log('操作取消:', addEmbeddedAppCancel);
      } else {
        if (addEmbeddedAppRes.settingMode === 'fullScreen') {
          embeddedStore.customConfigEmbeddedRulesList[addEmbeddedAppRes.name] = {
            name: addEmbeddedAppRes.name,
            fullRule: addEmbeddedAppRes.modePayload.fullRule
          }
          embeddedStore.customConfigFixedOrientationList[addEmbeddedAppRes.name] = {
            name: addEmbeddedAppRes.name,
            ...(addEmbeddedAppRes.modePayload.isShowDivider) ? { isShowDivider: true } : {},
            ...(addEmbeddedAppRes.modePayload.skipSelfAdaptive) ? { disable: true } : {},
            ...(addEmbeddedAppRes.modePayload.supportFullSize) ? { supportFullSize: true } : {}
          }
        }
        if (addEmbeddedAppRes.settingMode === 'fixedOrientation') {
          embeddedStore.customConfigFixedOrientationList[addEmbeddedAppRes.name] = {
            name: addEmbeddedAppRes.name,
            ...(addEmbeddedAppRes.modePayload.ratio !== undefined) ? {
              ratio: addEmbeddedAppRes.modePayload.ratio
            } : {}
          }
        }
        if (addEmbeddedAppRes.settingMode === 'disabled') {
          embeddedStore.customConfigFixedOrientationList[addEmbeddedAppRes.name] = {
            name: addEmbeddedAppRes.name,
            disable: true
          }
        }
        embeddedStore.embeddedSettingConfig[addEmbeddedAppRes.name] = {
          name: addEmbeddedAppRes.name,
          embeddedEnable: ['embedded', 'fullScreen'].includes(addEmbeddedAppRes.settingMode) ? true : false
        }
        const [submitAddEmbeddedAppErr, submitAddEmbeddedAppRes] = await $to(ksuApi.updateEmbeddedApp({
          isPatchMode: embeddedStore.isPatchMode,
          patchEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.patchEmbeddedRulesList, 'package', 'package_config'),
          patchFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.patchFixedOrientationList, 'package', 'package_config'),
          customEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.customConfigEmbeddedRulesList, 'package', undefined),
          customFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.customConfigFixedOrientationList, 'package', undefined),
          settingConfigXML: xmlFormat.objectToXML(embeddedStore.embeddedSettingConfig, 'setting', 'setting_rule'),
          switchAction: {
            name: addEmbeddedAppRes.name,
            action: ['embedded', 'fullScreen'].includes(addEmbeddedAppRes.settingMode) ? 'enable' : 'disable'
          }
        }))
        if (submitAddEmbeddedAppErr) {
          modal.create({
            title: '应用添加失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>发生异常错误，更新失败了QwQ，该功能尚在测试阶段，尚不稳定，出现异常请及时反馈~</p>)
          })
          addEmbeddedAppRes.loadingCallback && addEmbeddedAppRes.loadingCallback()
        } else {
          modal.create({
            title: '应用添加成功',
            type: 'success',
            preset: 'dialog',
            content: () => (
              <p>好耶w， <span class="font-bold text-gray-600">{addEmbeddedAppRes.name}</span> 的应用配置添加成功了OwO~如果应用添加后的规则不生效，可以尝试重启平板并且在 <span class="font-bold text-gray-600">平板专区-平行窗口</span> 内 <span class="font-bold text-gray-600">{['embedded', 'fullScreen'].includes(addEmbeddedAppRes.settingMode) ? '打开' : '关闭'}</span> 该应用的开关再做尝试~</p>
            )
          })
          embeddedStore.updateMergeRuleList()
          addEmbeddedAppRes.loadingCallback && addEmbeddedAppRes.loadingCallback()
          addEmbeddedAppRes.closeCallback && addEmbeddedAppRes.closeCallback()
        }
      }
    }
  }

  const openUpdateEmbeddedApp = async (row: EmbeddedMergeRuleItem, index: number) => {
    if (updateEmbeddedApp.value) {
      const [updateEmbeddedAppCancel, updateEmbeddedAppRes] = await $to(updateEmbeddedApp.value.openDrawer(row))
      if (updateEmbeddedAppCancel) {
        console.log('操作取消:', updateEmbeddedAppCancel);
      } else {
        if (updateEmbeddedAppRes.settingMode === 'fullScreen') {
          if (embeddedStore.customConfigEmbeddedRulesList[row.name]) {
            embeddedStore.customConfigEmbeddedRulesList[row.name].fullRule = updateEmbeddedAppRes.modePayload.fullRule
            // const hasDefaultSettings = embeddedStore.sourceEmbeddedRulesList[row.name]?.hasOwnProperty('defaultSettings')
            // if (hasDefaultSettings) {
            //   embeddedStore.sourceEmbeddedRulesList[row.name].defaultSettings = true
            // }
          } else {
            embeddedStore.customConfigEmbeddedRulesList[row.name] = {
              name: row.name,
              fullRule: updateEmbeddedAppRes.modePayload.fullRule
            }
          }
          if (embeddedStore.customConfigFixedOrientationList[row.name]) {
            if (updateEmbeddedAppRes.modePayload.hasOwnProperty('isShowDivider')) {
              embeddedStore.customConfigFixedOrientationList[row.name].isShowDivider = updateEmbeddedAppRes.modePayload.isShowDivider
            }
            if (updateEmbeddedAppRes.modePayload.hasOwnProperty('skipSelfAdaptive')) {
              embeddedStore.customConfigFixedOrientationList[row.name].disable = updateEmbeddedAppRes.modePayload.skipSelfAdaptive
            }
            if (updateEmbeddedAppRes.modePayload.hasOwnProperty('supportFullSize')) {
              embeddedStore.customConfigFixedOrientationList[row.name].supportFullSize = updateEmbeddedAppRes.modePayload.supportFullSize
            }
          } else {
            embeddedStore.customConfigFixedOrientationList[row.name] = {
              name: row.name,
              ...(updateEmbeddedAppRes.modePayload.isShowDivider) ? { isShowDivider: true } : {},
              ...(updateEmbeddedAppRes.modePayload.skipSelfAdaptive) ? { disable: true } : {},
              ...(updateEmbeddedAppRes.modePayload.supportFullSize) ? { supportFullSize: true } : {}
            }
          }
        }
        if (updateEmbeddedAppRes.settingMode === 'fixedOrientation') {
          if (embeddedStore.customConfigFixedOrientationList[row.name]) {
            const hasDisable = embeddedStore.customConfigFixedOrientationList[row.name].hasOwnProperty('disable')
            if (hasDisable) {
              delete embeddedStore.customConfigFixedOrientationList[row.name].disable
            }
            const hasIsScale = embeddedStore.customConfigFixedOrientationList[row.name].hasOwnProperty('isScale')
            if (hasIsScale) {
              delete embeddedStore.customConfigFixedOrientationList[row.name].isScale
            }
            if (updateEmbeddedAppRes.modePayload.ratio !== undefined) {
              embeddedStore.customConfigFixedOrientationList[row.name].ratio = updateEmbeddedAppRes.modePayload.ratio
            } else {
              delete embeddedStore.customConfigFixedOrientationList[row.name].ratio
            }
          } else {
            embeddedStore.customConfigFixedOrientationList[row.name] = {
              name: row.name,
              ...(updateEmbeddedAppRes.modePayload.ratio !== undefined) ? {
                ratio: updateEmbeddedAppRes.modePayload.ratio
              } : {}
            }
          }
        }
        if (updateEmbeddedAppRes.settingMode === 'disabled' && row.settingMode !== updateEmbeddedAppRes.settingMode) {
          if (embeddedStore.customConfigFixedOrientationList[row.name]) {
            embeddedStore.customConfigFixedOrientationList[row.name].disable = true
          } else {
            embeddedStore.customConfigFixedOrientationList[row.name] = {
              name: row.name,
              disable: true
            }
          }
        }
        if (updateEmbeddedAppRes.settingMode === 'embedded') {
          // 如果 `row.settingMode` 不同且规则是自定义且模块规则支持平行窗口，则删除自定义规则
          if (row.settingMode !== updateEmbeddedAppRes.settingMode) {
            if (row.ruleMode === 'custom' && row.isSupportEmbedded) {
              delete embeddedStore.customConfigEmbeddedRulesList[row.name]
            }
          }
          // 如果自定义规则存在，更新 `splitRatio`
          if (embeddedStore.customConfigEmbeddedRulesList[row.name]) {
            if (updateEmbeddedAppRes.modePayload.hasOwnProperty('splitRatio')) {
              embeddedStore.customConfigEmbeddedRulesList[row.name].splitRatio = updateEmbeddedAppRes.modePayload.splitRatio
            }
          } else {
            // 如果不存在自定义规则，但有 `splitRatio` 需要补充
            let isNeedPatchOrigin = false
            if (updateEmbeddedAppRes.modePayload.hasOwnProperty('splitRatio')) {
              isNeedPatchOrigin = true
            }
            if (isNeedPatchOrigin) {
              embeddedStore.customConfigEmbeddedRulesList[row.name] = {
                ...embeddedStore.isPatchMode ? embeddedStore.patchEmbeddedRulesList[row.name] : embeddedStore.sourceEmbeddedRulesList[row.name],
                ...(updateEmbeddedAppRes.modePayload.hasOwnProperty('splitRatio')) && {
                  splitRatio: updateEmbeddedAppRes.modePayload.splitRatio
                }
              }
            }
          }
        }
        embeddedStore.embeddedSettingConfig[row.name] = {
          name: row.name,
          embeddedEnable: ['embedded', 'fullScreen'].includes(updateEmbeddedAppRes.settingMode) ? true : false
        }
        const [submitUpdateEmbeddedAppErr, submitUpdateEmbeddedAppRes] = await $to(ksuApi.updateEmbeddedApp({
          isPatchMode: embeddedStore.isPatchMode,
          patchEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.patchEmbeddedRulesList, 'package', 'package_config'),
          patchFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.patchFixedOrientationList, 'package', 'package_config'),
          customEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.customConfigEmbeddedRulesList, 'package', undefined),
          customFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.customConfigFixedOrientationList, 'package', undefined),
          settingConfigXML: xmlFormat.objectToXML(embeddedStore.embeddedSettingConfig, 'setting', 'setting_rule'),
          switchAction: {
            name: row.name,
            action: ['embedded', 'fullScreen'].includes(updateEmbeddedAppRes.settingMode) ? 'enable' : 'disable'
          }
        }))
        if (submitUpdateEmbeddedAppErr) {
          modal.create({
            title: '应用更新失败',
            type: 'error',
            preset: 'dialog',
            content: () => (<p>发生异常错误，更新失败了QwQ，该功能尚在测试阶段，尚不稳定，出现异常请及时反馈~</p>)
          })
          updateEmbeddedAppRes.loadingCallback && updateEmbeddedAppRes.loadingCallback()
        } else {
          modal.create({
            title: '应用更新成功',
            type: 'success',
            preset: 'dialog',
            content: () => (
              <p>好耶w， <span class="font-bold text-gray-600">{row.name}</span> 的应用配置更新成功了OwO~如果应用更新后的规则不生效，可以尝试重启平板并且在 <span class="font-bold text-gray-600">平板专区-平行窗口</span> 内 <span class="font-bold text-gray-600">{['embedded', 'fullScreen'].includes(updateEmbeddedAppRes.settingMode) ? '打开' : '关闭'}</span> 该应用的开关再做尝试~</p>
            )
          })
          embeddedStore.updateMergeRuleList()
          updateEmbeddedAppRes.loadingCallback && updateEmbeddedAppRes.loadingCallback()
          updateEmbeddedAppRes.closeCallback && updateEmbeddedAppRes.closeCallback()
        }

      }
    }
  }



  const handleCustomRuleDropdown = async (key: string | number, option: DropdownOption, row: EmbeddedMergeRuleItem, index: number) => {
    console.log(key, 'option')
    if (key === 'cleanCustomRule') {
      const cleanCustomModal = modal.create({
        title: '想清除自定义规则吗？',
        type: 'warning',
        preset: 'dialog',
        content: () => (<p>清除自定义规则后，你对 <span class="font-bold text-gray-600">{row.name}</span> 所做的所有自定义配置将丢失，如果该应用同时还存在 <span class="font-bold text-gray-600">模块规则</span> ，将会还原回模块自身的适配规则。确定要继续吗？</p>),
        positiveText: '确定清除',
        negativeText: '我再想想',
        onPositiveClick: async () => {
          cleanCustomModal.loading = true
          if (embeddedStore.customConfigEmbeddedRulesList[row.name]) {
            delete embeddedStore.customConfigEmbeddedRulesList[row.name]
          }
          if (embeddedStore.customConfigFixedOrientationList[row.name]) {
            delete embeddedStore.customConfigFixedOrientationList[row.name]
          }
          const [submitUpdateEmbeddedAppErr, submitUpdateEmbeddedAppRes] = await $to(ksuApi.updateEmbeddedApp({
            isPatchMode: embeddedStore.isPatchMode,
            patchEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.patchEmbeddedRulesList, 'package', 'package_config'),
            patchFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.patchFixedOrientationList, 'package', 'package_config'),
            customEmbeddedRulesListXML: xmlFormat.objectToXML(embeddedStore.customConfigEmbeddedRulesList, 'package', undefined),
            customFixedOrientationListXML: xmlFormat.objectToXML(embeddedStore.customConfigFixedOrientationList, 'package', undefined),
            settingConfigXML: xmlFormat.objectToXML(embeddedStore.embeddedSettingConfig, 'setting', 'setting_rule'),
            switchAction: {
              name: row.name,
              action: (embeddedStore.isPatchMode ? embeddedStore.patchEmbeddedRulesList[row.name] : embeddedStore.sourceEmbeddedRulesList[row.name]) ? 'enable' : 'disable'
            }
          }))
          if (submitUpdateEmbeddedAppErr) {
            modal.create({
              title: '清除自定义规则失败',
              type: 'error',
              preset: 'dialog',
              content: () => (<p>发生异常错误，更新失败了QwQ，该功能尚在测试阶段，尚不稳定，出现异常请及时反馈~</p>)
            })
            cleanCustomModal.loading = false
          } else {
            modal.create({
              title: '清除自定义规则成功',
              type: 'success',
              preset: 'dialog',
              content: () => (<p>好耶w，清除自定义规则成功了OwO~如果应用更新后的规则不生效，可以尝试重启平板再试试~</p>)
            })
            cleanCustomModal.loading = false
            embeddedStore.updateMergeRuleList()
          }
        }
      })
    }
    if (key === 'shareCustomRule') {
      const shareContent = {
        name: row.name,
        cmpt: deviceStore.MIOSVersion && deviceStore.MIOSVersion >= 2 ? 2 : 1,
        em: {
          name: row.name,
          ...row.embeddedRules
        },
        fo: {
          name: row.name,
          ...row.fixedOrientationRule
        },
        type: 'embedded',
        device: deviceStore.deviceCharacteristics === 'tablet' ? 'pad' : 'fold',
        mode: row.settingMode
      }
      const jsonString = JSON.stringify(shareContent)
      const deflate = pako.deflate(jsonString, {
        level: 9,
        memLevel: 9,
        windowBits: 15
      })
      const compressedData = new Uint8Array(deflate)
      const base64String: string = arrayBufferToBase64(compressedData);
      const [writeClipboardErr] = await $to(navigator.clipboard.writeText(`我分享了一个[应用横屏配置]的自定义规则，可以前往[完美横屏应用计划 For Web UI]导入：\n${base64String}`))
      if (writeClipboardErr) {
        modal.create({
          title: '复制分享口令失败',
          type: 'error',
          preset: 'dialog',
          content: () => (<p>复制 <span class="font-bold text-gray-600">{row.name}</span> 的分享口令失败了QwQ，可能由于没有读取/写入剪切板的权限或 <span class="font-bold text-gray-600">自定义规则</span> 长度过大。</p>),
          negativeText: '确定'
        })
        return;
      } else {
        modal.create({
          title: '复制分享口令成功',
          type: 'success',
          preset: 'dialog',
          content: () => (<div>
            <p>好耶w，复制 <span class="font-bold text-gray-600">{row.name}</span> 分享口令成功了~</p>
            <p>如果没有复制成功，请确认是否给予了读取/写入剪切板的权限或 <span class="font-bold text-gray-600">自定义规则</span> 长度过大。</p>
            <p>分享口令导入入口位于 <span class="font-bold text-gray-600">应用横屏配置- 从分享口令导入</span> 。</p>
          </div>),
          positiveText: '确定'
        })
      }
    }
  }

  const handleModuleRuleMode = (row: EmbeddedMergeRuleItem, index: number) => {
    if (deviceStore.deviceCharacteristics !== 'tablet') {
      modal.create({
        title: '不兼容说明',
        type: 'warning',
        preset: 'dialog',
        content: () => (<p>该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！</p>)
      })
      return;
    }
    if (deviceStore.androidTargetSdk && ![32, 33, 34].includes(deviceStore.androidTargetSdk)) {
      modal.create({
        title: '不兼容说明',
        type: 'warning',
        preset: 'dialog',
        content: () => (<p>该功能尚未对 Android 11 或 Android 15+ 做兼容，请等待后续更新情况！</p>)
      })
      return;
    }
    modal.create({
      title: '模块规则说明',
      type: 'warning',
      preset: 'dialog',
      content: () => (<p>模块已对 <span class="font-bold text-gray-600">{row.name}</span> 配置了合适的适配规则，且不可被移除，仅有自定义规则可以被移除哦~</p>)
    })
  }


  function createColumns(): DataTableColumns<EmbeddedMergeRuleItem> {
    return [
      {
        title: '应用名称',
        width: 250,
        key: 'name',
        render(row,index) {
          return (
            <div>
              {
                row.applicationName && (<p>{ row.applicationName }</p>)
              }
              {
                row.name && (<p><span class={{'hidden': !row.applicationName}}>(</span>{row.name}<span class={{'hidden': !row.applicationName}}>)</span></p>)
              }
            </div>
          )
        }
      },
      {
        title: '规则来源',
        width: 100,
        key: 'ruleMode',
        render(row, index) {
          if (row.ruleMode === 'custom') {
            const rule = [
              {
                label: '分享自定义规则',
                key: 'shareCustomRule',
                icon: renderIcon(ShareIcon)
              },
              {
                label: '清除自定义规则',
                key: 'cleanCustomRule',
                icon: renderIcon(TrashIcon)
              }
            ]
            return (
              <n-dropdown onSelect={(key: string | number, option: DropdownOption) => handleCustomRuleDropdown(key, option, row, index)} size="large" trigger="click" options={rule}>
                <n-button size="small" dashed type="info">自定义规则</n-button>
              </n-dropdown>
            )
          }
          return (
            <n-button size="small" dashed type="error" onClick={() => handleModuleRuleMode(row, index)}>模块规则</n-button>
          )
        }
      },
      {
        title: '支持的规则',
        key: 'ruleMode',
        minWidth: 200,
        render(row, index) {
          const rowIsSupportEmbedded = row.isSupportEmbedded
          const rowIsSupportFullScreen = ((deviceStore.MIOSVersion && deviceStore.MIOSVersion >= 2 && row.isSupportFullScreen) || (deviceStore.MIOSVersion && deviceStore.MIOSVersion === 1)) || (!deviceStore.loading && !deviceStore.MIOSVersion)
          const rowIsSupportFixedOrientation = ((deviceStore.MIOSVersion && deviceStore.MIOSVersion >= 2 && row.isSupportFullScreen) || (deviceStore.MIOSVersion && deviceStore.MIOSVersion === 1)) || (!deviceStore.loading && !deviceStore.MIOSVersion)
          return (
            <div>
              {
                rowIsSupportEmbedded && (<n-tag type="success" bordered={false} class="mr-2 my-1">
                  平行窗口
                </n-tag>)
              }
              {
                rowIsSupportFullScreen && (<n-tag type="info" bordered={false} class="mr-2 my-1">
                  全屏
                </n-tag>)
              }
              {
                rowIsSupportFixedOrientation && (<n-tag type="warning" bordered={false} class="mr-2 my-1">
                  居中布局
                </n-tag>)
              }
              <n-tag type="error" bordered={false} class="my-1" >
                原始布局
              </n-tag>
            </div>
          )
        }
      },
      {
        title: '当前规则',
        width: 100,
        key: 'settingMode',
        render(row, index) {
          const modeMap = {
            embedded: {
              type: 'success',
              name: '平行窗口',
              onClick(row: EmbeddedMergeRuleItem, index: number) {
                if (deviceStore.deviceCharacteristics !== 'tablet') {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！</p>)
                  })
                  return;
                }
                if (deviceStore.androidTargetSdk && ![32, 33, 34].includes(deviceStore.androidTargetSdk)) {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能尚未对 Android 11 或 Android 15+ 做兼容，请等待后续更新情况！</p>)
                  })
                  return;
                }
                openUpdateEmbeddedApp(row, index)
              }
            },
            fullScreen: {
              type: 'info',
              name: '全屏',
              onClick(row: EmbeddedMergeRuleItem, index: number) {
                if (deviceStore.deviceCharacteristics !== 'tablet') {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！</p>)
                  })
                  return;
                }
                if (deviceStore.androidTargetSdk && ![32, 33, 34].includes(deviceStore.androidTargetSdk)) {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能尚未对 Android 11 或 Android 15+ 做兼容，请等待后续更新情况！</p>)
                  })
                  return;
                }
                openUpdateEmbeddedApp(row, index)
              }
            },
            fixedOrientation: {
              type: 'warning',
              name: '居中布局',
              onClick(row: EmbeddedMergeRuleItem, index: number) {
                if (deviceStore.deviceCharacteristics !== 'tablet') {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！</p>)
                  })
                  return;
                }
                if (deviceStore.androidTargetSdk && ![32, 33, 34].includes(deviceStore.androidTargetSdk)) {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能尚未对 Android 11 或 Android 15+ 做兼容，请等待后续更新情况！</p>)
                  })
                  return;
                }
                openUpdateEmbeddedApp(row, index)
              }
            },
            disabled: {
              type: 'error',
              name: '原始布局',
              onClick(row: EmbeddedMergeRuleItem, index: number) {
                if (deviceStore.deviceCharacteristics !== 'tablet') {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能仅兼容平板设备，暂时不兼容折叠屏设备，请等待后续更新情况！</p>)
                  })
                  return;
                }
                if (deviceStore.androidTargetSdk && ![32, 33, 34].includes(deviceStore.androidTargetSdk)) {
                  modal.create({
                    title: '不兼容说明',
                    type: 'warning',
                    preset: 'dialog',
                    content: () => (<p>该功能尚未对 Android 11 或 Android 15+ 做兼容，请等待后续更新情况！</p>)
                  })
                  return;
                }
                openUpdateEmbeddedApp(row, index)
              }
            }
          }
          return (
            <n-button size="small" strong dashed type={modeMap[row.settingMode].type} onClick={() => modeMap[row.settingMode].onClick(row, index)}>{modeMap[row.settingMode].name}</n-button>
          )
        }
      }
    ]
  }
</script>

<template>
  <main class="mb-10">
    <div class="mt-5">
      <div class="px-4 sm:px-0 mb-5">
        <h3 class="text-base font-semibold leading-7 text-gray-900">应用横屏配置</h3>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500">在这里可以快速管理平板在横屏应用下的配置</p>
      </div>
    </div>
    <n-card title="操作栏" size="small">
      <n-button class="mb-3 mr-3" type="info" :loading="deviceStore.loading || embeddedStore.loading"
        @click="openAddEmbeddedApp">
        添加应用
      </n-button>
      <n-button class="mb-3 mr-3" v-if="embeddedStore.isPatchMode" type="error"
        :loading="deviceStore.loading || embeddedStore.loading || reloadPatchModeConfigLoading"
        @click="() => reloadPatchModeConfigList()">
        生成定制应用数据
      </n-button>
      <n-button class="mb-3 mr-3" type="warning" :loading="deviceStore.loading || embeddedStore.loading || importShareRuleLoading"
        @click="importShareRule()">
        从分享口令导入
      </n-button>
      <n-button class="mb-3 mr-3" type="success" :loading="deviceStore.loading || embeddedStore.loading"
        @click="() => reloadPage()">
        刷新当前数据
      </n-button>
      <n-input-group>
        <n-input size="large" clearable v-model:value="embeddedStore.searchKeyWord" ref="searchKeyWordInput"
          placeholder="搜索应用包名" autosize style="min-width: 80%" />
        <n-button size="large" type="primary" @click="() => {
          searchKeyWordInput?.blur()
        }">
          确定
        </n-button>
      </n-input-group>
    </n-card>
    <n-data-table :loading="deviceStore.loading || embeddedStore.loading" :columns="columns"
      :data="embeddedStore.filterMergeRuleList" :pagination="pagination" />
  </main>
  <ErrorModal v-model="showErrorModal" :errorLogging="embeddedStore.errorLogging" />
  <EmbeddedAppDrawer ref="addEmbeddedApp" type="add" title="添加应用" />
  <EmbeddedAppDrawer ref="updateEmbeddedApp" type="update" title="更新应用" />
</template>
