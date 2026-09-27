const mysql = require("mysql2/promise");
const courses = require("./HKU_timetable_2026-2027.json");

async function importData() {

    const db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "rootpassword",
        database: "hkuplanner"
    });

    console.log("Connected to MySQL");

    for (const course of courses) {

        try {

            /*
             * Insert course
             */
            await db.execute(
                `
                INSERT IGNORE INTO courses
                (
                    course_code,
                    course_title,
                    department,
                    academic_career
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    course["COURSE CODE"],
                    course.COURSE_TITLE,
                    course.OFFER_DEPT,
                    course.ACAD_CAREER
                ]
            );

            /*
             * Insert section
             */
            await db.execute(
                `
                INSERT IGNORE INTO sections
                (
                    class_number,
                    course_code,
                    class_section
                )
                VALUES (?, ?, ?)
                `,
                [
                    course.CLASS_NUMBER,
                    course["COURSE CODE"],
                    course["CLASS SECTION"]
                ]
            );

            /*
             * Insert instructors
             */
            if (course.INSTRUCTORS) {

                for (const instructor of course.INSTRUCTORS) {

                    await db.execute(
                        `
                        INSERT INTO instructors
                        (
                            class_number,
                            instructor_name
                        )
                        VALUES (?, ?)
                        `,
                        [
                            course.CLASS_NUMBER,
                            instructor
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
                        INSERT INTO meetings
                        (
                            class_number,
                            term,
                            start_date,
                            end_date,
                            day_of_week,
                            start_time,
                            end_time,
                            venue
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            course.CLASS_NUMBER,
                            course.TERM,

                            meeting.START_DATE ||
                            course.START_DATE,

                            meeting.END_DATE ||
                            course.END_DATE,

                            meeting.DAY,
                            meeting.START_TIME,
                            meeting.END_TIME,
                            meeting.VENUE
                        ]
                    );

                }

            }

            console.log(
                `Imported ${course["COURSE CODE"]} ${course["CLASS SECTION"]}`
            );

        } catch (err) {

            console.error(
                `Error importing ${course["COURSE CODE"]}`,
                err.message
            );

        }

    }

    await db.end();

    console.log("Import completed");

}

importData();