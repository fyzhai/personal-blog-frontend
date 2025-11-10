<template>
  <main class="post-detail-page">
    <div v-if="loading">
      <p class="loading-message">加载文章详情...</p>
    </div>
    <div v-else-if="!post">
      <p class="no-post-found">文章未找到或已被删除。</p>
      <router-link to="/" class="back-to-home-link">&larr; 返回主页</router-link>
    </div>
    <div v-else>
      <article class="post-article card">
        <h1 class="article-title">{{ post.title }}</h1>
        <p class="article-meta">
          发布于 {{ new Date(post.published_at).toLocaleDateString() }} by
          <span class="author-name">{{ post.profiles ? post.profiles.username : '未知作者' }}</span>
          <span v-if="!post.is_published" class="post-status-badge draft-badge">草稿</span>
        </p>
        <div class="article-content" v-html="post.content"></div>

        <div v-if="!post.is_published && user && user.id === post.author_id" class="draft-actions">
          <button @click="confirmPublish" class="button primary-button">一键发布</button>
          <router-link :to="`/profile`" class="button secondary-button">返回我的文章</router-link>
        </div>
        <router-link v-else to="/" class="back-to-home-link">&larr; 返回主页</router-link>
      </article>

      <section v-if="post.is_published" class="comments-section card">
        <h2 class="comments-title">评论 ({{ comments.length }})</h2>
        <div v-if="comments.length === 0" class="no-comments">
          <p>目前还没有评论。成为第一个评论的人吧！</p>
        </div>
        <div v-else class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <p class="comment-author">{{ comment.profiles ? comment.profiles.username : '匿名' }} <span class="comment-date">于 {{ new Date(comment.created_at).toLocaleString() }}</span></p>
              <button v-if="user && user.id === comment.author_id" @click="confirmDeleteComment(comment.id)" class="button delete-comment-button">删除</button>
            </div>
            <p class="comment-content">{{ comment.content }}</p>
          </div>
        </div>
        <div v-if="user" class="comment-form-container">
          <h3>发表评论</h3>
          <form @submit.prevent="addComment">
            <div class="form-group">
              <textarea
                v-model="newCommentContent"
                placeholder="留下你的评论..."
                rows="5"
                required
              ></textarea>
            </div>
            <button type="submit" class="button">提交评论</button>
          </form>
          <p v-if="commentErrorMessage" class="error-message">{{ commentErrorMessage }}</p>
          <p v-if="commentSuccessMessage" class="success-message">{{ commentSuccessMessage }}</p>
        </div>
        <p v-else class="login-to-comment">
          <router-link to="/auth">登录</router-link> 即可发表评论。
        </p>
      </section>

      <p v-if="publishErrorMessage" class="error-message page-message">{{ publishErrorMessage }}</p>
      <p v-if="publishSuccessMessage" class="success-message page-message">{{ publishSuccessMessage }}</p>

      <!-- 自定义发布确认模态框 -->
      <div v-if="showPublishConfirm" class="confirmation-overlay">
        <div class="confirmation-card card">
          <h3>确定要发布这篇文章吗？</h3>
          <p class="confirm-message">发布后将对所有访问者可见，并启用评论功能。</p>
          <div class="confirm-actions">
            <button @click="executePublish" class="button confirm-button primary-button">确定发布</button>
            <button @click="cancelPublish" class="button cancel-button secondary-button">取消</button>
          </div>
        </div>
      </div>

      <!-- 自定义删除评论确认模态框 -->
      <div v-if="showDeleteCommentConfirm" class="confirmation-overlay">
        <div class="confirmation-card card">
          <h3>确定要删除这条评论吗？</h3>
          <p class="confirm-message">此操作不可逆，评论删除后将无法恢复。</p>
          <div class="confirm-actions">
            <button @click="executeDeleteComment" class="button confirm-button delete-button">确定删除</button>
            <button @click="cancelDeleteComment" class="button cancel-button">取消</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../supabase'

const route = useRoute()
const postId = ref(route.params.id)
const post = ref(null)
const comments = ref([])
const loading = ref(true)
const user = ref(null)
const newCommentContent = ref('')

// 用于页面内消息
const commentErrorMessage = ref(null)
const commentSuccessMessage = ref(null)
const publishErrorMessage = ref(null)
const publishSuccessMessage = ref(null)
const deleteCommentErrorMessage = ref(null) // 新增评论删除错误消息
const deleteCommentSuccessMessage = ref(null) // 新增评论删除成功消息

// 用于自定义发布确认框
const showPublishConfirm = ref(false)

// 用于自定义删除评论确认框
const showDeleteCommentConfirm = ref(false)
const commentIdToDelete = ref(null)

const clearMessages = () => {
  commentErrorMessage.value = null;
  commentSuccessMessage.value = null;
  publishErrorMessage.value = null;
  publishSuccessMessage.value = null;
  deleteCommentErrorMessage.value = null; // 清除评论删除消息
  deleteCommentSuccessMessage.value = null; // 清除评论删除消息
}

const fetchPostAndComments = async (id) => {
  loading.value = true
  post.value = null
  comments.value = []
  clearMessages(); // 清除消息

  // Fetch post details
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select(`
      *,
      profiles(username)
    `)
    .eq('id', id)
    .single()

  if (postError) {
    console.error('Error fetching post:', postError.message)
  } else {
    post.value = postData
  }

  // Fetch comments only if post is published
  if (postData && postData.is_published) {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(username)
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Error fetching comments:', commentsError.message)
    } else {
      comments.value = commentsData
    }
  }

  loading.value = false

  // Get current user session after fetching post, to check authorship
  const { data: { session } } = await supabase.auth.getSession()
  user.value = session?.user || null
}

const addComment = async () => {
  if (!user.value) {
    commentErrorMessage.value = '请先登录才能发表评论。';
    setTimeout(() => commentErrorMessage.value = null, 3000);
    return
  }

  if (!newCommentContent.value.trim()) {
    commentErrorMessage.value = '评论内容不能为空。';
    setTimeout(() => commentErrorMessage.value = null, 3000);
    return
  }

  commentErrorMessage.value = null;
  commentSuccessMessage.value = null;

  const { error } = await supabase.from('comments').insert({
    post_id: postId.value,
    author_id: user.value.id,
    content: newCommentContent.value.trim(),
  })

  if (error) {
    console.error('Error adding comment:', error.message)
    commentErrorMessage.value = '发表评论失败：' + error.message;
    setTimeout(() => commentErrorMessage.value = null, 3000);
  } else {
    newCommentContent.value = '' // Clear input
    commentSuccessMessage.value = '评论发表成功！';
    setTimeout(() => commentSuccessMessage.value = null, 3000);
    fetchPostAndComments(postId.value) // Re-fetch comments to update list
  }
}

// 触发自定义发布确认框
const confirmPublish = () => {
  publishErrorMessage.value = null;
  publishSuccessMessage.value = null;
  showPublishConfirm.value = true;
};

// 执行发布操作
const executePublish = async () => {
  showPublishConfirm.value = false; // 隐藏确认框

  const { error } = await supabase
    .from('posts')
    .update({ is_published: true, published_at: new Date() })
    .eq('id', postId.value);

  if (error) {
    console.error('Error publishing post:', error.message);
    publishErrorMessage.value = '发布文章失败：' + error.message;
    setTimeout(() => publishErrorMessage.value = null, 3000);
  } else {
    publishSuccessMessage.value = '文章已成功发布！';
    setTimeout(() => publishSuccessMessage.value = null, 3000);
    await fetchPostAndComments(postId.value);
  }
};

// 取消发布操作
const cancelPublish = () => {
  showPublishConfirm.value = false;
};

// 触发自定义删除评论确认框
const confirmDeleteComment = (id) => {
  commentIdToDelete.value = id;
  deleteCommentErrorMessage.value = null;
  deleteCommentSuccessMessage.value = null;
  showDeleteCommentConfirm.value = true;
};

// 执行删除评论操作
const executeDeleteComment = async () => {
  if (!commentIdToDelete.value) return;

  showDeleteCommentConfirm.value = false; // 隐藏确认框

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentIdToDelete.value);

  if (error) {
    console.error('Error deleting comment:', error.message);
    deleteCommentErrorMessage.value = '删除评论失败：' + error.message;
    setTimeout(() => deleteCommentErrorMessage.value = null, 3000);
  } else {
    deleteCommentSuccessMessage.value = '评论已成功删除。';
    setTimeout(() => deleteCommentSuccessMessage.value = null, 3000);
    fetchPostAndComments(postId.value); // 重新获取评论列表
  }
  commentIdToDelete.value = null; // 清除待删除评论ID
};

// 取消删除评论操作
const cancelDeleteComment = () => {
  showDeleteCommentConfirm.value = false;
  commentIdToDelete.value = null;
};

onMounted(async () => {
  // Initial fetch based on current route param
  if (route.params.id) {
    await fetchPostAndComments(route.params.id)
  }

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((_, _session) => {
    user.value = _session?.user || null
    // 如果用户状态变化，重新获取文章和评论，以更新评论表单的可见性
    if (route.params.id) {
      fetchPostAndComments(route.params.id);
    }
  })
})

// Watch for route param changes to re-fetch data for different posts
watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      postId.value = newId
      await fetchPostAndComments(newId)
    }
  }
)
</script>

<style scoped>
.post-detail-page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.post-article {
  padding: 3rem;
}

.article-title {
  font-size: 2.8rem;
  color: var(--heading-color);
  margin-top: 0;
  margin-bottom: 1rem;
  line-height: 1.2;
  text-align: center;
  position: relative;
  padding-bottom: 0.8rem;
}

.article-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100px;
  height: 4px;
  background-color: var(--primary-blue);
  border-radius: 2px;
}

.article-meta {
  text-align: center;
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--border-gray);
  padding-bottom: 1.5rem;
}

.author-name {
  font-weight: 600;
  color: var(--primary-blue);
}

.post-status-badge {
  display: inline-block;
  margin-left: 1rem;
  padding: 0.3em 0.8em;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.draft-badge {
  background-color: var(--light-blue);
  color: var(--primary-blue);
  border: 1px solid var(--primary-blue);
}

.article-content {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text-color);
  margin-bottom: 3rem;
  white-space: pre-wrap; /* 保持文本中的换行和空格 */
}

.article-content p {
  margin-bottom: 1.5rem;
}

.article-content pre {
  background-color: var(--lighter-gray);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.5rem 0;
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
}

.article-content code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  color: #c7254e;
}

.back-to-home-link {
  display: block;
  text-align: center;
  margin-top: 2.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-blue);
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-to-home-link:hover {
  color: var(--dark-blue);
  text-decoration: underline;
}

.draft-actions {
  text-align: center;
  margin-top: 3rem;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.comments-section {
  padding: 2.5rem;
}

.comments-title {
  font-size: 2rem;
  margin-top: 0;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-gray);
  padding-bottom: 0.8rem;
  text-align: left;
}

.no-comments p {
  text-align: center;
  color: #777;
  font-style: italic;
  padding: 1rem 0;
}

.loading-message,
.no-post-found {
  text-align: center;
  font-size: 1.1rem;
  color: #777;
  padding: 2rem 0;
}

.comments-list {
  margin-top: 1.5rem;
}

.comment-item {
  background-color: var(--light-gray);
  border: 1px solid var(--border-gray);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.comment-author {
  font-weight: 700;
  color: var(--heading-color);
  margin-bottom: 0;
  flex-grow: 1;
}

.comment-date {
  font-weight: normal;
  font-size: 0.85rem;
  color: #999;
  margin-left: 0.8rem;
}

.comment-content {
  font-size: 0.95rem;
  color: var(--text-color);
  line-height: 1.6;
}

.comment-form-container h3 {
  font-size: 1.6rem;
  margin-top: 2.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-gray);
  padding-bottom: 0.5rem;
}

.login-to-comment {
  text-align: center;
  margin-top: 2rem;
  font-size: 1rem;
  color: #666;
}

.login-to-comment a {
  font-weight: 600;
}

.primary-button {
  background-color: var(--primary-blue);
  color: var(--background-white);
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  border-radius: 6px;
}

.primary-button:hover {
  background-color: var(--dark-blue);
}

.secondary-button {
  background-color: var(--light-blue);
  color: var(--primary-blue);
  border: 1px solid var(--primary-blue);
  margin-left: 1rem;
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  border-radius: 6px;
  text-decoration: none;
}

.secondary-button:hover {
  background-color: #cce5ff;
  border-color: var(--dark-blue);
  color: var(--dark-blue);
  text-decoration: none;
}

.page-message {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 1rem;
  font-weight: 500;
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

.confirmation-overlay .confirm-button {
  background-color: var(--primary-blue);
  color: var(--background-white);
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  border-radius: 6px;
}

.confirmation-overlay .confirm-button:hover {
  background-color: var(--dark-blue);
}

.confirmation-overlay .cancel-button {
  background-color: #6c757d;
  color: var(--background-white);
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  border-radius: 6px;
  margin-left: 1.5rem;
}

.confirmation-overlay .cancel-button:hover {
  background-color: #5a6268;
}

.delete-comment-button {
  background-color: #dc3545;
  color: var(--background-white);
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background-color 0.3s ease, transform 0.2s ease;
  flex-shrink: 0;
}

.delete-comment-button:hover {
  background-color: #c82333;
  transform: translateY(-1px);
}
</style>
