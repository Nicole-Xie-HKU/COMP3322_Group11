# HKUPlan 排课算法模块 —— 接口约定（给前端 / 后端 / 数据库组）

负责人：算法组。模块位置建议：`shared/scheduler/`（纯 JS，无依赖，前后端都 import 同一份）

| 文件 | 作用 |
|---|---|
| `scheduler.js` | 冲突检测、生成方案、偏好打分、无解诊断 |
| `validate.js` | 输入数据校验（后端收到/拼好数据后调用，失败返回 HTTP 400） |
| `export.js` | 转 FullCalendar 事件、打印表格、CSV、.ics 日历 |
| `sample-data.js` | 示例数据（虚构，仅测试用） |
| `test.js` | `node test.js` 运行全部测试 |

## 1. 时间约定（所有人必须一致）
- `day`：1=周一 … 7=周日
- `start` / `end`：当天 0 点起的**分钟数**，09:30 → 570；区间左闭右开（10:20 下课与 10:20 上课不冲突）
- `startDate` / `endDate`：`YYYY-MM-DD`，可选；只在部分周上课（半学期课）时填写
- 时区：香港时间，不做时区转换

## 2. 算法输入：Course（后端从数据库拼成这个结构）
```js
{
  code: "COMP3322", title: "...", credits: 6,
  offerings: [{
    term: "2026-27-S1",                 // 学期 ID，见第 4 节
    sections: [{
      id: "1A", type: "LEC",            // LEC | TUT | LAB | SEM | OTH
      parent: null,                     // TUT/LAB 属于哪个 LEC subclass；null = 可自由搭配
      instructor: "Dr. A", campus: "Main",
      seatsLeft: 12,                    // null = 未知
      waitlist: { open: true, count: 3 },
      meetings: [{ day: 1, start: 570, end: 620, venue: "MWT1", startDate: null, endDate: null }]
    }]
  }]
}
```
规则：每门课的**每种 type 必须恰好选一个 section**；有 `parent` 的 section 只能和对应的 LEC 搭配。

## 3. 生成方案的选项
```js
generateSchedules(courses, {
  term: "2026-27-S1",                                  // 必填
  blocked: [{ day: 5, start: 0, end: 1440, label: "周五", hard: true }], // 用户屏蔽时段；hard:false = 尽量避开
  seatPolicy: "allowWaitlist",                         // openOnly | allowWaitlist | ignore
  locked:   { COMP3322: { TUT: "T3" } },               // 用户固定某个 section
  excluded: ["COMP3230-1A"],                           // 用户手动排除
  maxCredits: 36,                                      // 超出只警告
  prefs: { noMorningBefore: 600, noEveningAfter: 1110, avoidDays: [5], preferFreeDays: true,
           lunchBreak: { from: 720, to: 840, minutes: 60 }, minimizeGaps: true, weights: {} },
  maxResults: 100
})
```

## 4. 返回结构
```js
{
  term, totalCredits, warnings: [], skipped: [{ course, reason }],   // skipped = 该学期不开课
  total: 37, truncated: false,                                       // truncated = 组合太多，只返回前 N 个
  schedules: [{
    id: "COMP3230:1B,COMP3230:L1,...",   // 稳定 ID，用于保存/分享/去重
    score: -7.2, breakdown: [{ pts: -3, why: "周1 09:30 早课" }],   // 前端可显示“为什么排这个”
    credits: 18,
    sections: [{ ...原 section, courseCode, courseTitle, credits, seat: "open|waitlist|full", alternatives: ["1C"] }]
  }],
  diagnosis: [{ courses: ["A","B"], message: "..." }]  // 仅在无解时出现
}
```
`alternatives` = 与该 section 时间完全相同的其他 section（算法已合并，前端可显示“也可选 1C”）。

## 5. 建议的后端 API（算法组提供逻辑，后端组实现路由）
| 方法 | 路径 | 说明 | 状态码 |
|---|---|---|---|
| GET  | `/api/terms` | 学期列表 `{id,name,startDate,endDate}` | 200 |
| GET  | `/api/courses?term=&q=` | 搜索课程 | 200 / 400 |
| GET  | `/api/courses/:code?term=` | 课程详情（含 sections） | 200 / 404 |
| POST | `/api/schedules/generate` | body: `{term, courseCodes, blocked, prefs, locked, excluded, seatPolicy}` | 200 / 400（校验失败）/ 404（课程不存在） |
| POST | `/api/schedules` | 保存方案 `{term, name, sectionKeys, blocked}` | 201 / 400 / 401 |
| GET/PUT/DELETE | `/api/schedules/:id` | 查看/重命名/删除 | 200 / 401 / 403 / 404 |

注意：保存方案时**只存 section 的 key 列表**（`COMP3322:1A` 这类），不存完整数据；读取时按最新数据库数据重建，这样名额是最新的。

## 6. 建议的 MySQL 表（供数据库组参考）
```sql
terms(id VARCHAR PK, name, start_date DATE, end_date DATE)
courses(code VARCHAR PK, title, credits INT, faculty)
sections(id INT PK AI, course_code FK, term_id FK, section_code VARCHAR, type ENUM('LEC','TUT','LAB','SEM','OTH'),
         parent_section_code VARCHAR NULL, instructor, campus, seats_total INT, seats_left INT,
         waitlist_open BOOL, waitlist_count INT, UNIQUE(course_code, term_id, section_code))
meetings(id INT PK AI, section_id FK, day TINYINT, start_min SMALLINT, end_min SMALLINT, venue,
         start_date DATE NULL, end_date DATE NULL)
saved_schedules(id PK, user_id FK NULL, term_id FK, name, section_keys JSON, blocked JSON, share_token UNIQUE NULL, created_at)
```

## 7. 前端集成
- 实时手动选课：`detectConflicts(selectedSections, blocked)` → 返回冲突对，用于标红
- 显示：`toFullCalendarEvents(schedule, term, blocked)` → FullCalendar `timeGridWeek`，屏蔽时段显示为灰色背景
- 打印：`toPrintRows(schedule)` 渲染表格 + `window.print()` + `@media print` CSS
- 导出：`toCSV(schedule)`（Excel 可打开）、`toICS(schedule, term)`（导入 Google/Apple 日历）
- 生成的方案多时考虑放在 Web Worker 里跑
