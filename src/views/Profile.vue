<template>
  <main class="profile-page">
    <div v-if="loading">
      <p class="loading-message">加载用户资料...</p>
    </div>
    <div v-else-if="!userProfile">
      <p class="no-profile-found">用户资料未找到。</p>
      <router-link to="/" class="back-to-home-link">&larr; 返回主页</router-link>
    </div>
    <div v-else class="profile-card card">
      <h2 class="profile-title">我的资料</h2>
      <div class="profile-info">
        <p><strong>用户名:</strong> {{ userProfile.username }}</p>
        <p><strong>邮箱:</strong> {{ user.email }}</p>
        <p v-if="userProfile.website"><strong>个人网站:</strong> <a :href="userProfile.website" target="_blank">{{ userProfile.website }}</a></p>
      </div>
      <button @click="showEditForm = true" class="button edit-profile-button">编辑资料</button>

      <div v-if="showEditForm" class="edit-profile-form">
        <h3>编辑我的资料</h3>
        <form @submit.prevent="updateProfile">
          <div class="form-group">
            <label for="username">用户名</label>
            <input type="text" id="username" v-model="editUsername" required />
          </div>
          <div class="form-group">
            <label for="website">个人网站</label>
            <input type="text" id="website" v-model="editWebsite" placeholder="例如: https://yourwebsite.com (可选)" />
          </div>
          <button type="submit" class="button">保存更改</button>
          <button type="button" @click="showEditForm = false" class="button secondary-button">取消</button>
        </form>
        <p v-if="updateErrorMessage" class="error-message">{{ updateErrorMessage }}</p>
        <p v-if="updateSuccessMessage" class="success-message">{{ updateSuccessMessage }}</p>
      </div>

      <section class="user-posts-section">
        <h3 class="section-title">我发布的文章 ({{ userPosts.length }})</h3>
        <div v-if="postsLoading" class="loading-message">加载文章中...</div>
        <div v-else-if="userPosts.length === 0" class="no-posts-message">
          <p>您还没有发布任何文章。</p>
          <router-link to="/create-post" class="button">立即发布第一篇文章</router-link>
        </div>
        <ul v-else class="user-posts-list">
          <li v-for="post in userPosts" :key="post.id" class="post-item">
            <router-link :to="`/post/${post.id}`" class="post-link">{{ post.title }}</router-link>
            <span :class="['post-status', post.is_published ? 'published' : 'draft']">
              {{ post.is_published ? '已发布' : '草稿' }}
            </span>
            <span class="post-date">{{ new Date(post.published_at).toLocaleDateString() }}</span>
            <router-link :to="`/edit-post/${post.id}`" class="button edit-post-button">编辑</router-link>
            <button @click="confirmDelete(post.id)" class="button delete-button">删除</button>
          </li>
        </ul>
        <p v-if="deleteErrorMessage" class="error-message">{{ deleteErrorMessage }}</p>
        <p v-if="deleteSuccessMessage" class="success-message">{{ deleteSuccessMessage }}</p>
      </section>

      <!-- 自定义删除确认模态框 -->
      <div v-if="showDeleteConfirm" class="confirmation-overlay">
        <div class="confirmation-card card">
          <h3>确定要删除这篇文章吗？</h3>
          <p class="confirm-message">此操作不可逆，文章删除后将无法恢复。</p>
          <div class="confirm-actions">
            <button @click="executeDelete" class="button confirm-button">确定</button>
            <button @click="cancelDelete" class="button cancel-button">取消</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const user = ref(null)
const userProfile = ref(null)
const loading = ref(true)
const showEditForm = ref(false)
const editUsername = ref('')
const editWebsite = ref('')
const userPosts = ref([])
const postsLoading = ref(true)
const router = useRouter()

// 用于显示页面内消息
const updateErrorMessage = ref(null)
const updateSuccessMessage = ref(null)
const deleteErrorMessage = ref(null)
const deleteSuccessMessage = ref(null)

// 用于自定义删除确认框
const showDeleteConfirm = ref(false)
const postIdToDelete = ref(null)

const fetchUserProfile = async () => {
  loading.value = true
  // 清除之前的消息
  updateErrorMessage.value = null;
  updateSuccessMessage.value = null;
  deleteErrorMessage.value = null;
  deleteSuccessMessage.value = null;

  const { data: { session } } = await supabase.auth.getSession()
  user.value = session?.user || null

  if (user.value) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, website, created_at')
      .eq('id', user.value.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error.message)
      userProfile.value = null
    } else {
      userProfile.value = data
      editUsername.value = data.username
      editWebsite.value = data.website
    }
    await fetchUserPosts(user.value.id)
  } else {
    router.push('/auth')
  }
  loading.value = false
}

const fetchUserPosts = async (userId) => {
  postsLoading.value = true
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, is_published, published_at')
    .eq('author_id', userId)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching user posts:', error.message)
  } else {
    userPosts.value = data
  }
  postsLoading.value = false
}

const updateProfile = async () => {
  if (!user.value) return

  updateErrorMessage.value = null;
  updateSuccessMessage.value = null;

  const updates = {
    id: user.value.id,
    username: editUsername.value,
    website: editWebsite.value,
    updated_at: new Date(),
  }

  const { error } = await supabase.from('profiles').upsert(updates)

  if (error) {
    console.error('Error updating profile:', error.message)
    updateErrorMessage.value = '更新资料失败：' + error.message;
  } else {
    showEditForm.value = false
    await fetchUserProfile() // Re-fetch to update displayed info and posts
    updateSuccessMessage.value = '资料更新成功！';
    setTimeout(() => updateSuccessMessage.value = null, 3000); // 3秒后清除消息
  }
}

// 触发自定义删除确认框
const confirmDelete = (postId) => {
  postIdToDelete.value = postId;
  showDeleteConfirm.value = true;
}

// 执行删除操作
const executeDelete = async () => {
  if (!postIdToDelete.value) return;

  showDeleteConfirm.value = false; // 隐藏确认框
  deleteErrorMessage.value = null;
  deleteSuccessMessage.value = null;

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postIdToDelete.value);

  if (error) {
    console.error('Error deleting post:', error.message);
    deleteErrorMessage.value = '删除文章失败：' + error.message;
  } else {
    deleteSuccessMessage.value = '文章已成功删除。';
    await fetchUserPosts(user.value.id); // Refresh the list of posts
    setTimeout(() => deleteSuccessMessage.value = null, 3000); // 3秒后清除消息
  }
  postIdToDelete.value = null; // 清除待删除文章ID
}

// 取消删除操作
const cancelDelete = () => {
  showDeleteConfirm.value = false;
  postIdToDelete.value = null;
}

onMounted(() => {
  fetchUserProfile()

  supabase.auth.onAuthStateChange((_, _session) => {
    if (_session?.user && _session.user.id !== user.value?.id) {
      fetchUserProfile()
    } else if (!_session) {
      user.value = null
      userProfile.value = null
      userPosts.value = [] // Clear posts on logout
      router.push('/auth')
    }
  })
})
</script>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 2rem;
  min-height: calc(100vh - var(--header-height, 80px) - var(--footer-height, 100px));
}

.profile-card {
  max-width: 700px;
  width: 100%;
  padding: 3rem 2.5rem;
  text-align: center;
}

.profile-title {
  font-size: 2.5rem;
  color: var(--heading-color);
  margin-top: 0;
  margin-bottom: 2.5rem;
  position: relative;
  padding-bottom: 0.8rem;
}

.profile-title::after {
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

.profile-info p {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-color);
}

.profile-info strong {
  color: var(--heading-color);
  margin-right: 0.5rem;
}

/* 移除 .profile-avatar 样式 */

.edit-profile-button {
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.edit-profile-form {
  margin-top: 3rem;
  border-top: 1px solid var(--border-gray);
  padding-top: 2rem;
  text-align: left;
}

.edit-profile-form h3 {
  font-size: 1.8rem;
  color: var(--heading-color);
  margin-top: 0;
  margin-bottom: 2rem;
  text-align: center;
}

.secondary-button {
  background-color: #6c757d;
  margin-left: 1rem;
}

.secondary-button:hover {
  background-color: #5a6268;
}

.loading-message,
.no-profile-found {
  text-align: center;
  font-size: 1.1rem;
  color: #777;
  padding: 2rem 0;
}

.user-posts-section {
  margin-top: 3.5rem;
  padding-top: 3rem;
  border-top: 1px solid var(--border-gray);
}

.user-posts-section .section-title {
  font-size: 2rem;
  color: var(--heading-color);
  margin-bottom: 2.5rem;
  text-align: center;
  position: relative;
  padding-bottom: 0.8rem;
}

.user-posts-section .section-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 70px;
  height: 3px;
  background-color: var(--primary-blue);
  border-radius: 1.5px;
}

.no-posts-message {
  text-align: center;
  padding: 2rem 0;
}

.no-posts-message p {
  font-size: 1.1rem;
  color: #777;
  margin-bottom: 1.5rem;
}

.user-posts-list {
  list-style: none;
  padding: 0;
  text-align: left; /* 列表项左对齐 */
}

.post-item {
  background-color: var(--background-white);
  border: 1px solid var(--border-gray);
  border-radius: 8px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  gap: 0.8rem; /* 增加元素间的间距 */
}

.post-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
}

.post-link {
  flex-grow: 1;
  font-size: 1.15rem;
  color: var(--heading-color);
  text-decoration: none;
  font-weight: 600;
  margin-right: auto; /* 让链接占据剩余空间，将按钮推到右侧 */
  transition: color 0.2s ease;
}

.post-link:hover {
  color: var(--primary-blue);
  text-decoration: underline;
}

.post-status {
  font-size: 0.85rem;
  padding: 0.3em 0.7em;
  border-radius: 4px;
  margin-right: 0.8rem; /* 调整与编辑按钮的间距 */
  font-weight: 500;
  flex-shrink: 0; /* 防止状态文本被压缩 */
}

.post-status.published {
  background-color: #d4edda;
  color: #155724;
}

.post-status.draft {
  background-color: #fff3cd;
  color: #856404;
}

.post-date {
  font-size: 0.85rem;
  color: #777;
  margin-right: 0.8rem; /* 调整与编辑按钮的间距 */
  flex-shrink: 0; /* 防止日期文本被压缩 */
}

.edit-post-button {
  background-color: var(--primary-blue);
  color: var(--background-white);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.3s ease, transform 0.2s ease;
  flex-shrink: 0;
  text-decoration: none; /* 确保没有下划线 */
}

.edit-post-button:hover {
  background-color: var(--dark-blue);
  transform: translateY(-2px);
}

.delete-button {
  background-color: #dc3545;
  color: var(--background-white);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.3s ease, transform 0.2s ease;
  flex-shrink: 0; /* 防止按钮被压缩 */
  margin-left: 0;
}

.delete-button:hover {
  background-color: #c82333;
  transform: translateY(-2px);
}

/* Custom Confirmation Overlay Styles */
.confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.confirmation-card {
  background-color: var(--background-white);
  padding: 3rem;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 450px;
  width: 90%;
}

.confirmation-card h3 {
  font-size: 1.8rem;
  color: var(--heading-color);
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.confirm-message {
  font-size: 1.1rem;
  color: var(--text-color);
  margin-bottom: 2rem;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.confirm-button {
  background-color: #dc3545; /* 红色用于确认删除 */
}

.confirm-button:hover {
  background-color: #c82333;
}

.cancel-button {
  background-color: #6c757d; /* 灰色用于取消 */
}

.cancel-button:hover {
  background-color: #5a6268;
}
</style>
