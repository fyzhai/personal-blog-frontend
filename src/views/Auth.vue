<template>
  <main class="auth-page">
    <div class="auth-card card">
      <h2 class="auth-title">{{ isLogin ? '登录' : '注册' }}</h2>
      <form @submit.prevent="handleAuth" class="auth-form">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input type="email" id="email" v-model="email" required />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit" class="auth-button">{{ isLogin ? '登录' : '注册' }}</button>
        <p v-if="authErrorMessage" class="error-message">{{ authErrorMessage }}</p>
        <p v-if="authSuccessMessage" class="success-message">{{ authSuccessMessage }}</p>
        <p class="toggle-auth">
          {{ isLogin ? '还没有账号？' : '已有账号？' }}
          <a href="#" @click.prevent="toggleAuthMode">{{ isLogin ? '注册' : '登录' }}</a>
        </p>
      </form>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const isLogin = ref(true) // true for login, false for register
const authErrorMessage = ref(null) // 用于页面内错误消息
const authSuccessMessage = ref(null) // 用于页面内成功消息
const router = useRouter()

const toggleAuthMode = () => {
  isLogin.value = !isLogin.value
  authErrorMessage.value = null // Clear error message on mode switch
  authSuccessMessage.value = null // Clear success message on mode switch
}

const handleAuth = async () => {
  authErrorMessage.value = null // Clear previous errors
  authSuccessMessage.value = null // Clear previous success messages

  try {
    let response;
    if (isLogin.value) {
      // Login
      response = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
    } else {
      // Register
      response = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
    }

    const { data, error } = response;

    if (error) {
      authErrorMessage.value = error.message
      setTimeout(() => authErrorMessage.value = null, 3000); // 3秒后清除消息
    } else if (data.user) {
      console.log('Auth successful:', data.user)
      authSuccessMessage.value = isLogin.value ? '登录成功！' : '注册成功！';
      setTimeout(() => {
        authSuccessMessage.value = null;
        router.push('/'); // Redirect to home page on successful auth after message
      }, 1500); // 1.5秒后清除消息并跳转

      // 在用户认证成功后，检查并创建/更新profiles表中的用户资料
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') { // No rows found
        console.log('Creating new profile for user:', data.user.id)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: data.user.email.split('@')[0], // Use part of email as default username
          })
        if (insertError) {
          console.error('Error creating profile:', insertError.message)
        }
      } else if (profileError) {
        console.error('Error fetching profile:', profileError.message)
      }

    }

  } catch (err) {
    authErrorMessage.value = '发生未知错误。';
    setTimeout(() => authErrorMessage.value = null, 3000); // 3秒后清除消息
    console.error(err)
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem 2rem;
  min-height: calc(100vh - var(--header-height, 80px) - var(--footer-height, 100px));
}

.auth-card {
  max-width: 450px;
  width: 100%;
  padding: 3rem 2.5rem;
  text-align: center;
}

.auth-title {
  font-size: 2.2rem;
  color: var(--heading-color);
  margin-top: 0;
  margin-bottom: 2.5rem;
  position: relative;
  padding-bottom: 0.8rem;
}

.auth-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background-color: var(--primary-blue);
  border-radius: 1.5px;
}

.auth-form {
  margin-top: 2rem;
}

.auth-button {
  width: 100%;
  margin-top: 1rem;
  padding: 1.1rem;
  font-size: 1.1rem;
}

.toggle-auth {
  margin-top: 1.8rem;
  font-size: 0.95rem;
  color: #666;
}

.toggle-auth a {
  font-weight: 600;
}

.error-message {
  color: #dc3545;
  margin-top: 1rem;
  font-size: 0.95rem;
}

.success-message {
  color: #28a745;
  margin-top: 1rem;
  font-size: 0.95rem;
}
</style>
