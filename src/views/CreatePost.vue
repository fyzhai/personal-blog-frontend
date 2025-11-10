<template>
  <main class="create-post-page">
    <div class="create-post-card card">
      <h2 class="page-title">创建新文章</h2>
      <form @submit.prevent="handlePostSubmission(true)" class="create-post-form">
        <div class="form-group">
          <label for="title">文章标题</label>
          <input type="text" id="title" v-model="title" required />
        </div>

        <div class="form-group">
          <label for="slug">文章 Slug (URL友好名称)</label>
          <input type="text" id="slug" v-model="slug" required placeholder="例如: my-first-blog-post, 用于文章的唯一URL" />
        </div>

        <div class="form-group">
          <label for="content">文章内容</label>
          <textarea id="content" v-model="content" rows="15" required></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="button primary-button">发布文章</button>
          <button type="button" @click="handlePostSubmission(false)" class="button secondary-button">存为草稿</button>
          <p class="help-text button-help-text">点击“发布文章”将立即公开，点击“存为草稿”仅保存不公开。</p>
        </div>
        <p v-if="postErrorMessage" class="error-message">{{ postErrorMessage }}</p>
        <p v-if="postSuccessMessage" class="success-message">{{ postSuccessMessage }}</p>
      </form>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const title = ref('')
const slug = ref('')
const content = ref('')
const postErrorMessage = ref(null) // 用于页面内错误消息
const postSuccessMessage = ref(null) // 用于页面内成功消息
const router = useRouter()

const handlePostSubmission = async (isPublishedStatus) => {
  postErrorMessage.value = null
  postSuccessMessage.value = null

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    postErrorMessage.value = '请先登录才能发布或保存文章。或认证信息已过期，请重新登录。';
    setTimeout(() => postErrorMessage.value = null, 3000); // 3秒后清除消息
    // router.push('/auth'); // 不再自动跳转，只显示消息
    return;
  }

  // 简单的表单验证
  if (!title.value.trim()) {
    postErrorMessage.value = '文章标题不能为空。';
    setTimeout(() => postErrorMessage.value = null, 3000);
    return;
  }
  if (!slug.value.trim()) {
    postErrorMessage.value = '文章Slug不能为空。';
    setTimeout(() => postErrorMessage.value = null, 3000);
    return;
  }
  if (!content.value.trim()) {
    postErrorMessage.value = '文章内容不能为空。';
    setTimeout(() => postErrorMessage.value = null, 3000);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        title: title.value,
        slug: slug.value,
        content: content.value,
        is_published: isPublishedStatus,
      })
      .select()

    if (error) {
      postErrorMessage.value = error.message;
      console.error('Error creating post:', error.message);
      setTimeout(() => postErrorMessage.value = null, 3000);
    } else if (data && data.length > 0) {
      postSuccessMessage.value = isPublishedStatus ? '文章发布成功！' : '文章已存为草稿！';
      setTimeout(() => postSuccessMessage.value = null, 3000); // 3秒后清除消息
      title.value = '';
      slug.value = '';
      content.value = '';

      if (isPublishedStatus) {
        router.push(`/post/${data[0].id}`); // 发布成功后跳转到文章详情页
      } else {
        router.push('/profile'); // 存为草稿后跳转到个人资料页的文章列表
      }
    }
  } catch (err) {
    postErrorMessage.value = '发生未知错误。';
    console.error(err);
    setTimeout(() => postErrorMessage.value = null, 3000);
  }
}
</script>

<style scoped>
.create-post-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 2rem;
  min-height: calc(100vh - var(--header-height, 80px) - var(--footer-height, 100px));
}

.create-post-card {
  max-width: 800px;
  width: 100%;
  padding: 3rem 2.5rem;
  text-align: left;
}

.page-title {
  font-size: 2.2rem;
  color: var(--heading-color);
  margin-top: 0;
  margin-bottom: 2.5rem;
  position: relative;
  padding-bottom: 0.8rem;
  text-align: center;
}

.page-title::after {
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

.create-post-form {
  margin-top: 2rem;
}

.form-actions {
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.button {
  width: auto;
  padding: 1rem 2rem;
}

.primary-button {
  background-color: var(--primary-blue);
  color: var(--background-white);
}

.primary-button:hover {
  background-color: var(--dark-blue);
}

.secondary-button {
  background-color: #6c757d;
  color: var(--background-white);
}

.secondary-button:hover {
  background-color: #5a6268;
}

.error-message {
  color: #dc3545;
  margin-top: 1rem;
  font-size: 0.95rem;
  text-align: center;
}

.success-message {
  color: #28a745;
  margin-top: 1rem;
  font-size: 0.95rem;
  text-align: center;
}

.help-text {
  font-size: 0.85rem;
  color: #777;
  margin-left: 0.5rem;
}

.button-help-text {
  text-align: center;
  margin-top: 0.5rem;
}
</style>
