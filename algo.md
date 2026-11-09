# HKUPlan （v3）

## File directory
```
scheduler/                      ← 仓库根目录，与 Database/ 同级（前端、后端共用同一份，零依赖）
  scheduler.js                    核心算法
  validate.js                     数据校验
  export.js                       FullCalendar 事件 / 打印表格 / CSV / .ics 导出
  package.json                    ESM 模块声明
  INTERFACE.md                    ★ 接口

Database/                       ← 新增 5 个文件
  courseRepository.js             SQL 查询层
  courseMapper.js                 纯函数：数据库行 → 算法结构（"MON"/"09:00" → 1/570）
  scheduleRoutes.js               Express 路由
  db.js                           MySQL 连接池
  .env.example                    环境变量模板

对接说明.md
```

## Backend
1. `npm install express mysql2`，按 `.env.example` 配好环境变量
2. `app.use('/api', require('./Database/scheduleRoutes'))`
3. 可用接口：`GET /api/terms`、`GET /api/courses?term=&q=`、`POST /api/schedules/generate`（请求/响应结构见 INTERFACE.md）

## Frontend
```js
import { generateSchedules, detectConflicts } from '../scheduler/scheduler.js';
import { toFullCalendarEvents, toPrintRows, toICS } from '../scheduler/export.js';
```
- 手动选课实时标红 → `detectConflicts(selected, blocked)`
- 周课表渲染 → `toFullCalendarEvents(schedule, termInfo, blocked)`，屏蔽时段自动渲染为灰色背景
- 生成全部方案 → 调 `POST /api/schedules/generate`（屏蔽时间/锁定/排除/偏好参数见 INTERFACE.md 第 3 节）

## 新增能力（2026-11-02，本地未提交）

- 个人事件：`blocked` 支持 `{day,start,end}` 每周重复、`{date,start,end}` 一次性、`{day,startDate,endDate,...}` 限定区间；`hard:false` 只扣分不过滤。生成结果新增 `eventImpact`，按课程列出被个人事件排除的 section。
- 标签：`sectionTags(section)` / `scheduleTags(schedule,{blocked})` 从课表事实推导标签（早课/晚课/周末/分段/换场地/TBA/名额/空档/事件冲突）；学生的自定义标签只存浏览器 localStorage。
- 导出：`buildICS(schedule, termInfo, {now, alarmMinutes})` 返回 `{text,eventCount,tbaCount,skippedTba}`，UID 为内容哈希（稳定、短），含 `DESCRIPTION`；`calendarFileName` 生成纯 ASCII 文件名。前端「Export .ics」下载后在 Google 日历「设置 → 导入和导出」导入，导入是一次性拷贝。
