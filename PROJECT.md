# 项目说明

HKUPlan 是 COMP3322 Group 11 的课程排课工具。`master` 基于 `algo/scheduler-v3`，保留 `main` 的数据库和最新排课算法；旧 `fix/database-v2` 的不同数据库结构未混入。

## 功能

- 选择学期，搜索课程或从下拉列表点选。
- 选择班次，生成无时间冲突的课表。
- 使用居中的 RESULT 和左右箭头切换方案。
- 点击课程或课表时段上的图钉，锁定当前班次并缩减结果；再次点击解除锁定。
- 保存方案到当前浏览器，重新打开或打印。

## 代码位置

| 路径 | 内容 |
| --- | --- |
| `frontend/src/App.jsx` | 页面、方案切换、锁定、保存 |
| `frontend/src/components/` | 搜索下拉、课程卡片、FullCalendar 课表 |
| `frontend/src/styles.css` | 样式和响应式布局 |
| `frontend/src/api.js` | 前端请求 |
| `Database/server.js` | Express 入口，提供 API 和构建后的前端 |
| `Database/courseRepository.js` | MySQL 查询 |
| `Database/setupDatabase.js` | 自动建表和导入，重复启动不重复写入 |
| `scheduler/` | 原有排课算法及导出工具 |

## 接口

| 请求 | 用途 |
| --- | --- |
| `GET /api/health` | 数据库连接检查 |
| `GET /api/terms` | 学期和日期范围 |
| `GET /api/courses?term=...&q=...` | 搜索；不填 q 可浏览前 30 门 |
| `GET /api/courses/:code?term=...` | 课程、班次和上课时间 |
| `POST /api/schedules/generate` | 生成方案 |

生成请求示例：

```json
{
  "term": "2026-27 Sem 1",
  "courseCodes": ["COMP3322", "COMP3230", "MATH1013"],
  "locked": { "COMP3230": "1A" },
  "maxResults": 100
}
```

每次最多 12 门课。一个 sub-class 包含该课全部时段；图钉锁定该班次。输入问题返回 400，未开课返回 404。详细算法约定见 `scheduler/INTERFACE.md`。

## 运行与范围

- React + Vite + Tailwind CSS + FullCalendar；Node.js + Express；MySQL 8；Docker Compose。
- 使用根目录 `docker-compose.yml`；`Database/` 中的是旧数据库单独启动配置。
- `.env` 不提交。Linux VM 部署时修改示例密码，设置 `APP_HOST=0.0.0.0` 和所需 `PORT`。公开部署地址待分配。
- 数据是团队提供的 2026–27 课表快照。TBA 时间不能检测冲突；不展示猜测学分或实时余位。
- MVP 不包含登录、云端保存、分享或偏好设置。保存使用当前浏览器 localStorage。
- 界面参考 [McGill VSB](https://vsb.mcgill.ca/criteria.jsp)，校徽来自 [HKU 官网](https://www.hku.hk/)。
