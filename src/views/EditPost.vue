<template>
  <main class="create-post-page">
    <div class="create-post-card card">
      <h2 class="page-title">编辑文章</h2>
      <form @submit.prevent="handlePostUpdate(true)" class="create-post-form">
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
          <button type="submit" class="button primary-button">保存并发布</button>
          <button type="button" @click="handlePostUpdate(false)" class="button secondary-button">保存为草稿</button>
          <p class="help-text button-help-text">点击“保存并发布”将更新并公开文章，点击“保存为草稿”仅保存不公开。</p>
        </div>
        <p v-if="postErrorMessage" class="error-message">{{ postErrorMessage }}</p>
        <p v-if="postSuccessMessage" class="success-message">{{ postSuccessMessage }}</p>
      </form>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'

const route = useRoute()
const router = useRouter()
const postId = ref(route.params.id)

const title = ref('')
const slug = ref('')
const content = ref('')
const postErrorMessage = ref(null)
const postSuccessMessage = ref(null)
const loadingPost = ref(true)

const fetchPost = async () => {
  loadingPost.value = true;
  postErrorMessage.value = null;
  postSuccessMessage.value = null;

  if (!postId.value) {
    postErrorMessage.value = '文章 ID 未提供。';
    loadingPost.value = false;
    return;
  }

  const { data, error } = await supabase
    .from('posts')
    .select('title, slug, content, is_published, author_id')
    .eq('id', postId.value)
    .single();

  if (error) {
    console.error('Error fetching post for editing:', error.message);
    postErrorMessage.value = '加载文章失败：' + error.message;
    loadingPost.value = false;
    // 如果文章不存在或无权限，重定向到个人资料页
    router.push('/profile');
  } else if (data) {
    // 检查当前用户是否有权限编辑这篇文章
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== data.author_id) {
      postErrorMessage.value = '您无权编辑此文章。';
      loadingPost.value = false;
      router.push('/profile'); // 无权限重定向
      return;
    }

    title.value = data.title;
    slug.value = data.slug;
    content.value = data.content;
    loadingPost.value = false;
  } else {
    postErrorMessage.value = '文章未找到。';
    loadingPost.value = false;
    router.push('/profile');
  }
};

const handlePostUpdate = async (isPublishedStatus) => {
  postErrorMessage.value = null;
  postSuccessMessage.value = null;

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    postErrorMessage.value = '请先登录才能更新文章。或认证信息已过期，请重新登录。';
    setTimeout(() => postErrorMessage.value = null, 3000);
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
    if (isPublishedStatus) {
      const { data, error } = await supabase
        .from('posts')
        .update({
          title: title.value,
          slug: slug.value,
          content: content.value,
          is_published: true,
          updated_at: new Date(),
          // 列为 NOT NULL，设置发布时间
          published_at: new Date()
        })
        .eq('id', postId.value)
        .select();

      if (error) {
        postErrorMessage.value = error.message;
        console.error('Error updating post:', error.message);
        setTimeout(() => postErrorMessage.value = null, 3000);
        return;
      }

      postSuccessMessage.value = '文章更新并发布成功！';
      setTimeout(() => postSuccessMessage.value = null, 3000);
      if (data && data.length > 0) {
        router.push(`/post/${data[0].id}`);
      } else {
        router.push('/');
      }
    } else {
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.value,
          slug: slug.value,
          content: content.value,
          is_published: false,
          updated_at: new Date(),
          // 列为 NOT NULL，这里也保留一个时间戳
          published_at: new Date()
        })
        .eq('id', postId.value)
        .select({ head: true, count: 'exact' }); // 避免返回行，尽量减少 RLS 影响

      if (error) {
        postErrorMessage.value = error.message;
        console.error('Error saving draft:', error.message);
        setTimeout(() => postErrorMessage.value = null, 3000);
        return;
      }

      postSuccessMessage.value = '文章已保存为草稿！';
      setTimeout(() => postSuccessMessage.value = null, 3000);
      router.push('/profile');
    }
  } catch (err) {
    postErrorMessage.value = '发生未知错误。';
    console.error(err);
    setTimeout(() => postErrorMessage.value = null, 3000);
  }
};

onMounted(() => {
  fetchPost();
})

watch(() => route.params.id, (newId) => {
  if (newId) {
    postId.value = newId;
    fetchPost();
  }
});
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
