# Smart English — K12 AI 英语学习平台

## 快速开始

### 1. 启动数据库
```bash
docker-compose up -d
```

### 2. 后端
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env  # 编辑配置
alembic upgrade head
uvicorn app.main:app --reload
```
访问 http://localhost:8000/docs 查看 API 文档。

### 3. 前端
```bash
cd frontend
npm install
npm run dev
```
访问 http://localhost:3000
# smart-english
