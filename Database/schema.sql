-- HKUPlan 数据库结构 v2（算法对接版）
-- 与 v1 的主要区别：
--   1. sections 改用自增主键 + UNIQUE(term_id, course_code, class_section)
--      （原因：HKU 的 CLASS NUMBER 在不同学期会重复使用，3907 个编号跨学期指向不同课程，
--        v1 用 class_number 做主键导致约一半 section 被 INSERT IGNORE 静默丢弃）
--   2. term 从 meetings 移到 sections，并新增 terms 表
--   3. 时间存为“分钟数”（09:30 → 570），星期存为 1-7（周一=1），算法直接使用无需转换
--   4. 预留 credits / seats / waitlist 字段（HKU 课表 Excel 没有这些数据，可为 NULL）
--   5. 新增 saved_schedules（保存方案 / 分享链接）

SET NAMES utf8mb4;

DROP TABLE IF EXISTS saved_schedules;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS terms;

CREATE TABLE terms (
  term_id     VARCHAR(20)  PRIMARY KEY,            -- '2026-27-S1' / '2026-27-S2' / '2026-27-SU'
  term_name   VARCHAR(50)  NOT NULL UNIQUE,        -- 原始名称 '2026-27 Sem 1'
  start_date  DATE,                                -- 由导入脚本按该学期最早/最晚上课日期计算
  end_date    DATE,
  sort_order  TINYINT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE courses (
  course_code   VARCHAR(20)  PRIMARY KEY,
  course_title  VARCHAR(255) NOT NULL,
  offer_dept    VARCHAR(255),
  acad_career   VARCHAR(10),                       -- UG / TPG / RPG / UGME / UGDE
  credits       TINYINT      NULL,                 -- Excel 无此列，后续补充
  FULLTEXT KEY ft_title (course_title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sections (
  section_id      INT          AUTO_INCREMENT PRIMARY KEY,
  term_id         VARCHAR(20)  NOT NULL,
  course_code     VARCHAR(20)  NOT NULL,
  class_section   VARCHAR(20)  NOT NULL,           -- '1A' / '2B' / 'FA' / 'SA' / '1AX'
  class_number    INT,                             -- HKU 编号，仅在同一学期内唯一
  section_type    VARCHAR(10)  NOT NULL DEFAULT 'CLASS',  -- HKU 数据不区分 LEC/TUT，一个 section 即一整套课
  parent_section  VARCHAR(20)  NULL,               -- 预留：若将来有导修绑定讲座
  seats_total     INT          NULL,
  seats_left      INT          NULL,
  waitlist_open   BOOLEAN      NULL,
  waitlist_count  INT          NULL,
  UNIQUE KEY uq_section (term_id, course_code, class_section),
  KEY idx_course (course_code),
  FOREIGN KEY (term_id)     REFERENCES terms(term_id),
  FOREIGN KEY (course_code) REFERENCES courses(course_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE meetings (
  meeting_id   INT       AUTO_INCREMENT PRIMARY KEY,
  section_id   INT       NOT NULL,
  day_of_week  TINYINT   NULL,                     -- 1=周一 … 7=周日；NULL = 时间待定(TBA)
  start_min    SMALLINT  NULL,                     -- 距 00:00 的分钟数
  end_min      SMALLINT  NULL,
  start_date   DATE      NOT NULL,                 -- 该时段的第一次上课日期
  end_date     DATE      NOT NULL,                 -- 该时段的最后一次上课日期
  venue        VARCHAR(100),
  KEY idx_section (section_id),
  FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE instructors (
  instructor_id    INT          AUTO_INCREMENT PRIMARY KEY,
  section_id       INT          NOT NULL,
  instructor_name  VARCHAR(255) NOT NULL,
  UNIQUE KEY uq_inst (section_id, instructor_name),
  FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE saved_schedules (
  schedule_id   INT          AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NULL,                 -- 游客为 NULL（配合 share_token 使用）
  term_id       VARCHAR(20)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  section_keys  JSON         NOT NULL,             -- ["COMP3322:1A","MATH1013:1B"]，读取时按最新数据重建
  blocked       JSON         NULL,                 -- 用户自定义屏蔽时段
  prefs         JSON         NULL,
  share_token   CHAR(22)     NULL UNIQUE,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (term_id) REFERENCES terms(term_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
