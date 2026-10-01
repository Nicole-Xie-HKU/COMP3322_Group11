# HKUPlan — Group 11

React + Express + MySQL 的 HKU 排课工具。

## 启动

先启动 Docker Desktop，在项目根目录运行：

```sh
cp .env.example .env
docker compose up --build -d
```

打开 http://localhost:3001。首次启动自动建表、导入课程。

## 开发前端

保持 Docker 运行；Node.js 22.12+：

```sh
npm run setup
npm run dev
```

打开 http://localhost:5173，修改 `frontend/src/`，自动刷新。

## 常用命令

```sh
npm test                       # 算法检查
npm run test:integration        # 接口检查，需运行 Docker
npm run build                  # 构建前端
docker compose logs -f app     # 查看日志
docker compose stop           # 停止服务，保留数据
```

项目结构、接口和功能见 [PROJECT.md](PROJECT.md)。
