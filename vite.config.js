import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // this IS the storefront now — root is the shop
        admin: resolve(__dirname, 'admin/index.html'), // the billing/admin app lives here
        shopCatalog: resolve(__dirname, 'shop/catalog.html'),
        shopCart: resolve(__dirname, 'shop/cart.html'),
        shopCheckout: resolve(__dirname, 'shop/checkout.html'),
        shopLogin: resolve(__dirname, 'shop/login.html'),
        shopSignup: resolve(__dirname, 'shop/signup.html'),
        shopAccount: resolve(__dirname, 'shop/account.html'),
        shopOrder: resolve(__dirname, 'shop/order.html'),
        shopTerms: resolve(__dirname, 'shop/terms.html'),
        shopPrivacy: resolve(__dirname, 'shop/privacy.html'),
        shopPolicies: resolve(__dirname, 'shop/policies.html'),
      }
    }
  }
})
