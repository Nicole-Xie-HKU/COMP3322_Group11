CREATE TABLE courses (
    course_code VARCHAR(20) PRIMARY KEY,
    course_title VARCHAR(255),
    offer_dept VARCHAR(255),
    acad_career VARCHAR(20)
);

CREATE TABLE sections (
    section_id INT AUTO_INCREMENT PRIMARY KEY,

    class_number INT NOT NULL,
    term VARCHAR(50) NOT NULL,

    course_code VARCHAR(20) NOT NULL,
    class_section VARCHAR(20),

    UNIQUE (class_number, term),

    FOREIGN KEY (course_code)
        REFERENCES courses(course_code)
);

CREATE TABLE meetings (
    meeting_id INT AUTO_INCREMENT PRIMARY KEY,

    class_number INT NOT NULL,
    term VARCHAR(50) NOT NULL,

    start_date DATE,
    end_date DATE,

    day VARCHAR(10),

    start_time TIME,
    end_time TIME,

    venue VARCHAR(100)
);

CREATE TABLE instructors (
    instructor_id INT AUTO_INCREMENT PRIMARY KEY,

    class_number INT NOT NULL,
    term VARCHAR(50) NOT NULL,

    instructor_name VARCHAR(255)
);