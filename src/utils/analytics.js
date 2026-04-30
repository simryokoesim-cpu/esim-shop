/**
 * Umami 自定义事件追踪
 * 文档：https://umami.is/docs/track-events
 */

// 安全调用 umami（不报错）
const track = (eventName, data = {}) => {
  try {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(eventName, data);
    }
  } catch (e) {}
};

// 📦 查看产品详情
export const trackViewProduct = (productId, country, price) => {
  track('view_product', { product_id: productId, country, price });
};

// 🛒 点击「立即购买」
export const trackClickBuy = (productId, country, price) => {
  track('click_buy', { product_id: productId, country, price });
};

// 💳 选择支付方式
export const trackSelectPayment = (method, productId) => {
  track('select_payment', { method, product_id: productId });
};

// ✅ 创建订单成功
export const trackOrderCreated = (orderId, productId, country, price) => {
  track('order_created', { order_id: orderId, product_id: productId, country, price });
};

// 📋 复制订单号（表示用户准备付款）
export const trackCopyOrderId = (orderId) => {
  track('copy_order_id', { order_id: orderId });
};

// 🤖 联系 Bot 付款
export const trackContactBot = (orderId) => {
  track('contact_bot_pay', { order_id: orderId });
};

// 🔍 搜索国家
export const trackSearch = (keyword) => {
  track('search', { keyword });
};

// 🌍 点击国家分类
export const trackClickCategory = (category) => {
  track('click_category', { category });
};
