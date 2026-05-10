# ENV Rotation Map — SimRyoko Miniapp / Bots

更新时间：2026-05-03 Asia/Shanghai

范围：只列变量名、用途和代码引用位置；不记录 secret 原值。

## 第一优先级：资金 / 真实下单风险

| 资产 | ENV 名 | 引用位置 | 只读验证方式 |
|---|---|---|---|
| 供应商账号 | `ESIM_API_USERNAME` / `ESIM_API_USER` / `ESIM_USER` | `api/products.js`, `simryoko-bot.js`, `bot-sal.js`, `kefu-bot.js`, `esim-sale1-bot.js`, `esim-dlzx-bot.js`, `payment-monitor.js`, `auto-delivery.js` | `npm run verify:secrets -- --supplier --live`：登录 + `/agent/info`，不下单 |
| 供应商密码 | `ESIM_API_PASSWORD` / `ESIM_API_PASS` / `ESIM_PASS` | 同上 | 同上 |
| 供应商真实下单闸门 | `SUPPLIER_ORDER_ENABLED`, `SUPPLIER_ORDER_ALLOW_RETRY` | `bot-sal.js` | 不在轮换脚本中开启；保持 fail-closed |
| Stripe Secret | `STRIPE_SECRET_KEY` | `bot-sal.js` | `npm run verify:secrets -- --stripe --live`：GET `/v1/balance` |

## 第二优先级：数据库 / 后台写权限

| 资产 | ENV 名 | 引用位置 | 只读验证方式 |
|---|---|---|---|
| Supabase URL | `SUPABASE_URL` / `ESIM_SUPABASE_PROJECT_URL` | `api/v1/orders.js`, `agent-auto-approve.js`, `agent-auto-withdrawal.js`, `order-auto-refund.js`, `payment-monitor.js`, `esim-dlzx-bot.js`, PM2 configs | `npm run verify:secrets -- --supabase --live`：REST `miniapp_orders?select=id&limit=1` |
| Supabase service key / PAT | `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_KEY` / `ESIM_SUPABASE_PAT` | 同上 | 同上 |

## 第三优先级：Telegram 资产控制权

| 资产 | ENV 名 | 引用位置 | 只读验证方式 |
|---|---|---|---|
| Miniapp / SimRyoko bot token | `MINIAPP_BOT_TOKEN` / `SIMRYOKO_BOT_TOKEN` / `TG_BOT_TOKEN` / `BOT_TOKEN` | `api/_telegramAuth.js`, `simryoko-bot.js`, `bot-sal.js` | `npm run verify:secrets -- --telegram --live`：`getMe` |
| Sales bot token | `ESIM_SAL_BOT_TOKEN` | `bot-sal.js`, `kefu-bot.js` | Telegram `getMe`（单独设置后验证） |
| Customer service bot token | `ESIM_SALE1_BOT_TOKEN`, `KEFU_BOT_TOKEN` | `esim-sale1-bot.js`, `kefu-bot.js`, PM2 configs | Telegram `getMe`（单独设置后验证） |
| Admin bot token | `ADMIN_BOT_TOKEN`, `ESIM_DLZX_BOT_TOKEN` | `esim-dlzx-bot.js`, PM2 configs, payment/agent scripts | Telegram `getMe`（单独设置后验证） |

## 平台 / AI / 付款展示

| 资产 | ENV 名 | 引用位置 | 注意 |
|---|---|---|---|
| AI provider key | `KEFU_OR_KEY`, `DASHSCOPE_KEY`, `DASHSCOPE_KEY_SALE1` | `ai-fallback.js`, `kefu-bot.js`, `esim-dlzx-bot.js`, `esim-sale1-bot.js` | 轮换不影响资金，但影响客服可用性 |
| 收款地址 | `USDT_ADDRESS`, `TON_ADDRESS`, `ESIM_USDT_ADDRESS`, `ESIM_TON_ADDRESS` | `bot-sal.js`, `payment-monitor.js`, PM2 configs | 地址非 secret，但必须防篡改；轮换前需 Mk 明确确认 |
| TronGrid | `TRONGRID_API_URL` | `payment-monitor.js`, `pm2-payment.config.js` | 只读链上查询 |

## 验证脚本

- 文件：`scripts/verify-secrets.mjs`
- npm：`npm run verify:secrets`
- 默认只检查变量存在性，不联网。
- 联网只读验证需显式加 `--live`。
- 不输出 secret 原值，只输出 present/length/status。
- 不创建订单、不写 DB、不注册 webhook、不重启服务。

示例：

```bash
npm run verify:secrets
npm run verify:secrets -- --supplier --live
npm run verify:secrets -- --supabase --live
npm run verify:secrets -- --stripe --live
npm run verify:secrets -- --telegram --live
```

## 建议轮换顺序

1. 供应商账号/密码：资金流出源头；轮换后只读验证 login + balance/info。
2. Stripe Secret：支付资金权限；轮换后只读验证 balance。
3. Supabase service role / PAT：数据读写权限；轮换后只读验证 REST select。
4. Telegram bot tokens：品牌和消息资产；最后做，避免 webhook/polling 切换造成客服中断。

## 禁止项

- 不用生产 POST 下单做测试。
- 不打开 `SUPPLIER_ORDER_ENABLED=true` 来验证密钥。
- 不 dump PM2 全量 env 到聊天或日志。
- 不把新 secret 写进 docs/memory；只写 vault/secret-manager 引用。
