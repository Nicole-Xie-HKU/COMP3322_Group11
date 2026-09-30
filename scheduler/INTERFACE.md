# HKUPlan 接口


| 文件 | 作用 |
|---|---|
| `scheduler.js` | 冲突检测、生成方案、偏好打分（可解释）、无解诊断 |
| `validate.js` | 输入数据校验（后端拼好数据后调用，失败返回 HTTP 500/400） |
| `export.js` | 转 FullCalendar 事件、打印表格、CSV、.ics 日历 |
| `INTERFACE.md` | 本文档 |

## 1. 数据模型与时间约定（所有人必须一致）
- **HKU 真实数据不分 LEC/TUT/LAB**：一个 sub-class（如 1A/1B）捆绑该课全部上课时段，
  **选课 = 每门课恰好选 1 个 sub-class**。
- `day`：1=周一 … 7=周日；`start`/`end`：当天 0 点起的**分钟数**（09:30 → 570）；
  区间左闭右开（10:20 下课与 10:20 上课**不冲突**）。
- `startDate`/`endDate`：`YYYY-MM-DD`，可选；半学期课/阅读周拆分时填写，
  日期范围不相交的时段不算冲突。
- `day`/时间为 NULL 的课（TBA，全库约 1159 个时段）不参与冲突检测。

## 2. 算法输入
```js
[{ code: "COMP3322", title: "...", credits: 6, creditsKnown: false,
   sections: [{ id: "1A", classNumber: 1234, instructor: "Dr. A",
     meetings: [{ day: 1, start: 570, end: 620, venue: "MWT1", startDate: "2026-09-01", endDate: "2026-11-26" }] }] }]
```

## 3. generateSchedules(courses, options)
```js
{ term: "2026-27 Sem 1",                              // 必填
  blocked: [{ day: 5, start: 540, end: 780, label: "周五上午", hard: true }], // hard:false = 尽量避开（扣分不淘汰）
  locked:  { MATH1013: "1E" },                        // 用户点名要的 sub-class
  excluded:["COMP3230-1B"],                           // 用户手动排除
  prefs: { noMorningBefore: 600, noEveningAfter: 1080, avoidDays: [5], preferFreeDays: true,
           lunchBreak: { from: 720, to: 840, minutes: 60 }, minimizeGaps: true, weights: {} },
  maxResults: 100, maxNodes: 500000 }                 // 防组合爆炸
```

## 4. 返回结构
```js
{ term, totalCredits, warnings: [], skipped: [{ course, reason }],
  total: 37, truncated: false,                        // truncated = 组合太多，按偏好只保留前 N
  schedules: [{
    id: "COMP3230:1B,COMP3322:1A",                    // 稳定 ID，保存/分享/去重用
    score: -3, breakdown: [{ pts: -3, why: "周1 09:30 早课" }],   // 可解释：为什么排这个
    credits: 12,
    sections: [{ ...原 section, courseCode, courseTitle, credits, alternatives: ["1C"] }] // 同时段其他班
  }],
  diagnosis: [{ courses: ["A","B"], message: "..." }] // 仅无解时出现
}
```

## 5. 后端 API（路由 `Database/scheduleRoutes.js`）
| 方法 | 路径 | 说明 | 状态码 |
|---|---|---|---|
| GET  | `/api/terms` | 学期列表 `{id,name}` | 200 |
| GET  | `/api/courses?term=&q=` | 搜索课程 | 200 / 400 |
| POST | `/api/schedules/generate` | body 见第 3 节 + `courseCodes` | 200 / 400 / 404 |


## 6. 数据库
- sections / meetings / instructors 一律按 `(class_number, term)` 关联、按 `term` 过滤
  —— `class_number` 跨学期复用，**单用 class_number 会串学期**。
- 时间列是 `HH:MM` 字符串、星期是 `MON` 等三字母，由 `courseMapper.js` 统一转换为分钟数和 1-7。
- 建议为查询加索引（可选，交给数据库组执行）：
```sql
ALTER TABLE sections    ADD INDEX idx_sec  (course_code, term);
ALTER TABLE meetings    ADD INDEX idx_meet (term, class_number);
ALTER TABLE instructors ADD INDEX idx_inst (term, class_number);
```

## 7. 前端
- 实时手动选课标红：`detectConflicts(selectedSections, blocked)`
- 显示：`toFullCalendarEvents(schedule, termInfo, blocked)` → FullCalendar `timeGridWeek`，屏蔽时段渲染为灰色背景事件
- 打印/导出：`toPrintRows` / `toCSV` / `toICS`（Google/Apple 日历可导入）
- 课程多时把 `generateSchedules` 放进 Web Worker
