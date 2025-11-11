<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from './supabase'
import { useRouter } from 'vue-router'

const user = ref(null)
const authSubscription = ref(null)
const router = useRouter()

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error logging out:', error.message)
      alert('退出登录失败，请重试')
    } else {
      user.value = null
      // 使用replace避免用户能返回到需要认证的页面
      router.replace('/auth')
    }
  } catch (err) {
    console.error('Unexpected logout error:', err)
    alert('发生未知错误，请重试')
  }
}

// 刷新会话函数，确保用户状态始终最新
const refreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error refreshing session:', error)
      user.value = null
      return null
    }
    user.value = session?.user || null
    return session
  } catch (err) {
    console.error('Unexpected error refreshing session:', err)
    user.value = null
    return null
  }
}

onMounted(async () => {
  console.log('App mounted, checking auth state...')
  
  // 立即刷新会话以确保最新状态
  await refreshSession()
  
  // 使用持久化的订阅，并存储引用以便在组件卸载时清除
  authSubscription.value = supabase.auth.onAuthStateChange((event, _session) => {
    console.log('Auth state changed:', event, _session)
    
    // 更新用户状态
    user.value = _session?.user || null
    
    // 处理不同的认证事件
    switch (event) {
      case 'SIGNED_IN':
        console.log('User signed in:', _session?.user?.id)
        // 可以在这里添加额外的登录成功处理
        break
      case 'SIGNED_OUT':
        console.log('User signed out')
        // 确保用户被正确登出
        break
      case 'TOKEN_REFRESHED':
        console.log('Token refreshed')
        // 令牌刷新时确保用户状态更新
        break
      case 'USER_UPDATED':
        console.log('User updated')
        break
      case 'PASSWORD_RECOVERY':
        console.log('Password recovery')
        break
      default:
        console.log('Unknown auth event:', event)
    }
  })
  
  console.log('Auth subscription set up')
})

// 确保在组件卸载时清除订阅，避免内存泄漏
onUnmounted(() => {
  if (authSubscription.value) {
    console.log('Cleaning up auth subscription')
    authSubscription.value.unsubscribe()
  }
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
