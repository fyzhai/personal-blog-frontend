<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './supabase'
import { useRouter } from 'vue-router'

const user = ref(null)
const router = useRouter()

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error logging out:', error.message)
  } else {
    user.value = null
    router.push('/auth') // 退出后重定向到登录页
  }
}

onMounted(async () => {
  // 检查当前会话
  const { data: { session } } = await supabase.auth.getSession()
  user.value = session?.user || null

  // 监听认证状态变化
  supabase.auth.onAuthStateChange((_, _session) => {
    user.value = _session?.user || null
  })
})
</script>

<template>
  <div id="app">
    <header>
      <nav>
        <router-link to="/">主页</router-link>
        <template v-if="!user">
          <router-link to="/auth" class="nav-auth-link">登录/注册</router-link>
        </template>
        <template v-else>
          <router-link to="/profile" class="nav-profile-link">我的</router-link>
          <router-link to="/create-post" class="nav-create-post-link">发布文章</router-link>
          <button @click="handleLogout" class="logout-button-nav">退出登录</button>
        </template>
      </nav>
    </header>
    <router-view />
    <footer>
      <p>&copy; 2025 个人博客</p>
    </footer>
  </div>
</template>

<style scoped>
/* App.vue 的局部样式 */
.nav-auth-link,
.nav-profile-link,
.nav-create-post-link {
  margin-left: 1.5rem; /* 与前一个链接保持距离 */
}

.logout-button-nav {
  background-color: #dc3545; /* 红色按钮 */
  color: var(--background-white);
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 600;
  transition: background-color 0.3s ease, transform 0.2s ease;
  letter-spacing: 0.5px;
  margin-left: 1rem; /* 与“发布文章”链接保持一些距离 */
}

.logout-button-nav:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}
</style>
