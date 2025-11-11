<template>
  <main>
    <h2 class="page-title">最新文章</h2>

    <div class="search-bar-container">
      <input
        type="text"
        v-model="searchQuery"
        @input="handleSearchInput"
        placeholder="搜索文章标题或作者..."
        class="search-input"
      />
    </div>

    <div class="posts-list">
      <div v-if="posts.length === 0 && !loading">
        <p class="no-posts">目前还没有文章。请稍后再回来看看！</p>
      </div>
      <div v-else-if="loading">
        <p class="loading-message">加载文章中...</p>
      </div>
      <div v-else v-for="post in posts" :key="post.id" class="post-card">
        <h3><router-link :to="`/post/${post.id}`">{{ post.title }}</router-link></h3>
        <p class="post-meta">
          发布于 {{ new Date(post.published_at).toLocaleDateString() }}
          <span v-if="post.profiles"> by {{ post.profiles.username }}</span>
        </p>
        <p>{{ truncateContent(post.content) }}</p>
        <router-link :to="`/post/${post.id}`" class="read-more">阅读更多 &rarr;</router-link>
      </div>
    </div>
    <!-- 移除底部的登录/注册和退出登录按钮 -->
    <!--
    <div class="auth-link-container">
      <router-link v-if="!user" to="/auth" class="button">登录 / 注册</router-link>
      <button v-else @click="handleLogout" class="button logout-button">退出登录</button>
    </div>
    -->
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const posts = ref([])
const loading = ref(true)
const user = ref(null)
const router = useRouter()
const searchQuery = ref('') // 新增搜索查询状态
let searchTimeout = null; // 用于防抖

const fetchPosts = async () => {
  console.log("fetchPosts: Starting...");
  loading.value = true
  let query = supabase
    .from('posts')
    .select(`
      id, 
      title, 
      content, 
      published_at,
      profiles(username) // 关联作者信息
    `)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (searchQuery.value) {
    // 简化搜索查询，使用PostgREST支持的简单格式
    const searchTerm = searchQuery.value.toLowerCase().trim();
    // 不使用复杂的手动编码，而是让Supabase客户端处理编码
    query = query.or(`title.ilike.*${searchTerm}*,profiles.username.ilike.*${searchTerm}*`);
    console.log('Searching with term:', searchTerm);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error.message)
  } else {
    posts.value = data
    console.log("fetchPosts: Data fetched, posts.value now:", posts.value);
  }
  loading.value = false
  console.log("fetchPosts: Finished, loading.value:", loading.value, "posts.length:", posts.value.length);
}

const handleSearchInput = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    fetchPosts();
  }, 500); // 500毫秒防抖
};

const truncateContent = (content) => {
  const maxLength = 150;
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '...';
  }
  return content;
}

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error logging out:', error.message)
  } else {
    user.value = null
    router.push('/auth')
  }
}

onMounted(async () => {
  console.log("onMounted: Component mounted.");
  await fetchPosts()
  console.log("onMounted: fetchPosts completed, posts.length:", posts.value.length);

  // Check for authenticated user
  const { data: { session } } = await supabase.auth.getSession()
  user.value = session?.user || null
  console.log("onMounted: Initial user session check, user:", user.value ? user.value.id : 'null');

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((_, _session) => {
    console.log("onAuthStateChange: Auth state changed.", "_session:", _session);
    user.value = _session?.user || null;
    // 无论登录状态如何变化，都重新获取文章，确保页面显示最新数据
    // fetchPosts() 会根据 RLS 策略和 is_published 状态自动过滤
    fetchPosts();
  });
  console.log("onMounted: onAuthStateChange listener set up.");
})

// 监听 searchQuery 变化以触发搜索 (可以移除 @input 事件，如果只使用 watch)
// watch(searchQuery, () => {
//   handleSearchInput(); // 使用防抖处理搜索
// });
</script>

<style scoped>
.page-title {
  text-align: center;
  margin-bottom: 3rem;
  font-size: 2.5rem;
  color: var(--heading-color);
  position: relative;
  padding-bottom: 1rem;
}

.page-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background-color: var(--primary-blue);
  border-radius: 2px;
}

.posts-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2.5rem;
  margin-bottom: 3rem;
}

.post-card {
  background-color: var(--background-white);
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.post-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.12);
}

.post-card h3 {
  margin-top: 0;
  margin-bottom: 0.8rem;
  font-size: 1.8rem;
  line-height: 1.3;
}

.post-card h3 a {
  color: var(--heading-color);
  text-decoration: none;
  transition: color 0.2s ease;
}

.post-card h3 a:hover {
  color: var(--primary-blue);
}

.post-meta {
  font-size: 0.9rem;
  color: #777;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-gray);
  padding-bottom: 1rem;
}

.post-card p {
  flex-grow: 1;
  font-size: 1rem;
  color: var(--text-color);
  margin-bottom: 1.5rem;
}

.read-more {
  display: inline-block;
  margin-top: auto; /* Push to bottom */
  color: var(--primary-blue);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.read-more:hover {
  color: var(--dark-blue);
  text-decoration: underline;
}

.auth-link-container {
  text-align: center;
  margin-top: 3rem;
}

.button {
  /* Using global button style */
  display: inline-block;
  text-decoration: none;
}

.no-posts, .loading-message {
  text-align: center;
  font-size: 1.1rem;
  color: #777;
  padding: 2rem 0;
}

.logout-button {
  background-color: #dc3545; /* Red color for logout button */
}

.logout-button:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}

.search-bar-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2.5rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
  align-items: center; /* 确保子项垂直居中对齐 */
}

.search-input {
  flex-grow: 1;
  height: 40px; /* 总高度为 40px，包含 padding 和 border */
  padding: 11px 1.2rem; /* 垂直内边距 11px */
  border: 1px solid var(--border-gray);
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 1rem;
  line-height: normal; /* 让浏览器自动计算行高 */
  vertical-align: middle;
  margin: 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--light-blue);
}

.search-button {
  height: 40px; /* 总高度为 40px，与输入框一致 */
  padding: 11px 0.8rem; /* 垂直内边距 11px，与输入框垂直内边距一致 */
  font-size: 1rem;
  line-height: normal; /* 让浏览器自动计算行高 */
  vertical-align: middle;
  flex-shrink: 0;
  border-radius: 6px;
  box-sizing: border-box;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0;
  transition: background-color 0.3s ease, transform 0.2s ease;
  border: 1px solid var(--primary-blue); /* 保持按钮的边框样式 */
}

.search-button:hover {
  background-color: var(--dark-blue);
  transform: translateY(-2px);
}

.post-meta {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 1.2rem;
}

.post-meta span {
  font-weight: 600;
  color: var(--primary-blue);
}
</style>