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
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (requiresAuth && !isAuthenticated) {
    next('/auth')
  } else {
    next()
  }
})

export default router
