# Doc Extractor

基于 Anything-Extract 的"路由薄 + Service 编排 + 异步任务状态流转"思路，对当前项目做了可运行的最小工程化升级。

## 已完成能力

- **后端（FastAPI）**
  - 上传接口：`POST /api/upload`
  - 抽取任务接口：`POST /api/extract`
  - 任务状态查询：`GET /api/extract/{task_id}/status`
  - 任务列表：`GET /api/extract`
  - 状态流转：`pending -> processing -> completed/failed`
  - Service 层：`app/services/extraction_service.py`
- **前端（Next.js）**
  - 持久化顶部导航栏，所有页面共享
  - 首页（功能概览 + 快速入口）
  - 抽取工作台（文件上传 + 标签配置 + 任务提交）
  - 结果查询（任务状态实时轮询 + 抽取结果表格展示）
  - 设置与帮助（占位页，展示后续配置项入口）
  - 统一视觉设计系统（CSS 变量 + 卡片化布局 + 响应式）
  - 可复用组件：`Header`、`StatusBadge`、`FeatureCard`
  - 共享 API 客户端：`frontend/lib/api.ts`

## 目录结构

```txt
backend/
  app/
    main.py
    store.py
    services/
      extraction_service.py
    routes/
      health.py
      upload.py
      extract.py
  tests/
    test_health.py
    test_extract.py
frontend/
  app/
    layout.tsx          # 根布局，集成 Header 导航
    page.tsx            # 首页：功能概览、快速入口
    globals.css         # 全局样式系统
    upload/page.tsx     # 抽取工作台：文件上传与标签配置
    results/page.tsx    # 结果查询：任务状态轮询与结果展示
    settings/page.tsx   # 设置与帮助（占位页）
  components/
    Header.tsx          # 持久化顶部导航
    StatusBadge.tsx     # 任务状态徽标组件
    FeatureCard.tsx     # 功能卡片组件
  lib/
    api.ts              # 后端 API 客户端
storage/
  uploads/
```

## 前端页面说明

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 产品介绍、功能卡片概览、快速跳转入口 |
| 抽取工作台 | `/upload` | 上传 PDF/DOCX 文件，配置抽取标签，提交任务 |
| 结果查询 | `/results?task_id=xxx` | 查看指定任务的状态与抽取结果，自动轮询 |
| 设置与帮助 | `/settings` | 占位页，展示 API 配置、引擎切换、Webhook 等后续功能入口 |

> 标注为 **Placeholder** 或 **即将推出** 的功能尚未对接后端，仅作 UI 展示。

## 本地运行

### 1) 启动后端

```powershell
cd D:\work\doc-extractor\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2) 启动前端（开发模式）

```powershell
cd D:\work\doc-extractor\frontend
npm install
npm run dev
```

### 3) 前端构建（生产验证）

```powershell
cd D:\work\doc-extractor\frontend
npm run build   # 生成 .next 产物
npm run start   # 以生产模式启动（端口 3000）
```

访问：
- 前端：`http://localhost:3000`
- 后端健康检查：`http://localhost:8000/api/health`

### 4) 联调流程

1. 打开 `http://localhost:3000/upload`
2. 上传 PDF/DOCX 并输入标签（如 `name,date,amount`）
3. 提交后跳转 `/results?task_id=xxx`
4. 页面自动轮询任务状态并展示抽取结果

## 测试与构建验证

### 后端测试

```powershell
cd D:\work\doc-extractor\backend
.venv\Scripts\activate
python -m pytest tests -v
```

### 前端构建

```powershell
cd D:\work\doc-extractor\frontend
npm run build
```

## 说明

当前抽取逻辑为开发占位（模拟解析 + 自动填充标签结果），后续可在 `extraction_service.py` 中替换为真实 OCR / PDF 解析 / 向量检索流程。
