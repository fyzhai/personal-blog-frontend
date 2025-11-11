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
    // 使用Netlify域名而不是本地地址，确保邮件确认链接正确
    const redirectTo = 'https://personal-blog-frontend.netlify.app/';
    
    if (isLogin.value) {
      // Login
      response = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
    } else {
      // Register - 添加redirectTo参数确保注册后能正确重定向
      console.log('准备注册用户，邮箱:', email.value, '重定向URL:', redirectTo);
      response = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      }, {
        redirectTo: redirectTo,
        // 明确指定需要发送确认邮件
        shouldCreateUser: true
      })
      console.log('注册响应:', response);
    }

    const { data, error } = response;

    if (error) {
      authErrorMessage.value = error.message
      setTimeout(() => authErrorMessage.value = null, 3000); // 3秒后清除消息
      console.error('Auth error:', error)
    } else {
      // 检查是否有用户对象
      if (data.user) {
        console.log('Auth successful:', data.user)
        authSuccessMessage.value = isLogin.value ? '登录成功！' : '注册成功！';
        
        // 直接进行页面跳转，不再依赖setTimeout，确保跳转逻辑可靠执行
        // 为注册添加特殊处理，确保即使在邮箱未确认情况下也能正确处理
        if (isLogin.value || (!isLogin.value && data.user.email_confirmed_at)) {
          // 立即刷新会话以确保最新状态
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // 确保profile创建操作不会阻止页面跳转
            createProfileIfNeeded(data.user.id, data.user.email).catch(console.error);
            // 使用replace避免返回登录页
            router.replace('/');
          }
        } else if (!isLogin.value && !data.user.email_confirmed_at) {
          // 如果是注册但邮箱未确认，显示提示信息
          console.log('用户注册成功但邮箱未确认，检查垃圾邮件文件夹');
          authSuccessMessage.value = '注册成功！确认邮件已发送，请检查邮箱(包括垃圾邮件文件夹)进行确认。';
          setTimeout(() => {
            authSuccessMessage.value = null;
          }, 8000); // 显示更长时间，让用户有足够时间看到提示
        }
      } else if (data.session) {
        // 有时可能只有session没有user对象，这也是成功状态
        console.log('Auth session established:', data.session)
        authSuccessMessage.value = isLogin.value ? '登录成功！' : '注册成功！';
        // 确保profile创建
        createProfileIfNeeded(data.session.user.id, data.session.user.email).catch(console.error);
        router.replace('/');
      }
    }

  } catch (err) {
    authErrorMessage.value = '发生未知错误。';
    setTimeout(() => authErrorMessage.value = null, 3000); // 3秒后清除消息
    console.error('Unexpected auth error:', err)
  }
}

// 将profile创建逻辑抽取为单独函数，便于错误处理
const createProfileIfNeeded = async (userId, userEmail) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code === 'PGRST116') { // No rows found
      console.log('Creating new profile for user:', userId)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: userEmail.split('@')[0], // Use part of email as default username
        })
      if (insertError) {
        console.error('Error creating profile:', insertError.message)
      }
    } else if (profileError) {
      console.error('Error fetching profile:', profileError.message)
    }
  } catch (err) {
    console.error('Error in createProfileIfNeeded:', err)
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
