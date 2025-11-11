import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import PostDetail from '../views/PostDetail.vue'
import Auth from '../views/Auth.vue'
import Profile from '../views/Profile.vue'
import CreatePost from '../views/CreatePost.vue' // 导入 CreatePost 组件
import EditPost from '../views/EditPost.vue' // 导入 EditPost 组件
import { supabase } from '../supabase' // 导入 Supabase 客户端实例

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: PostDetail,
    props: true
  },
  {
    path: '/auth',
    name: 'Auth',
    component: Auth
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true } // 添加元信息，表示需要认证
  },
  {
    path: '/create-post',
    name: 'CreatePost',
    component: CreatePost,
    meta: { requiresAuth: true } // 需要认证才能访问
  },
  {
    path: '/edit-post/:id',
    name: 'EditPost',
    component: EditPost,
    props: true,
    meta: { requiresAuth: true } // 需要认证才能访问
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 导航守卫：检查路由是否需要认证
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  // 添加错误处理，确保即使获取会话失败也不会阻塞路由
  try {
    // 获取当前会话，使用更可靠的方式
    const { data, error } = await supabase.auth.getSession()
    let isAuthenticated = false
    
    if (error) {
      console.error('Error getting session in router guard:', error)
      isAuthenticated = false
    } else {
      isAuthenticated = !!data.session
    }
    
    console.log(`Navigation to ${to.path}, requiresAuth: ${requiresAuth}, isAuthenticated: ${isAuthenticated}`)

    if (requiresAuth && !isAuthenticated) {
      // 使用replace避免用户能通过浏览器后退按钮返回到需要认证的页面
      next({ path: '/auth', replace: true })
    } else {
      next()
    }
  } catch (err) {
    console.error('Unexpected error in router guard:', err)
    // 出错时，对于需要认证的页面重定向到登录页
    if (requiresAuth) {
      next({ path: '/auth', replace: true })
    } else {
      // 不需要认证的页面可以继续访问
      next()
    }
  }
})

export default router
