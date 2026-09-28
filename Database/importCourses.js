const mysql = require("mysql2/promise");
const courses = require("./HKU_timetable_2026-2027.json");

async function importData() {
    const db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "rootpassword",
        database: "hkuplanner",
    });

    console.log("Connected to MySQL");

    for (const course of courses) {
        try {
            /*
             * Insert course
             */
            await db.execute(
                `
                INSERT IGNORE INTO courses (
                    course_code,
                    course_title,
                    offer_dept,
                    acad_career
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    course["COURSE CODE"],
                    course.COURSE_TITLE,
                    course.OFFER_DEPT,
                    course.ACAD_CAREER,
                ]
            );

            /*
             * Insert section
             */
            await db.execute(
            `
            INSERT IGNORE INTO sections (
                class_number,
                term,
                course_code,
                class_section
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                 course.CLASS_NUMBER,
                 course.TERM,
                 course["COURSE CODE"],
                 course["CLASS SECTION"],
            ]
            );

            /*
             * Insert instructors
             */
            if (course.INSTRUCTORS) {
                for (const instructor of course.INSTRUCTORS) {
			
			await db.execute(
                        `
                        INSERT IGNORE INTO instructors (
                            class_number,
                            term,
                            instructor_name
                        )
                        VALUES (?, ?, ?)
                        `,
                        [
                            course.CLASS_NUMBER,
                            course.TERM,
                            instructor,
                        ]
                    );
                }
            }

            /*
             * Insert meetings
             */
            if (course.MEETINGS) {
                for (const meeting of course.MEETINGS) {
                    await db.execute(
                        `
                        INSERT IGNORE INTO meetings (
                            class_number,
                            term,
                            start_date,
                            end_date,
                            day,
                            start_time,
                            end_time,
                            venue
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            course.CLASS_NUMBER,
                            course.TERM,

                            course.START_DATE,
                            course.END_DATE,

                            meeting.DAY,
                            meeting.START_TIME,
                            meeting.END_TIME,
                            meeting.VENUE,
                        ]
                    );
                }
            }

            console.log(
                `Imported ${course["COURSE CODE"]} ${course["CLASS SECTION"]}`
            );

        } catch (err) {
            console.error(
                `Error importing ${course["COURSE CODE"]} ${course["CLASS SECTION"]}:`,
                err.message
            );
        }
    }

    await db.end();

    console.log("Import completed");
}

importData();