// 示例数据（虚构的时间/名额，仅用于测试；真实数据由数据库组提供）
import { toMin } from './scheduler.js';
const M = (day, s, e, venue, extra = {}) => ({ day, start: toMin(s), end: toMin(e), venue, ...extra });

export const TERMS = [   // 学期日期为示例，需以 HKU 官方校历为准
  { id: '2026-27-S1', name: '2026-27 第一学期', startDate: '2026-09-01', endDate: '2026-11-30' },
  { id: '2026-27-S2', name: '2026-27 第二学期', startDate: '2027-01-18', endDate: '2027-05-01' },
  { id: '2026-27-SU', name: '2026-27 暑期学期', startDate: '2027-06-07', endDate: '2027-08-07' },
];

export const COURSES = [
  { code: 'COMP3322', title: 'Modern Technologies on World Wide Web', credits: 6, offerings: [
    { term: '2026-27-S1', sections: [
      { id: '1A', type: 'LEC', instructor: 'Dr. A', seatsLeft: 12, waitlist: { open: true, count: 0 },
        meetings: [M(1, '09:30', '10:20', 'MWT1'), M(4, '09:30', '11:20', 'MWT1')] },
      { id: 'T1', type: 'TUT', parent: '1A', seatsLeft: 5, meetings: [M(2, '13:30', '14:20', 'CB308')] },
      { id: 'T2', type: 'TUT', parent: '1A', seatsLeft: 0, waitlist: { open: true, count: 3 }, meetings: [M(5, '16:30', '17:20', 'CB309')] },
      { id: 'T3', type: 'TUT', parent: '1A', seatsLeft: 8, meetings: [M(3, '12:00', '12:50', 'CB310')] },
    ]},
    { term: '2026-27-S2', sections: [
      { id: '2A', type: 'LEC', instructor: 'Dr. A', seatsLeft: 40, meetings: [M(2, '14:30', '16:20', 'LE1')] },
    ]},
  ]},
  { code: 'COMP3230', title: 'Principles of Operating Systems', credits: 6, offerings: [
    { term: '2026-27-S1', sections: [
      { id: '1A', type: 'LEC', instructor: 'Dr. B', seatsLeft: 0, waitlist: { open: false }, meetings: [M(1, '09:30', '10:20', 'KK101')] },
      { id: '1B', type: 'LEC', instructor: 'Dr. C', seatsLeft: 20, meetings: [M(3, '14:30', '16:20', 'KK102')] },
      { id: 'L1', type: 'LAB', parent: '1B', seatsLeft: 10, meetings: [M(5, '09:30', '11:20', 'HW311')] },
      { id: 'L2', type: 'LAB', parent: '1B', seatsLeft: 10, meetings: [M(2, '10:30', '12:20', 'HW311')] },
    ]},
  ]},
  { code: 'MATH3603', title: 'Probability Theory', credits: 6, offerings: [
    { term: '2026-27-S1', sections: [
      { id: '1A', type: 'LEC', instructor: 'Dr. D', seatsLeft: 30, meetings: [M(2, '13:30', '15:20', 'RR101')] },
      { id: '1C', type: 'LEC', instructor: 'Dr. E', seatsLeft: 30, meetings: [M(2, '13:30', '15:20', 'RR102')] },
      { id: '1D', type: 'LEC', instructor: 'Dr. F', seatsLeft: 30, meetings: [M(4, '16:30', '18:20', 'RR103')] },
    ]},
  ]},
  { code: 'CCST9001', title: 'Common Core (半学期课示例)', credits: 6, offerings: [
    { term: '2026-27-S1', sections: [
      { id: '1A', type: 'LEC', seatsLeft: 50, meetings: [M(4, '09:30', '11:20', 'CPD', { startDate: '2026-10-19', endDate: '2026-11-30' })] },
    ]},
  ]},
  { code: 'ECON1210', title: 'Introductory Microeconomics', credits: 6, offerings: [
    { term: '2026-27-SU', sections: [
      { id: 'S1', type: 'LEC', seatsLeft: 60, meetings: [M(1, '09:30', '12:20', 'KKLG'), M(3, '09:30', '12:20', 'KKLG')] },
    ]},
  ]},
];
