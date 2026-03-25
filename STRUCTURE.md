# Mini App 结构导图

## 页面结构

```
App (HashRouter)
├── / → Home（首页）
├── /products → ProductList（套餐列表）
├── /product/:id → ProductDetail（套餐详情）
├── /checkout/:id → Checkout（下单支付）
└── /orders → Orders（我的订单）
```

---

## 套餐列表页 /products

```
ProductList
├── 🔥 热门国家 Tab
│   ├── [第一层] 国家网格（24个国旗图标）
│   │   TH泰国 JP日本 SG新加坡 MY马来西亚 KR韩国
│   │   HK香港 TW台湾 ID印尼 VN越南 PH菲律宾
│   │   CN中国 MO澳门 LK斯里兰卡 IN印度 AE阿联酋
│   │   GB英国 FR法国 DE德国 IT意大利 ES西班牙
│   │   US美国 AU澳大利亚 CA加拿大 NZ新西兰
│   └── [第二层] 点击国旗 → 该国所有套餐列表
│
├── 🗺️ 区域套餐 Tab
│   ├── [第一层] 七大洲网格
│   │   🌏亚洲 🏛️欧洲 🕌中东 🌍非洲 🌎美洲 🏝️大洋洲 🗺️其他
│   └── [第二层] 点击区域 → 该区域套餐列表
│
└── 🌐 全球套餐 Tab
    ├── 📶 纯数据（只有流量）
    └── 📞 数据+通话（流量+语音+短信）
```

---

## 数据流

```
供应商API (ciuh32wky.xigrocoltd.com)
    ↓ 定期同步
products-cache.json（本地预处理，581个产品）
    ↓ 构建时打包
Mini App（首屏秒开，无需API请求）
    ↓ 用户下单时
Bot后端 → 供应商API下单 → 获取eSIM激活码 → 发二维码给用户
```

---

## 产品分类逻辑

| 类型 | 判断条件 | 显示位置 |
|------|---------|---------|
| 单国套餐 | countries.length === 1 | 热门国家 |
| 区域套餐 | type=regional 或 2≤countries≤30 | 区域套餐 |
| 全球套餐 | type=global 或 countries>30 | 全球套餐 |
| 含通话 | thirdPartyData.voice 有值 | 全球→含通话 |
| 含短信 | thirdPartyData.text 有值 | 全球→含短信 |

---

## 关键文件

```
src/
├── pages/
│   ├── Home.jsx          首页（热门推荐）
│   ├── ProductList.jsx   套餐列表（主要页面）
│   ├── ProductDetail.jsx 套餐详情
│   ├── Checkout.jsx      下单支付
│   └── Orders.jsx        我的订单
├── components/
│   ├── ProductCard.jsx   产品卡片组件
│   ├── CategoryBar.jsx   分类标签栏
│   └── BottomNav.jsx     底部导航
├── hooks/
│   └── useProducts.js    产品数据Hook（读本地缓存）
├── utils/
│   └── format.js         格式化工具（getCountryName等）
├── api/
│   └── esim.js           供应商API客户端
└── data/
    └── products-cache.json  本地产品缓存（581个，161KB）
```

---

## 待完善

- [ ] 中英文切换
- [ ] 首页热门推荐改为动态（按销量）
- [ ] 产品搜索支持英文国家名
- [ ] 更多国家加入热门列表
