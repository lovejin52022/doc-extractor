# Doc Extractor

基于《技术方案》的文档抽取系统，当前已实现：
- FastAPI 后端：健康检查、文档上传、抽取任务创建与状态查询
- Next.js 前端：上传页（选文件 + 指定标签）、结果页（轮询任务状态）
- 内存态任务存储（开发阶段占位，后续替换为数据库）
- 最小测试覆盖（health + extract 主流程）

## 目录结构

```
backend/
  app/
    main.py                 # FastAPI 入口
    store.py                # 内存态任务存储
    models/
      task.py               # Pydantic 数据模型
    routes/
      health.py             # GET  /api/health
      upload.py             # POST /api/upload
      extract.py            # POST /api/extract  |  GET /api/extract/{task_id}/status
  tests/
    test_health.py
    test_extract.py
frontend/
  app/
    page.tsx                # 首页
    upload/page.tsx         # 上传 + 创建任务
    results/page.tsx        # 轮询任务状态 & 展示结果
storage/
  uploads/  lancedb/  documents/
```

## 本地运行

### 1) 后端

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2) 前端

```bash
cd frontend
npm install
npm run dev
```

前端默认监听 `http://localhost:3000`，通过 `next.config.ts` 中的 rewrites 将 `/api/*` 代理到后端 `http://localhost:8000`。

### 3) 一键启动（Windows）

```bash
start.bat
```

### 4) Docker

```bash
docker compose -f docker-compose-win.yaml up
```

## 运行测试

```bash
cd backend
.venv\Scripts\activate
python -m pytest tests/ -v
```

## 当前 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/upload` | 上传 PDF/DOCX，返回 `{id, filename}` |
| POST | `/api/extract` | 创建抽取任务，body: `{doc_id, labels[]}`，返回任务详情 |
| GET | `/api/extract/{task_id}/status` | 查询任务状态与结果 |
| GET | `/api/extract` | 列出所有任务 |
| POST | `/api/extract/{task_id}/mock-complete` | 开发占位：模拟任务完成 |

## 使用流程

1. 打开 `http://localhost:3000/upload`，选择文件并填写抽取标签
2. 提交后自动跳转到结果页，前端每 3 秒轮询任务状态
3. 开发阶段可手动调用 `POST /api/extract/{task_id}/mock-complete` 模拟任务完成

## 下一步建议

1. 接入 QAnything OCR/PDF 解析服务层（services）
2. 引入 LanceDB + Embedding 管线
3. 将内存态 TaskStore 替换为持久化存储
4. 实现真实的文档解析与标签抽取逻辑
