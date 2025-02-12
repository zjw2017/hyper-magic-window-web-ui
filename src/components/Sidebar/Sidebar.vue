<script setup lang="tsx">
  import { ref } from 'vue'
  import { RouterLink } from 'vue-router'
  import {
    Dialog,
    DialogPanel,
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    TransitionChild,
    TransitionRoot,
  } from '@headlessui/vue'
  import {
    Bars3Icon,
    BellIcon,
    CakeIcon,
    CalendarIcon,
    ChartPieIcon,
    ChevronDoubleDownIcon,
    Cog6ToothIcon,
    CubeIcon,
    CubeTransparentIcon,
    DeviceTabletIcon,
    DocumentDuplicateIcon,
    FolderIcon,
    HomeIcon,
    PlayIcon,
    Squares2X2Icon,
    UsersIcon,
    ViewColumnsIcon,
    WindowIcon,
    XMarkIcon,
  } from '@heroicons/vue/24/outline'
  import { useRoute } from 'vue-router';
  import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid'
  import { createDiscreteApi } from 'naive-ui';
  import { useGameMode } from '@/hooks/useGameMode';
  import { useDeviceStore } from '@/stores/device';
  import handlePromiseWithLogging from "@/utils/handlePromiseWithLogging";
  import * as ksuApi from "@/apis/ksuApi";
  import { useMIUIContentExtension } from '@/hooks/useMIUIContentExtension';
  const route = useRoute();
  const gameMode = useGameMode();
  const deviceStore = useDeviceStore();
  const MIUIContentExtension = useMIUIContentExtension()
  const { message, modal } = createDiscreteApi(['message', 'modal'])
  const navigation = [
    { name: '应用横屏配置', routeName: 'home', href: '/', icon: WindowIcon },
    { name: '应用布局优化', routeName: 'autoui', href: '/autoui', icon: Squares2X2Icon },
    {
      name: '游戏显示布局',
      isShow() {
        return deviceStore.androidTargetSdk && deviceStore.androidTargetSdk >= 32
      },
      click() {
        if (gameMode.isSupportGameMode.value) {
          modal.create({
            title: '确认打开游戏显示布局吗？',
            type: 'info',
            preset: 'dialog',
            content: () => (<div>
              <p>即将打开 <span class="font-bold text-gray-600">游戏显示布局</span> 管理界面，确定要继续吗？</p>
              <p>您可以将希望调整 <span class="font-bold text-gray-600">游戏显示布局</span> 的应用加到 <span class="font-bold text-gray-600">游戏工具箱</span> 中，即可进行管理~</p>
              {
                deviceStore.deviceCharacteristics === 'tablet' && deviceStore.MIOSVersion && deviceStore.MIOSVersion >= 2 && (<p>从Hyper OS 2.0开始，小米平板需要搭配配套的 <span class="font-bold text-gray-600">修改版平板/手机管家</span> 才能使用游戏显示布局，详情请前往模块首页了解~</p>)
              }
            </div>
            ),
            positiveText: '确定打开',
            negativeText: '我再想想',
            onPositiveClick: async () => {
              ksuApi.openGameModeManager().then((res) => {
                modal.create({
                  title: '已开启',
                  type: 'success',
                  preset: 'dialog',
                  content: () => (<div>
                    <p>好耶OwO~</p>
                    <p>已经成功开启 <span class="font-bold text-gray-600">游戏显示布局</span> 的管理界面了~</p>
                  </div>),
                  positiveText: '确定'
                })
              }, (err) => {
                modal.create({
                  title: '无法打开游戏显示布局',
                  type: 'error',
                  preset: 'dialog',
                  content: () => (<div>
                    <p>您未开启 <span class="font-bold text-gray-600">游戏显示布局</span>，请前往模块设置中开启~</p>
                    <p>如果仍然无法正常打开，请更新手机/平板管家~</p>
                  </div>),
                  negativeText: '确定'
                })
              })
            }
          })
        } else {
          modal.create({
            title: '无法打开游戏显示布局',
            type: 'error',
            preset: 'dialog',
            content: () => (<div>
              <p>您未开启 <span class="font-bold text-gray-600">游戏显示布局</span>，请前往模块设置中开启~</p>
              <p>如果仍然无法正常打开，请更新手机/平板管家~</p>
            </div>),
            negativeText: '确定'
          })
        }
      },
      icon: PlayIcon
    },
    {
      name: '传送门',
      isShow() {
        return deviceStore.deviceCharacteristics === 'tablet'
      },
      async click() {
        if (!MIUIContentExtension.isInstallMIUIContentExtension.value) {
          await navigator.clipboard.writeText(`https://caiyun.139.com/m/i?135CdxVMTx4nf`)
          modal.create({
            title: '无法打开传送门',
            type: 'error',
            preset: 'dialog',
            content: () => (<div>
              <p>未检测到系统存在传送门，请先通过模块修补传送门再进入~</p>
              <p>已经复制模块下载链接到剪切板了，请务必选择固化并修复传送门~</p>
            </div>),
            negativeText: '确定',
          })
          return;
        }
        modal.create({
          title: '确认打开传送门吗？',
          type: 'info',
          preset: 'dialog',
          content: () => (<div>
            <p>即将打开 <span class="font-bold text-gray-600">传送门</span> 管理界面，确定要继续吗？</p>
          </div>),
          positiveText: '确定打开',
          negativeText: '我再想想',
          onPositiveClick: async () => {
            ksuApi.openMIUIContentExtension().then((res) => {
              modal.create({
                title: '已开启',
                type: 'success',
                preset: 'dialog',
                content: () => (<div>
                  <p>好耶OwO~</p>
                  <p>已经成功开启 <span class="font-bold text-gray-600">传送门</span> 的管理界面了~</p>
                </div>),
                positiveText: '确定'
              })
            }, (err) => {
              modal.create({
                title: '无法打开传送门',
                type: 'error',
                preset: 'dialog',
                content: () => (<p>出现异常，无法正常打开传送门QwQ，详细问题可浏览日志记录~</p>),
                negativeText: '确定'
              })
            })
          }
        })
      },
      icon: DeviceTabletIcon
    },
    { name: '日志记录', routeName: 'logs', href: '/logs', icon: DocumentDuplicateIcon },
    { name: '开发路线图', routeName: 'project', href: '/project', icon: ChartPieIcon },
  ]
  const teams = [
    { id: 1, name: '模块首页', href: '/embedded-webview?url=https://hyper-magic-window.sothx.com', initial: 'H', current: false },
    { id: 2, name: '打赏', href: '/embedded-webview?url=https://hyper-magic-window.sothx.com/donation.html', initial: 'D', current: false },
    // { id: 3, name: '感谢', href: '/embedded-webview?url=https://hyper-magic-window.sothx.com/thanks.html', initial: 'W', current: false },
    { id: 3, name: '许可协议', href: '/embedded-webview?url=https://hyper-magic-window.sothx.com/license-agreement.html', initial: 'L', current: false },
    { id: 4, name: '问题合集', href: '/embedded-webview?url=https://hyper-magic-window.sothx.com/FAQ.html', initial: 'F', current: false },
  ]
  const userNavigation = [
    { name: '个人资料', href: '#' },
    { name: '退出', href: '#' },
  ]

  const sidebarOpen = ref(false)
</script>

<!--
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
-->
<template>
  <!--
      This example requires updating your template:
  
      ```
      <html class="h-full bg-white">
      <body class="h-full">
      ```
    -->
  <div>
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog as="div" class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild as="template" enter="transition-opacity ease-linear duration-300" enter-from="opacity-0"
          enter-to="opacity-100" leave="transition-opacity ease-linear duration-300" leave-from="opacity-100"
          leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild as="template" enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full" enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform" leave-from="translate-x-0"
            leave-to="-translate-x-full">
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild as="template" enter="ease-in-out duration-300" enter-from="opacity-0"
                enter-to="opacity-100" leave="ease-in-out duration-300" leave-from="opacity-100" leave-to="opacity-0">
                <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>
              <!-- Sidebar component, swap this element with another sidebar if you like -->
              <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div class="flex h-2 shrink-0 items-center">
                  <!-- <img class="h-8 w-auto" src="@/assets/logo.svg" alt="Your Company" /> -->
                </div>
                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" class="-mx-2 space-y-1">
                        <li v-for="item in navigation" :key="item.name">
                          <component v-if="item.isShow ? item.isShow() : true"
                            :is="item.href && item.routeName ? 'RouterLink' : 'a'"
                            v-bind="item.href && item.routeName ? { to: item.href } : { href: 'javascript:void(0)' }"
                            @click="item.click && item.click()"
                            :class="[item.routeName === route.name ? 'bg-gray-50 text-teal-600' : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50', 'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold']">
                            <component :is="item.icon"
                              :class="[item.routeName === route.name ? 'text-teal-600' : 'text-gray-400 group-hover:text-teal-600', 'h-6 w-6 shrink-0']"
                              aria-hidden="true" />
                            {{ item.name }}
                          </component>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <div class="text-xs font-semibold leading-6 text-gray-400">快捷入口</div>
                      <ul role="list" class="-mx-2 mt-2 space-y-1">
                        <li v-for="team in teams" :key="team.name">
                          <RouterLink :to="team.href"
                            :class="[team.href === route.fullPath ? 'bg-gray-50 text-teal-600' : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50', 'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold']">
                            <span
                              :class="[team.href === route.fullPath ? 'text-teal-600 border-teal-600' : 'text-gray-400 border-gray-200 group-hover:border-teal-600 group-hover:text-teal-600', 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white']">{{
                                team.initial }}</span>
                            <span class="truncate">{{ team.name }}</span>
                          </RouterLink>
                        </li>
                      </ul>
                    </li>
                    <li class="mt-auto">
                      <router-link to="/settings"
                        :class="[route.name === 'settings' ? 'bg-gray-50 text-teal-600' : 'hover:bg-gray-50 hover:text-teal-600', 'group-mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700']">
                        <Cog6ToothIcon class="h-6 w-6 shrink-0 text-gray-400 group-hover:text-teal-600"
                          aria-hidden="true" />
                        模块设置
                      </router-link>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <!-- Sidebar component, swap this element with another sidebar if you like -->
      <div class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div class="flex h-10 shrink-0 items-center">
          <!-- <img class="h-8 w-auto" src="@/assets/logo.svg" alt="Your Company" /> -->
        </div>
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-1">
                <li v-for="item in navigation" :key="item.name">
                  <component :is="item.href && item.routeName ? 'RouterLink' : 'a'"
                    v-if="item.isShow ? item.isShow() : true"
                    v-bind="item.href && item.routeName ? { to: item.href } : { href: 'javascript:void(0)' }"
                    @click="item.click && item.click()"
                    :class="[item.routeName === route.name ? 'bg-gray-50 text-teal-600' : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50', 'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold']">
                    <component :is="item.icon"
                      :class="[item.routeName === route.name ? 'text-teal-600' : 'text-gray-400 group-hover:text-teal-600', 'h-6 w-6 shrink-0']"
                      aria-hidden="true" />
                    {{ item.name }}
                  </component>
                </li>
              </ul>
            </li>
            <li>
              <div class="text-xs font-semibold leading-6 text-gray-400">快捷入口</div>
              <ul role="list" class="-mx-2 mt-2 space-y-1">
                <li v-for="team in teams" :key="team.name">
                  <RouterLink :to="team.href"
                    :class="[team.href === route.fullPath ? 'bg-gray-50 text-teal-600' : 'text-gray-700 hover:text-teal-600 hover:bg-gray-50', 'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold']">
                    <span
                      :class="[team.href === route.fullPath ? 'text-teal-600 border-teal-600' : 'text-gray-400 border-gray-200 group-hover:border-teal-600 group-hover:text-teal-600', 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white']">{{
                        team.initial }}</span>
                    <span class="truncate">{{ team.name }}</span>
                  </RouterLink>
                </li>
              </ul>
            </li>
            <li class="mt-auto">
              <router-link to="/settings"
                :class="[route.name === 'settings' ? 'bg-gray-50 text-teal-600' : 'hover:bg-gray-50 hover:text-teal-600', 'group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700']">
                <Cog6ToothIcon class="h-6 w-6 shrink-0 text-gray-400 group-hover:text-teal-600" aria-hidden="true" />
                模块设置
              </router-link>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div class="lg:pl-72">
      <div class="sticky top-0 z-40 lg:mx-auto lg:max-w-7xl lg:px-8">
        <div
          class="flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-0 lg:shadow-none">
          <button type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden" @click="sidebarOpen = true">
            <span class="sr-only">Open sidebar</span>
            <Bars3Icon class="h-6 w-6" aria-hidden="true" />
          </button>

          <!-- Separator -->
          <!-- <div class="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" /> -->

          <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div class="flex justify-center content-center items-center w-full h-full">
              <h1 class="font-bold text-gray-600 text-lg">完美横屏应用计划 For Web UI</h1>
            </div>
            <!-- <form class="relative flex flex-1" action="#" method="GET">
              <label for="search-field" class="sr-only">Search</label>
              <MagnifyingGlassIcon class="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
                aria-hidden="true" />
              <input id="search-field"
                class="block h-full w-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                placeholder="Search..." type="search" name="search" />
            </form> -->
            <div class="flex items-center gap-x-4 lg:gap-x-6">
              <!-- <button type="button" class="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
                <span class="sr-only">View notifications</span>
                <BellIcon class="h-6 w-6" aria-hidden="true" />
              </button> -->

              <!-- Separator -->
              <!-- <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" /> -->

              <!-- Profile dropdown -->
              <!-- <Menu as="div" class="relative">
                <MenuButton class="-m-1.5 flex items-center p-1.5">
                  <span class="sr-only">Open user menu</span>
                  <img class="h-8 w-8 rounded-full bg-gray-50"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt="" />
                  <n-avatar round :size="32" />
                  <span class="hidden lg:flex lg:items-center">
                    <span class="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">未登录</span>
                    <ChevronDownIcon class="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </MenuButton>
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95">
                  <MenuItems
                    class="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                    <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }">
                    <a :href="item.href"
                      :class="[active ? 'bg-gray-50' : '', 'block px-3 py-1 text-sm leading-6 text-gray-900']">{{
                        item.name }}</a>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu> -->
            </div>
          </div>
        </div>
      </div>
      <!-- <main class="py-10"> -->
      <main>
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <!-- Your content -->
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>