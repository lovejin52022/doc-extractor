# doc-extractor 📄

高效文档识别&知识库&本地启动，前后端；整合 QAnything、dify 等思想和源码，快速批量可靠提取文档关键信息并导出。

## ✨ 特性

- 📄 **多格式支持**：支持 PDF 和 Word 文档解析
- 🏷️ **灵活标签配置**：支持单选、多选、填空三种标签类型
- 🔍 **高级检索方案**：集成 Multi-Query Retrieval、HyDE、ParentDocumentRetriever、RERANK、ES BM25 等
- 🤖 **本地化部署**：默认使用 Ollama + LanceDB，完全本地运行
- 🎯 **结构化输出**：基于用户配置的标签，LLM 返回结构化数据

## 🏗️ 技术栈

- **后端**: Python + FastAPI + LangChain
- **前端**: Next.js + TypeScript + Tailwind CSS
- **向量数据库**: LanceDB（默认）
- **LLM/Embedding**: Ollama（默认，可扩展）
- **文档解析**: QAnything OCR/PDF 服务

## 🚀 快速启动

### Docker 方式（推荐）

```bash
# 一键启动全部服务
./docker_run.sh --full

# 或
docker compose -f docker-compose-win.yaml up
```

访问地址：
- 前端：http://localhost:3001
- 后端 API：http://localhost:8888

### 本地安装方式

```bash
# 1. 安装依赖
./install.sh  # Linux/Mac
install.bat   # Windows

# 2. 创建虚拟环境并安装后端依赖
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 3. 安装前端依赖
cd frontend
npm install

# 4. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置 Ollama 等

# 5. 启动服务
./start.sh  # Linux/Mac
start.bat   # Windows
```

## 📁 项目结构

```
doc-extractor/
├── backend/          # Python FastAPI 后端
│   ├── app/          # FastAPI 应用
│   ├── core/         # 核心业务逻辑（责任链模式）
│   ├── services/     # 文档解析、向量化、提取服务
│   └── models/       # 数据模型
├── frontend/         # Next.js 前端
│   ├── app/          # Next.js App Router
│   └── components/   # React 组件
├── docker/           # Docker 构建文件
├── dependent_server/ # QAnything OCR/PDF 服务（内置）
├── storage/          # 数据存储
│   ├── lancedb/     # 向量数据库
│   ├── documents/   # 解析后的文档
│   └── uploads/     # 上传文件
└── docs/             # 文档
```

## 📚 系统架构

详细架构请参考 [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 📄 License

MIT License
