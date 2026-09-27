CREATE TABLE courses(
    course_code VARCHAR(20) PRIMARY KEY,
    course_title VARCHAR(255),
    offer_dept VARCHAR(255),
    acad_career VARCHAR(20)
);

CREATE TABLE sections(
    class_number INT PRIMARY KEY,
    course_code VARCHAR(20),
    class_section VARCHAR(20),

    FOREIGN KEY(course_code)
    REFERENCES courses(course_code)
);

CREATE TABLE meetings(
    meeting_id INT AUTO_INCREMENT PRIMARY KEY,

    class_number INT,

    term VARCHAR(50),

    start_date DATE,
    end_date DATE,

    day VARCHAR(10),

    start_time TIME,
    end_time TIME,

    venue VARCHAR(100),

    FOREIGN KEY(class_number)
    REFERENCES sections(class_number)
);

CREATE TABLE instructors(
    instructor_id INT AUTO_INCREMENT PRIMARY KEY,

    class_number INT,

    instructors VARCHAR(255),

    FOREIGN KEY(class_number)
    REFERENCES sections(class_number)
);