<template>
  <div class="park-layout">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="logo">
        <img src="" alt="Logo" />
        <span>园区管理系统</span>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-info">
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <span>管理员</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>个人信息</el-dropdown-item>
              <el-dropdown-item>修改密码</el-dropdown-item>
              <el-dropdown-item divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 左侧菜单 -->
      <el-aside width="200px" class="aside">
        <el-menu
          :default-active="activeMenu"
          class="el-menu-vertical"
          :router="true"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/system-management">
            <el-icon><Monitor /></el-icon>
            <span>系统管理</span>
          </el-menu-item>

          <el-menu-item index="/park-management">
            <el-icon><Monitor /></el-icon>
            <span>园区管理</span>
          </el-menu-item>

          <el-menu-item index="/enterprise-management">
            <el-icon><Shop /></el-icon>
            <span>企业管理</span>
          </el-menu-item>

          <el-menu-item index="/user-management">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>

          <el-menu-item index="/role-management">
            <el-icon><Key /></el-icon>
            <span>角色管理</span>
          </el-menu-item>

          <el-menu-item index="/park-dynamics">
            <el-icon><Bell /></el-icon>
            <span>园区动态</span>
          </el-menu-item>

          <el-menu-item index="/park-support">
            <el-icon><Service /></el-icon>
            <span>园区配套</span>
          </el-menu-item>

          <el-menu-item index="/appointment-management">
            <el-icon><Calendar /></el-icon>
            <span>预约管理</span>
          </el-menu-item>

          <el-menu-item index="/enterprise-procurement">
            <el-icon><ShoppingCart /></el-icon>
            <span>企业采购</span>
          </el-menu-item>

          <el-menu-item index="/enterprise-recruitment">
            <el-icon><UserFilled /></el-icon>
            <span>企业招聘</span>
          </el-menu-item>

          <el-menu-item index="/random-events">
            <el-icon><Camera /></el-icon>
            <span>随手拍事件</span>
          </el-menu-item>

          <el-menu-item index="/legal-propaganda">
            <el-icon><Document /></el-icon>
            <span>法治宣传</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主要内容区域 -->
      <el-main class="main">
        <router-view></router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Monitor, 
  Shop, 
  User, 
  Key, 
  Bell, 
  Service, 
  Calendar, 
  ShoppingCart, 
  UserFilled, 
  Camera, 
  Document 
} from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.park-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo img {
  height: 32px;
}

.logo span {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.main-container {
  flex: 1;
  overflow: hidden;
}

.aside {
  background-color: #304156;
  height: 100%;
}

.el-menu-vertical {
  border-right: none;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style> 