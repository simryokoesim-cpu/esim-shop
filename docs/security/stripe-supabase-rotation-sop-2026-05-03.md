# Stripe / Supabase 安全轮换 SOP

更新时间：2026-05-03 Asia/Shanghai

范围：Stripe Secret Key、Supabase Service Role Key / PAT。本文只写流程与验证，不记录 secret 原值。

## 通用红线

- 不在聊天、commit、日志、PM2 env dump 中输出 secret 原值。
- 不用真实下单、真实扣款、真实发货做验证。
- 新 secret 先进入受控 secret manager / Vercel env / 本地 0600 sealed copy，再验证。
- 每一步必须有 rollback 入口：旧 key 在确认新 key 完全生效前不要立即销毁。
- 所有验证默认只读。

## Stripe Secret Key 轮换

### 需要 Mk/平台确认的步骤

1. Stripe Dashboard 登录 2FA / 手机验证码：需要 Mk 或已授权管理员完成。
2. 创建或 reveal 新 Secret Key：需要 Stripe 管理后台权限。
3. 确认旧 key 的 revoke 时间点：需要 Mk 明确，因为 revoke 后所有旧环境立即失效。

### K 可执行步骤

1. 接收新 key：只写入受控 secret manager / Vercel env / 本地 sealed copy，不进入聊天。
2. 更新生产环境变量：`STRIPE_SECRET_KEY`。
3. 只读验证：`GET https://api.stripe.com/v1/balance`。
4. 检查代码引用：当前 `bot-sal.js` 读取 `STRIPE_SECRET_KEY`。
5. 如果有依赖该 key 的运行进程，按受控窗口 restart；未确认前不随意启动已停止 bots。
6. 验证通过后，Mk 在 Stripe 后台 revoke 旧 key。

### 验收标准

- `verify:secrets -- --stripe --live` 返回 `ok: true`、HTTP 200。
- 不产生 PaymentIntent / Charge / Refund。
- 旧 key revoke 后，生产支付相关只读/初始化链路不报 401。

## Supabase Service Role / PAT 轮换

### 需要 Mk/平台确认的步骤

1. Supabase Dashboard 登录 2FA / 邮箱验证：需要 Mk 或已授权管理员完成。
2. Regenerate service role key / PAT：需要项目 Owner/Admin 权限。
3. 确认旧 key revoke 时间点：service role 权限极高，建议新 key 全面生效后再撤旧。

### K 可执行步骤

1. 接收新 key：只写入受控 secret manager / Vercel env / 本地 sealed copy，不进入聊天。
2. 更新 Vercel `mini-app` env：`SUPABASE_SERVICE_KEY` production + preview。
3. 更新本地/PM2 依赖：`SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_KEY` / `ESIM_SUPABASE_PAT`。
4. 只读验证：REST `miniapp_orders?select=id&limit=1`。
5. 生产验证：订单查询/创建接口在 forged auth 下仍 403；合法 initData 用户只访问自身订单。
6. 验证通过后，再 revoke 旧 service role / PAT。

### 验收标准

- `verify:secrets -- --supabase --live` 返回 `ok: true`、HTTP 200。
- forged initData 仍 403，不因 key 更新变成 500。
- 不写 DB、不创建订单、不改 RLS。

## 推荐执行顺序

1. Stripe：先创建新 key，不 revoke old。
2. 更新 env + 只读验证。
3. Supabase：创建新 service role/PAT，不 revoke old。
4. 更新 env + 只读验证。
5. 生产 smoke / forged negative test。
6. Mk 确认后，在平台后台 revoke old keys。

## 需要 Mk 参与清单

- Stripe 登录 2FA / 创建新 secret / 最终 revoke old key。
- Supabase 登录 2FA / regenerate service role 或 PAT / 最终 revoke old key。
- 若平台要求短信、人脸、邮箱安全确认，由 Mk 完成一次性验证。
